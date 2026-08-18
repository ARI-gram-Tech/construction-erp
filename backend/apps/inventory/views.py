# apps/inventory/views.py
from decimal import Decimal, InvalidOperation

from django.db import transaction
from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.response import Response

from django.utils import timezone

from .models import (
    Warehouse, StockItem, StockLevel, StockMovement,
    PendingStockItemRequest, StockRestockRequest,
)
from .permissions import (
    WarehousePermission,
    StockItemPermission,
    StockLevelPermission,
    StockMovementPermission,
    PendingStockItemRequestPermission,
    StockRestockRequestPermission,
    can_manage_warehouse_logistics,
    is_project_member,
    visible_warehouses_queryset,
    STOREKEEPER_ROLES,
)
from .serializers import (
    WarehouseSerializer,
    StockItemSerializer,
    StockLevelSerializer,
    StockMovementSerializer,
    StockMovementUpdateSerializer,
    PendingStockItemRequestSerializer,
    ApproveRequestItemSerializer,
    RejectRequestSerializer,
    StockRestockRequestSerializer,
    ApproveRestockRequestSerializer,
    ReceiveRestockRequestSerializer,
)


class CompanyScopedMixin:
    def get_company(self):
        return self.request.user.company


class WarehouseViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    """
    Warehouses are auto-created (Main on Company creation, one per
    Project via signals) — this viewset lets you edit name/address/
    active status, not hand-create new locations, in this phase.
    """
    serializer_class = WarehouseSerializer
    permission_classes = [WarehousePermission]

    def get_queryset(self):
        company = self.get_company()
        if company is None:
            return Warehouse.objects.none()
        base = Warehouse.objects.filter(company=company)
        return visible_warehouses_queryset(base, self.request.user)


class StockItemViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    serializer_class = StockItemSerializer
    permission_classes = [StockItemPermission]

    def get_queryset(self):
        company = self.get_company()
        if company is None:
            return StockItem.objects.none()

        qs = (
            StockItem.objects.filter(company=company)
            .prefetch_related('stock_levels__warehouse')
        )

        # Storekeeper is scoped to their own project's store everywhere
        # else in this app (warehouses, levels, movements) — but the
        # catalog itself was left wide open, so a storekeeper still saw
        # every item in the company, including ones only ever stocked
        # at Main Warehouse or another project's store. Narrow the
        # catalog itself for storekeeper: only items that actually have
        # a StockLevel row in a warehouse they can see. Every other
        # role (QS, site roles, managers) keeps full catalog visibility —
        # this restriction is specific to storekeeper's project-only scope.
        if self.request.user.role in STOREKEEPER_ROLES:
            visible_warehouse_ids = visible_warehouses_queryset(
                Warehouse.objects.filter(company=company), self.request.user
            ).values_list('id', flat=True)
            qs = qs.filter(
                stock_levels__warehouse_id__in=visible_warehouse_ids
            ).distinct()

        return qs

    def get_serializer_context(self):
        # StockItemSerializer.get_total_quantity() needs to know which
        # warehouses THIS user can actually see — otherwise it sums
        # stock_levels across every warehouse in the company regardless
        # of who's asking, which is exactly how a storekeeper scoped to
        # one project's store was still seeing company-wide totals.
        context = super().get_serializer_context()
        context['visible_warehouse_ids'] = set(
            visible_warehouses_queryset(
                Warehouse.objects.filter(company=self.get_company()),
                self.request.user,
            ).values_list('id', flat=True)
        )
        return context

    def perform_create(self, serializer):
        serializer.save(company=self.get_company())


class PendingStockItemRequestViewSet(
    CompanyScopedMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    The review queue for materials someone logged that don't exist in
    the catalog yet. List/retrieve show every request regardless of
    status (frontend filters by status=pending for the actual inbox
    view); approve/reject are the only ways a request's status changes.
    """
    serializer_class = PendingStockItemRequestSerializer
    permission_classes = [PendingStockItemRequestPermission]

    def get_queryset(self):
        company = self.get_company()
        if company is None:
            return PendingStockItemRequest.objects.none()

        qs = PendingStockItemRequest.objects.filter(company=company).select_related(
            'project', 'requested_by', 'reviewed_by', 'resolved_item'
        )

        # Main Store Manager / company-wide managers review requests
        # from every project — that's the whole point of the review
        # queue. Everyone else (including the person who submitted a
        # request) only sees requests tied to a project they're
        # actually a member of, or requests they personally raised —
        # same NDA boundary as everywhere else, not a company-wide feed
        # of what every other project needs.
        if not can_manage_warehouse_logistics(self.request.user):
            from django.db.models import Q
            from apps.team.models import ProjectMember

            member_project_ids = ProjectMember.objects.filter(
                user=self.request.user
            ).values_list('project_id', flat=True)
            qs = qs.filter(
                Q(project_id__in=member_project_ids) | Q(requested_by=self.request.user)
            )

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    @action(detail=False, methods=['post'])
    def approve(self, request):
        """
        Body: { "items": [{id, name, unit, category, reorder_level?}, ...] }
        Creates a real StockItem for each request (using the reviewer's
        possibly-corrected name/unit/category), marks the request
        approved, and links every ActivityMaterial that was waiting on
        it to the newly created item — the site engineer's original
        entry resolves automatically, no re-entry needed.
        """
        payload = request.data.get('items', [])
        if not payload:
            raise ValidationError('items is required — nothing to approve.')

        serializer = ApproveRequestItemSerializer(data=payload, many=True)
        serializer.is_valid(raise_exception=True)

        company = self.get_company()
        resolved = []

        with transaction.atomic():
            for row in serializer.validated_data:
                try:
                    req = PendingStockItemRequest.objects.select_for_update().get(
                        pk=row['id'], company=company, status='pending',
                    )
                except PendingStockItemRequest.DoesNotExist:
                    continue  # already resolved or not found — skip, don't fail the whole batch

                item = StockItem.objects.create(
                    company=company,
                    name=row['name'],
                    unit=row['unit'],
                    category=row['category'],
                    reorder_level=row.get('reorder_level', 0),
                )

                req.status = 'approved'
                req.resolved_item = item
                req.reviewed_by = request.user
                req.reviewed_at = timezone.now()
                req.save(update_fields=['status', 'resolved_item', 'reviewed_by', 'reviewed_at'])

                from apps.planning.models import ActivityMaterial
                ActivityMaterial.objects.filter(pending_request=req).update(item=item)

                from apps.notifications.utils import notify
                notify(
                    req.requested_by, title='Your material request was added to the catalog',
                    message=f'"{item.name}" is now available — your request on '
                            f'{req.project.name if req.project else "your activity"} can move forward.',
                    level='info',
                    link=f'/projects/{req.project_id}/planning' if req.project_id else '',
                )

                resolved.append(req)

        return Response(PendingStockItemRequestSerializer(resolved, many=True).data)

    @action(detail=False, methods=['post'])
    def reject(self, request):
        """
        Body: { "ids": [...], "reason": "optional" }
        Marks requests rejected — does NOT delete the linked
        ActivityMaterial rows, so the site engineer's request is still
        visible on the activity, just flagged as declined rather than
        silently vanishing.
        """
        serializer = RejectRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        company = self.get_company()
        updated = PendingStockItemRequest.objects.filter(
            id__in=serializer.validated_data['ids'], company=company, status='pending',
        )
        requests_to_notify = list(updated)
        updated.update(
            status='rejected',
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
            review_notes=serializer.validated_data.get('reason', ''),
        )

        from apps.notifications.utils import notify
        reason = serializer.validated_data.get('reason', '')
        for req in requests_to_notify:
            notify(
                req.requested_by, title='Your catalog request was declined',
                message=reason or f'"{req.requested_name}" was not added to the catalog.',
                level='warning',
                link=f'/projects/{req.project_id}/planning' if req.project_id else '',
            )

        return Response({'detail': f'{len(requests_to_notify)} request(s) rejected.'})


class StockLevelViewSet(CompanyScopedMixin, viewsets.ReadOnlyModelViewSet):
    """
    Read-only — quantity only changes via StockMovement actions.
    Filter with ?warehouse=<id> and/or ?item=<id>.
    """
    serializer_class = StockLevelSerializer
    permission_classes = [StockLevelPermission]

    def get_queryset(self):
        company = self.get_company()
        if company is None:
            return StockLevel.objects.none()
        visible_warehouses = visible_warehouses_queryset(
            Warehouse.objects.filter(company=company), self.request.user
        )
        qs = StockLevel.objects.filter(
            warehouse__in=visible_warehouses
        ).select_related('item', 'warehouse')
        warehouse_id = self.request.query_params.get('warehouse')
        item_id = self.request.query_params.get('item')
        if warehouse_id:
            qs = qs.filter(warehouse_id=warehouse_id)
        if item_id:
            qs = qs.filter(item_id=item_id)
        return qs


def execute_transfer(company, item, from_warehouse, to_warehouse, quantity, reference, performed_by, notes=''):
    """
    Shared by StockMovementViewSet.transfer() (an admin/logistics user
    moving stock directly) and StockRestockRequestViewSet.approve() (a
    restock request being fulfilled) — same stock-moving logic either
    way, kept in one place so the two call sites can't drift apart.
    """
    if to_warehouse.id == from_warehouse.id:
        raise ValidationError('Source and destination warehouse must differ.')

    with transaction.atomic():
        from_level, _ = StockLevel.objects.get_or_create(
            warehouse=from_warehouse, item=item, defaults={'quantity': Decimal('0')}
        )
        if from_level.quantity < quantity:
            raise ValidationError(
                f'Not enough stock at {from_warehouse.name}: '
                f'{from_level.quantity} available.'
            )
        from_level.quantity -= quantity
        from_level.save()

        to_level, _ = StockLevel.objects.get_or_create(
            warehouse=to_warehouse, item=item, defaults={'quantity': Decimal('0')}
        )
        to_level.quantity += quantity
        to_level.save()

        out_movement = StockMovement.objects.create(
            company=company, movement_type='transfer_out',
            item=item, warehouse=from_warehouse, quantity=quantity,
            related_warehouse=to_warehouse, reference=reference,
            performed_by=performed_by, notes=notes,
        )
        in_movement = StockMovement.objects.create(
            company=company, movement_type='transfer_in',
            item=item, warehouse=to_warehouse, quantity=quantity,
            related_warehouse=from_warehouse, reference=reference,
            performed_by=performed_by, notes=notes,
        )
        out_movement.paired_movement = in_movement
        out_movement.save(update_fields=['paired_movement'])

    return out_movement


class StockMovementViewSet(
    CompanyScopedMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    List/retrieve the audit trail freely. Update is intentionally
    narrow (see StockMovementUpdateSerializer — reference/notes only).
    No create/delete here: movements are only ever created through the
    receive/issue/transfer/adjust/reverse actions below, so StockLevel
    can never drift from what the movement log says happened.
    """
    permission_classes = [StockMovementPermission]

    def get_serializer_class(self):
        if self.action in ('update', 'partial_update'):
            return StockMovementUpdateSerializer
        return StockMovementSerializer

    def get_queryset(self):
        company = self.get_company()
        if company is None:
            return StockMovement.objects.none()
        visible_warehouses = visible_warehouses_queryset(
            Warehouse.objects.filter(company=company), self.request.user
        )
        qs = StockMovement.objects.filter(
            company=company, warehouse__in=visible_warehouses
        ).select_related('item', 'warehouse', 'related_warehouse', 'performed_by')
        warehouse_id = self.request.query_params.get('warehouse')
        item_id = self.request.query_params.get('item')
        if warehouse_id:
            qs = qs.filter(warehouse_id=warehouse_id)
        if item_id:
            qs = qs.filter(item_id=item_id)
        return qs

    # --- Actions: the only way stock quantities actually change ---

    @action(detail=False, methods=['post'])
    def receive(self, request):
        """Stock coming in — e.g. a supplier delivery landing at a warehouse."""
        item, warehouse, quantity, reference = self._parse_common(request)
        with transaction.atomic():
            level = self._get_or_create_level(warehouse, item)
            level.quantity += quantity
            level.save()
            movement = StockMovement.objects.create(
                company=self.get_company(), movement_type='receipt',
                item=item, warehouse=warehouse, quantity=quantity,
                reference=reference,
                performed_by=request.user, notes=request.data.get('notes', ''),
            )
        return Response(StockMovementSerializer(movement).data)


    @action(detail=False, methods=['post'])
    def issue(self, request):
        """
        Stock going out — e.g. consumed on site.
 
        New optional fields vs. the original version:
          budget_line  — which BudgetLine this issue's cost applies to.
                         Must belong to the same project as the warehouse
                         (if the warehouse is a project store). Omit to
                         skip budget integration for this movement.
          unit_cost    — cost per unit for this specific movement. Falls
                         back to item.standard_cost if omitted.
        """
        item, warehouse, quantity, reference = self._parse_common(request)
        budget_line = self._get_budget_line(request, warehouse)
        unit_cost = self._parse_unit_cost(request)
 
        with transaction.atomic():
            level = self._get_or_create_level(warehouse, item)
            if level.quantity < quantity:
                raise ValidationError(
                    f'Not enough stock: {level.quantity} available, {quantity} requested.'
                )
            level.quantity -= quantity
            level.save()
            movement = StockMovement.objects.create(
                company=self.get_company(), movement_type='issue',
                item=item, warehouse=warehouse, quantity=quantity,
                reference=reference, unit_cost=unit_cost, budget_line=budget_line,
                performed_by=request.user, notes=request.data.get('notes', ''),
            )
            self._record_cost_transaction(movement, item, quantity, unit_cost, budget_line, request.user)
        return Response(StockMovementSerializer(movement).data)

    def _record_cost_transaction(self, movement, item, quantity, unit_cost, budget_line, user):
        """
        Writes the 'actual' cost row a QS's Budget vs Actual numbers
        depend on. Only fires when the movement was actually charged
        against a budget line — an issue with no budget_line given
        (e.g. site consumables not tracked against a specific line yet)
        stays silent here, same as before.

        effective_cost falls back to item.standard_cost if this
        movement didn't specify its own unit_cost — matches the same
        fallback StockMovement.unit_cost's docstring already promises,
        just actually applied now instead of only documented.
        """
        if budget_line is None:
            return

        from apps.budget.models import CostTransaction

        effective_cost = unit_cost if unit_cost is not None else item.standard_cost
        if effective_cost is None:
            # No movement-level cost AND no catalog standard_cost to fall
            # back on — nothing sensible to charge the budget, so skip
            # rather than writing a bogus KES 0 actual against the line.
            return

        CostTransaction.objects.create(
            budget_line=budget_line,
            transaction_type='actual',
            source_type='inventory',
            source_reference=movement.reference or f'Stock issue #{movement.id}',
            amount=effective_cost * quantity,
            description=f'{quantity} {item.unit} of {item.name} issued to {movement.warehouse.name}',
            created_by=user,
        )

    def _reverse_cost_transaction(self, movement, user):
        """
        Undoing an issue should undo its budget impact too — a negative
        'actual' CostTransaction, same ledger-never-edited approach the
        rest of this app already uses (see StockMovement.reverses).
        """
        if movement.budget_line_id is None:
            return

        from apps.budget.models import CostTransaction

        effective_cost = movement.unit_cost if movement.unit_cost is not None else movement.item.standard_cost
        if effective_cost is None:
            return

        CostTransaction.objects.create(
            budget_line_id=movement.budget_line_id,
            transaction_type='actual',
            source_type='inventory',
            source_reference=f'Reversal of stock issue #{movement.id}',
            amount=-(effective_cost * movement.quantity),
            description=f'Reversed: {movement.quantity} {movement.item.unit} of {movement.item.name}',
            created_by=user,
        )

    # --- new helpers, add alongside the existing _get_item/_get_warehouse/_parse_common ---
 
    def _get_budget_line(self, request, warehouse):
        budget_line_id = request.data.get('budget_line')
        if not budget_line_id:
            return None
        # Local import to avoid a hard top-of-file dependency from
        # apps.inventory on apps.budget — keeps inventory usable standalone
        # even in a deployment that doesn't include the budget app.
        from apps.budget.models import BudgetLine
        try:
            line = BudgetLine.objects.select_related('budget').get(
                pk=budget_line_id, budget__project__company=self.get_company(),
            )
        except BudgetLine.DoesNotExist:
            raise ValidationError('Invalid budget_line.')
        if warehouse.project_id and line.budget.project_id != warehouse.project_id:
            raise ValidationError(
                'This budget line belongs to a different project than the warehouse.'
            )
        return line
 
    def _parse_unit_cost(self, request):
        unit_cost = request.data.get('unit_cost')
        if unit_cost is None:
            return None
        try:
            return Decimal(str(unit_cost))
        except InvalidOperation:
            raise ValidationError('unit_cost must be a number.')
 
    @action(detail=False, methods=['post'])
    def transfer(self, request):
        """
        Move stock between two warehouses — e.g. Main Warehouse to a
        Project Store. Creates a linked pair of movements (transfer_out
        / transfer_in) so both sides show up in each warehouse's history.
        """
        item, from_warehouse, quantity, reference = self._parse_common(
            request, warehouse_field='from_warehouse'
        )
        to_warehouse_id = request.data.get('to_warehouse')
        if not to_warehouse_id:
            raise ValidationError('to_warehouse is required.')
        to_warehouse = self._get_warehouse(to_warehouse_id)

        out_movement = execute_transfer(
            company=self.get_company(),
            item=item, from_warehouse=from_warehouse, to_warehouse=to_warehouse,
            quantity=quantity, reference=reference,
            performed_by=request.user, notes=request.data.get('notes', ''),
        )
        return Response(StockMovementSerializer(out_movement).data)

    @action(detail=True, methods=['post'])
    def reverse(self, request, pk=None):
        """
        Undo a movement's effect on stock, recorded as new movement(s)
        pointing back at the original via `reverses` — never edits or
        deletes the original, so the audit trail stays intact.
        """
        movement = self.get_object()

        if movement.reverses_id:
            raise ValidationError(
                'A reversal cannot itself be reversed — create a new movement instead.'
            )

        user_note = (request.data.get('reference') or '').strip()
        reference = f'Reversal of movement #{movement.id}'
        if user_note:
            reference = f'{reference} — {user_note}'
        notes = request.data.get('notes', '')

        with transaction.atomic():
            if movement.movement_type in ('transfer_out', 'transfer_in'):
                if movement.movement_type == 'transfer_out':
                    out_movement, in_movement = movement, movement.paired_movement
                else:
                    in_movement = movement
                    out_movement = StockMovement.objects.filter(
                        paired_movement=in_movement
                    ).first()

                if not out_movement or not in_movement:
                    raise ValidationError(
                        'Could not find the paired transfer movement — cannot reverse safely.'
                    )
                if StockMovement.objects.filter(
                    reverses__in=[out_movement, in_movement]
                ).exists():
                    raise ValidationError('This transfer has already been reversed.')

                dest_level = self._get_or_create_level(
                    in_movement.warehouse, in_movement.item
                )
                if dest_level.quantity < in_movement.quantity:
                    raise ValidationError(
                        f'Cannot reverse: only {dest_level.quantity} left at '
                        f'{in_movement.warehouse.name}, needs {in_movement.quantity}.'
                    )
                dest_level.quantity -= in_movement.quantity
                dest_level.save()

                source_level = self._get_or_create_level(
                    out_movement.warehouse, out_movement.item
                )
                source_level.quantity += out_movement.quantity
                source_level.save()

                rev_out = StockMovement.objects.create(
                    company=self.get_company(), movement_type='transfer_out',
                    item=in_movement.item, warehouse=in_movement.warehouse,
                    quantity=in_movement.quantity, related_warehouse=out_movement.warehouse,
                    reference=reference, performed_by=request.user, notes=notes,
                    reverses=movement,
                )
                rev_in = StockMovement.objects.create(
                    company=self.get_company(), movement_type='transfer_in',
                    item=out_movement.item, warehouse=out_movement.warehouse,
                    quantity=out_movement.quantity, related_warehouse=in_movement.warehouse,
                    reference=reference, performed_by=request.user, notes=notes,
                    reverses=movement,
                )
                rev_out.paired_movement = rev_in
                rev_out.save(update_fields=['paired_movement'])
                reversal = rev_out

            else:
                if StockMovement.objects.filter(reverses=movement).exists():
                    raise ValidationError('This movement has already been reversed.')

                level = self._get_or_create_level(movement.warehouse, movement.item)

                if movement.movement_type == 'receipt':
                    if level.quantity < movement.quantity:
                        raise ValidationError(
                            f'Cannot reverse: only {level.quantity} left at '
                            f'{movement.warehouse.name}, needs {movement.quantity}.'
                        )
                    level.quantity -= movement.quantity
                    delta = -movement.quantity
                elif movement.movement_type == 'issue':
                    level.quantity += movement.quantity
                    delta = movement.quantity
                    self._reverse_cost_transaction(movement, request.user)
                elif movement.movement_type == 'adjustment':
                    new_qty = level.quantity - movement.quantity
                    if new_qty < 0:
                        raise ValidationError(
                            'Cannot reverse: would result in negative stock.'
                        )
                    level.quantity = new_qty
                    delta = -movement.quantity
                else:
                    raise ValidationError('This movement type cannot be reversed.')

                level.save()
                reversal = StockMovement.objects.create(
                    company=self.get_company(), movement_type='adjustment',
                    item=movement.item, warehouse=movement.warehouse, quantity=delta,
                    reference=reference, performed_by=request.user, notes=notes,
                    reverses=movement,
                )

        return Response(StockMovementSerializer(reversal).data)

    @action(detail=False, methods=['post'])
    def adjust(self, request):
        """
        Correct a stock level directly — physical count mismatch, damage,
        loss, etc. Records the delta as a movement rather than silently
        overwriting the number, so there's still an audit trail of why
        the quantity changed.
        """
        item = self._get_item(request.data.get('item'))
        warehouse = self._get_warehouse(request.data.get('warehouse'))
        reference = (request.data.get('reference') or '').strip()
        if not reference:
            raise ValidationError('reference is required for accountability.')
        new_quantity = request.data.get('new_quantity')
        if new_quantity is None:
            raise ValidationError('new_quantity is required.')
        try:
            new_quantity = Decimal(str(new_quantity))
        except InvalidOperation:
            raise ValidationError('new_quantity must be a number.')

        with transaction.atomic():
            level = self._get_or_create_level(warehouse, item)
            delta = new_quantity - level.quantity
            level.quantity = new_quantity
            level.save()
            movement = StockMovement.objects.create(
                company=self.get_company(), movement_type='adjustment',
                item=item, warehouse=warehouse, quantity=delta,
                reference=reference,
                performed_by=request.user, notes=request.data.get('notes', ''),
            )
        return Response(StockMovementSerializer(movement).data)

    # --- helpers ---

    def _get_or_create_level(self, warehouse, item):
        level, _ = StockLevel.objects.get_or_create(
            warehouse=warehouse, item=item, defaults={'quantity': Decimal('0')}
        )
        return level

    def _get_item(self, item_id):
        if item_id is None:
            raise ValidationError('item is required.')
        try:
            return StockItem.objects.get(pk=item_id, company=self.get_company())
        except StockItem.DoesNotExist:
            raise ValidationError('Invalid item.')

    def _get_warehouse(self, warehouse_id):
        if warehouse_id is None:
            raise ValidationError('warehouse is required.')
        try:
            return Warehouse.objects.get(pk=warehouse_id, company=self.get_company())
        except Warehouse.DoesNotExist:
            raise ValidationError('Invalid warehouse.')

    def _parse_common(self, request, warehouse_field='warehouse'):
        item = self._get_item(request.data.get('item'))
        warehouse = self._get_warehouse(request.data.get(warehouse_field))
        reference = (request.data.get('reference') or '').strip()
        if not reference:
            raise ValidationError('reference is required for accountability.')
        quantity = request.data.get('quantity')
        if quantity is None:
            raise ValidationError('quantity is required.')
        try:
            quantity = Decimal(str(quantity))
        except InvalidOperation:
            raise ValidationError('quantity must be a number.')
        if quantity <= 0:
            raise ValidationError('quantity must be greater than zero.')
        return item, warehouse, quantity, reference
    

class StockRestockRequestViewSet(
    CompanyScopedMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    A storekeeper asking for more of something that already exists in
    the catalog — "send me more cement" — as opposed to
    PendingStockItemRequestViewSet, which is for items that don't exist
    in the catalog at all. Approving one runs the same transfer logic
    as StockMovementViewSet.transfer(), just triggered from a request
    instead of a direct action.
    """
    serializer_class = StockRestockRequestSerializer
    permission_classes = [StockRestockRequestPermission]

    def get_queryset(self):
        company = self.get_company()
        if company is None:
            return StockRestockRequest.objects.none()

        qs = StockRestockRequest.objects.filter(company=company).select_related(
            'project', 'item', 'source_warehouse', 'requested_by', 'reviewed_by',
            'resulting_movement',
        )

        # Same review-inbox pattern as PendingStockItemRequestViewSet:
        # logistics-tier sees every request company-wide (that's the
        # whole point of the review queue), everyone else only sees
        # requests from a project they're on or ones they personally
        # raised.
        if not can_manage_warehouse_logistics(self.request.user):
            from django.db.models import Q
            from apps.team.models import ProjectMember

            member_project_ids = ProjectMember.objects.filter(
                user=self.request.user
            ).values_list('project_id', flat=True)
            qs = qs.filter(
                Q(project_id__in=member_project_ids) | Q(requested_by=self.request.user)
            )

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    def perform_create(self, serializer):
        # project and requested_by are never taken from the client (see
        # the serializer's read_only_fields) — a storekeeper can only
        # ever request restock for a project's store they're actually
        # assigned to, resolved server-side, same as everywhere else
        # in this app that enforces the NDA boundary between projects.
        project_id = self.request.data.get('project')
        if not project_id:
            raise ValidationError('project is required.')

        from apps.projects.models import Project
        try:
            project = Project.objects.get(pk=project_id, company=self.get_company())
        except Project.DoesNotExist:
            raise ValidationError('Invalid project.')

        if not (
            is_project_member(self.request.user, project)
            or can_manage_warehouse_logistics(self.request.user)
        ):
            raise PermissionDenied('You are not a member of this project.')

        source_warehouse = None
        source_warehouse_id = self.request.data.get('source_warehouse')
        if source_warehouse_id:
            try:
                source_warehouse = Warehouse.objects.get(
                    pk=source_warehouse_id, company=self.get_company()
                )
            except Warehouse.DoesNotExist:
                raise ValidationError('Invalid source_warehouse.')

        serializer.save(
            company=self.get_company(),
            project=project,
            source_warehouse=source_warehouse,
            requested_by=self.request.user,
        )

    @action(detail=False, methods=['post'])
    def approve(self, request):
        """
        Body: { "id": <request id>, "source_warehouse"?: <id>, "reference"?: str }
        DISPATCH — creates the transfer_out movement for WHATEVER quantity
        is actually available (may be less than quantity_requested),
        decrements source_warehouse, and sets status accordingly:

          - Full stock available  -> status='in_transit', fulfilled_quantity
            = quantity_requested.
          - Partial stock available -> status='partially_dispatched',
            fulfilled_quantity = what was actually sent. The shortfall
            (quantity_requested - fulfilled_quantity) sits visible on the
            request until Main Store Manager either escalates it to
            Procurement (escalate_to_procurement()) or the request is
            otherwise closed out.
          - Zero stock available -> raises ValidationError; there's
            nothing to dispatch, so this isn't a valid partial case —
            Main Store Manager should escalate the full amount instead
            of calling approve() at all.

        Does NOT touch the destination store; that happens in receive()
        below, once the storekeeper confirms what actually arrived.
        """
        request_id = request.data.get('id')
        if not request_id:
            raise ValidationError('id is required.')

        approve_serializer = ApproveRestockRequestSerializer(data=request.data)
        approve_serializer.is_valid(raise_exception=True)

        company = self.get_company()

        with transaction.atomic():
            try:
                restock_req = StockRestockRequest.objects.select_for_update().get(
                    pk=request_id, company=company, status='pending',
                )
            except StockRestockRequest.DoesNotExist:
                raise ValidationError('Request not found or already resolved.')

            source_warehouse = restock_req.source_warehouse
            override_id = approve_serializer.validated_data.get('source_warehouse')
            if override_id:
                try:
                    source_warehouse = Warehouse.objects.get(pk=override_id, company=company)
                except Warehouse.DoesNotExist:
                    raise ValidationError('Invalid source_warehouse.')
            if source_warehouse is None:
                source_warehouse = Warehouse.objects.filter(
                    company=company, location_type='main'
                ).first()
            if source_warehouse is None:
                raise ValidationError('No source warehouse available — set one explicitly.')

            reference = (
                approve_serializer.validated_data.get('reference', '')
                or f'Restock request #{restock_req.id} (dispatch)'
            )

            level, _ = StockLevel.objects.get_or_create(
                warehouse=source_warehouse, item=restock_req.item, defaults={'quantity': Decimal('0')}
            )
            if level.quantity <= 0:
                raise ValidationError(
                    f'No stock available at {source_warehouse.name} to dispatch. '
                    'Escalate this request to Procurement instead.'
                )

            dispatch_quantity = min(level.quantity, restock_req.quantity_requested)
            is_partial = dispatch_quantity < restock_req.quantity_requested

            level.quantity -= dispatch_quantity
            level.save()

            movement = StockMovement.objects.create(
                company=company, movement_type='transfer_out',
                item=restock_req.item, warehouse=source_warehouse,
                quantity=dispatch_quantity,
                related_warehouse=None,  # set once receipt confirms the actual destination side
                reference=reference, performed_by=request.user, notes=restock_req.notes,
            )

            restock_req.status = 'partially_dispatched' if is_partial else 'in_transit'
            restock_req.fulfilled_quantity = dispatch_quantity
            restock_req.source_warehouse = source_warehouse
            restock_req.resulting_movement = movement
            restock_req.dispatched_by = request.user
            restock_req.dispatched_at = timezone.now()
            restock_req.dispatch_notes = reference
            restock_req.save(update_fields=[
                'status', 'fulfilled_quantity', 'source_warehouse', 'resulting_movement',
                'dispatched_by', 'dispatched_at', 'dispatch_notes',
            ])

            from apps.notifications.utils import notify
            if is_partial:
                shortfall = restock_req.quantity_requested - dispatch_quantity
                notify(
                    restock_req.requested_by, title='Your restock request is partially on its way',
                    message=f'{dispatch_quantity} {restock_req.item.unit} of {restock_req.item.name} '
                            f'dispatched to {restock_req.project.name}. '
                            f'{shortfall} {restock_req.item.unit} still short — Procurement may be asked to source it.',
                    level='warning',
                    link=f'/projects/{restock_req.project_id}/inventory',
                )
            else:
                notify(
                    restock_req.requested_by, title='Your restock request is on its way',
                    message=f'{dispatch_quantity} {restock_req.item.unit} of '
                            f'{restock_req.item.name} has been dispatched to {restock_req.project.name}.',
                    level='info',
                    link=f'/projects/{restock_req.project_id}/inventory',
                )

        return Response(StockRestockRequestSerializer(restock_req).data)

    @action(detail=False, methods=['post'], url_path='escalate-to-procurement')
    def escalate_to_procurement(self, request):
        """
        Body: { "id": <request id>, "quantity"?: <decimal>, "title"?: str, "reason"?: str }
        Main Store Manager (or company-wide manager) only — pushes this
        request's shortfall straight into a new draft PurchaseRequest,
        carrying the item and quantity forward without retyping. Works
        whether the request is still 'pending' (nothing dispatched yet,
        full quantity_requested is the shortfall) or 'partially_dispatched'
        (only the undelivered remainder is the shortfall).

        `quantity` lets the Main Store Manager override the amount sent
        to Procurement — e.g. site's need has since dropped, or they
        want to round up to a standard order size. Defaults to the
        actual outstanding shortfall if omitted.

        Only one escalation per restock request — generated_purchase_request
        being already set means this has already been done.
        """
        from apps.procurement.models import PurchaseRequest, PurchaseRequestItem

        request_id = request.data.get('id')
        if not request_id:
            raise ValidationError('id is required.')

        company = self.get_company()

        with transaction.atomic():
            try:
                restock_req = StockRestockRequest.objects.select_for_update().get(
                    pk=request_id, company=company,
                    status__in=['pending', 'partially_dispatched'],
                )
            except StockRestockRequest.DoesNotExist:
                raise ValidationError(
                    'Request not found, or not in a state that can be escalated '
                    '(must be pending or partially dispatched).'
                )

            if restock_req.generated_purchase_request_id:
                raise ValidationError(
                    f'This request was already escalated to '
                    f'{restock_req.generated_purchase_request.code}.'
                )

            already_fulfilled = restock_req.fulfilled_quantity or Decimal('0')
            outstanding = restock_req.quantity_requested - already_fulfilled

            override = request.data.get('quantity')
            if override is not None:
                try:
                    outstanding = Decimal(str(override))
                except InvalidOperation:
                    raise ValidationError('quantity must be a number.')

            if outstanding <= 0:
                raise ValidationError('Nothing outstanding to escalate on this request.')

            pr = PurchaseRequest.objects.create(
                project=restock_req.project,
                requested_by=request.user,
                title=request.data.get('title') or f'Restock shortfall — {restock_req.item.name}',
                reason=request.data.get('reason', '')
                    or f'Escalated from restock request #{restock_req.id} — '
                       f'{restock_req.project.name} store shortfall.',
                priority='normal',
                status='draft',
            )
            PurchaseRequestItem.objects.create(
                purchase_request=pr,
                description=restock_req.item.name,
                quantity=outstanding,
                unit=restock_req.item.unit,
                estimated_unit_cost=restock_req.item.standard_cost,
                notes=f'From restock request #{restock_req.id}',
            )

            restock_req.generated_purchase_request = pr
            restock_req.save(update_fields=['generated_purchase_request'])

        return Response(StockRestockRequestSerializer(restock_req).data, status=201)

    @action(detail=False, methods=['post'])
    def receive(self, request):
        """
        Body: { "id": <request id>, "reference"?: str }
        The storekeeper confirming stock physically arrived — creates the
        transfer_in movement, increments the project's store, status ->
        'received'. This is the piece that was previously bundled into
        approve() with no gap for "dispatched but not yet arrived."

        Also enforces that the confirming storekeeper is actually a
        member of the receiving project — StockRestockRequestPermission
        only checks role, not per-request project scoping, since this
        action is detail=False (id comes from the body, not the URL).
        """
        serializer = ReceiveRestockRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        company = self.get_company()
        request_id = serializer.validated_data['id']

        with transaction.atomic():
            try:
                restock_req = StockRestockRequest.objects.select_for_update().get(
                    pk=request_id, company=company, status='in_transit',
                )
            except StockRestockRequest.DoesNotExist:
                raise ValidationError('Request not found or not currently in transit.')

            if (
                request.user.role in STOREKEEPER_ROLES
                and not can_manage_warehouse_logistics(request.user)
                and not is_project_member(request.user, restock_req.project)
            ):
                raise PermissionDenied(
                    'You are not a member of this project — only its own storekeeper '
                    '(or logistics-tier) can confirm this delivery.'
                )

            destination = Warehouse.objects.filter(project=restock_req.project).first()
            if destination is None:
                raise ValidationError(f'{restock_req.project.name} has no store to receive stock.')

            reference = (
                serializer.validated_data.get('reference', '')
                or f'Restock request #{restock_req.id} (receipt)'
            )

            level, _ = StockLevel.objects.get_or_create(
                warehouse=destination, item=restock_req.item, defaults={'quantity': Decimal('0')}
            )
            level.quantity += restock_req.quantity_requested
            level.save()

            movement = StockMovement.objects.create(
                company=company, movement_type='transfer_in',
                item=restock_req.item, warehouse=destination,
                quantity=restock_req.quantity_requested,
                related_warehouse=restock_req.source_warehouse,
                reference=reference, performed_by=request.user, notes='',
            )
            if restock_req.resulting_movement:
                restock_req.resulting_movement.related_warehouse = destination
                restock_req.resulting_movement.paired_movement = movement
                restock_req.resulting_movement.save(update_fields=['related_warehouse', 'paired_movement'])

            restock_req.status = 'received'
            restock_req.receipt_movement = movement
            restock_req.received_by = request.user
            restock_req.received_at = timezone.now()
            restock_req.save(update_fields=['status', 'receipt_movement', 'received_by', 'received_at'])

        return Response(StockRestockRequestSerializer(restock_req).data)

    @action(detail=False, methods=['post'])
    def reject(self, request):
        """Body: { "ids": [...], "reason": "optional" } — same shape as the catalog-request reject."""
        serializer = RejectRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        company = self.get_company()
        updated = StockRestockRequest.objects.filter(
            id__in=serializer.validated_data['ids'], company=company, status='pending',
        )
        requests_to_notify = list(updated)
        updated.update(
            status='rejected',
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
            review_notes=serializer.validated_data.get('reason', ''),
        )

        from apps.notifications.utils import notify
        reason = serializer.validated_data.get('reason', '')
        for req in requests_to_notify:
            notify(
                req.requested_by, title='Your restock request was declined',
                message=reason or f'Request for {req.item.name} was not approved.',
                level='warning',
                link=f'/projects/{req.project_id}/inventory',
            )

        return Response({'detail': f'{len(requests_to_notify)} request(s) rejected.'})