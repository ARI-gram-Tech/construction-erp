# apps/procurement/views.py
"""
Same project-scoping pattern as apps.team / apps.planning: project_pk
comes from the URL, and get_project() double-checks it belongs to
request.user.company so tenant isolation holds even if someone guesses
a project ID.

Approval logic:
  Tier 1 — role='project_manager' AND a ProjectMember row for this
           specific project. Judges necessity.
  Tier 2 — role='procurement_manager', company-wide (not project-scoped).
           Judges spend authorization.
  company_admin may act at either tier as an override.
"""
import json as _json
from decimal import Decimal, InvalidOperation

from django.contrib.auth import get_user_model
from django.db import models, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.suppliers.models import Supplier
from apps.projects.models import Project
from apps.notifications.utils import notify
from .models import PurchaseRequest, LPO, LPOItem, SupplierItem
from .permissions import PurchaseRequestPermission, LPOPermission, can_sign_lpo, can_send_lpo
from .serializers import (
    PurchaseRequestSerializer,
    ApprovedQuantityItemSerializer,
    RecordDeliverySerializer,
    RecordReceiptSerializer,
    LPOSerializer,
)

User = get_user_model()


def _record_supplier_items(supplier, descriptions):
    """
    Upserts SupplierItem rows for `supplier` given a list of item
    description strings — called after every LPO's items are created,
    from both generate() and manual(), so supplier history builds
    itself automatically regardless of which path created the LPO.
    """
    now = timezone.now()
    for description in descriptions:
        description = (description or '').strip()
        if not description:
            continue
        key = description.lower()
        obj, created = SupplierItem.objects.get_or_create(
            supplier=supplier, description_key=key,
            defaults={'description': description, 'times_ordered': 1, 'last_ordered_at': now},
        )
        if not created:
            obj.times_ordered = models.F('times_ordered') + 1
            obj.last_ordered_at = now
            obj.save(update_fields=['times_ordered', 'last_ordered_at'])


def _notify_role(company, role, title, message, level, link):
    """
    Procurement's approval tiers are company-wide roles (any
    procurement_manager, any director), not a single assigned person —
    so a stage change notifies everyone holding that role in the
    company, not just one recipient.
    """
    for user in User.objects.filter(company=company, role=role):
        notify(user, title=title, message=message, level=level, link=link)


def is_tier1_approver(user, project):
    """
    Tier 1 judges necessity. The project's own project_manager FK is the
    source of truth here — simpler and more reliable than requiring a
    separate ProjectMember row to exist for the PM to act on their own
    project. company_admin can always override.
    """
    if user.role == 'company_admin':
        return True
    return project.project_manager_id == user.id


def is_tier2_approver(user):
    return user.role in ('procurement_manager', 'company_admin')


def is_tier3_approver(user):
    return user.role in ('director', 'company_admin')


def requires_tier3(pr):
    """
    Tier 3 (Director) only kicks in if the request's estimated total is
    at or above the company's configurable procurement approval threshold.
    """
    threshold = pr.project.company.procurement_approval_threshold
    return pr.estimated_total >= threshold


class PurchaseRequestViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseRequestSerializer
    permission_classes = [PurchaseRequestPermission]

    def get_project(self):
        return get_object_or_404(
            Project, pk=self.kwargs['project_pk'], company=self.request.user.company
        )

    def get_queryset(self):
        return (
            PurchaseRequest.objects
            .filter(project=self.get_project())
            .select_related('requested_by', 'tier1_approver', 'tier2_approver')
            .prefetch_related('items')
        )

    def perform_create(self, serializer):
        serializer.save(project=self.get_project(), requested_by=self.request.user)

    def perform_update(self, serializer):
        pr = self.get_object()
        if pr.status != 'draft':
            raise ValidationError('Only draft requests can be edited.')
        if pr.requested_by_id != self.request.user.id and self.request.user.role != 'company_admin':
            raise PermissionDenied("You can only edit your own requests.")
        serializer.save()

    # --- Actions ---

    @action(detail=True, methods=['post'])
    def submit(self, request, project_pk=None, pk=None):
        pr = self.get_object()
        if pr.requested_by_id != request.user.id and request.user.role != 'company_admin':
            raise PermissionDenied("You can only submit your own requests.")
        if pr.status != 'draft':
            raise ValidationError('Only draft requests can be submitted.')
        if not pr.items.exists():
            raise ValidationError('Add at least one line item before submitting.')
        pr.status = 'pending_tier1'
        pr.save(update_fields=['status'])

        link = f'/projects/{pr.project_id}/procurement/{pr.id}'
        if pr.project.project_manager_id:
            notify(
                pr.project.project_manager, title=f'{pr.code} needs your approval',
                message=f'{pr.title} — {pr.project.name}', level='info', link=link,
            )
        return Response(PurchaseRequestSerializer(pr).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, project_pk=None, pk=None):
        pr = self.get_object()
        if pr.requested_by_id != request.user.id and request.user.role != 'company_admin':
            raise PermissionDenied("You can only cancel your own requests.")
        if pr.status not in ('draft', 'pending_tier1', 'pending_tier2'):
            raise ValidationError(f'Cannot cancel a request that is already {pr.status}.')
        pr.status = 'cancelled'
        pr.save(update_fields=['status'])
        return Response(PurchaseRequestSerializer(pr).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, project_pk=None, pk=None):
        pr = self.get_object()
        comment = request.data.get('comment', '')
        now = timezone.now()

        if pr.status == 'pending_tier1':
            if not is_tier1_approver(request.user, pr.project):
                raise PermissionDenied(
                    "Only this project's Project Manager (or a Company Admin) can approve at this stage."
                )
            pr.tier1_approver = request.user
            pr.tier1_decision = 'approved'
            pr.tier1_comment = comment
            pr.tier1_decided_at = now
            pr.status = 'pending_tier2'
            pr.save()
        elif pr.status == 'pending_tier2':
            if not is_tier2_approver(request.user):
                raise PermissionDenied(
                    "Only a Procurement Manager (or a Company Admin) can approve at this stage."
                )

            self._apply_approved_quantities(pr, request.data.get('items'))

            pr.tier2_approver = request.user
            pr.tier2_decision = 'approved'
            pr.tier2_comment = comment
            pr.tier2_decided_at = now
            pr.status = 'pending_tier3' if requires_tier3(pr) else 'approved'
            pr.save()

            link = f'/projects/{pr.project_id}/procurement/{pr.id}'
            if pr.status == 'pending_tier3':
                _notify_role(
                    pr.project.company, 'director',
                    f'{pr.code} needs Director approval',
                    f'{pr.title} — KES {pr.estimated_total:,.0f} — {pr.project.name}',
                    'warning', link,
                )
            else:
                notify(
                    pr.requested_by, title=f'{pr.code} approved',
                    message=comment or f'{pr.title} is fully approved.', level='info', link=link,
                )
        elif pr.status == 'pending_tier3':
            if not is_tier3_approver(request.user):
                raise PermissionDenied(
                    "Only a Director (or a Company Admin) can approve at this stage."
                )

            self._apply_approved_quantities(pr, request.data.get('items'))

            pr.tier3_approver = request.user
            pr.tier3_decision = 'approved'
            pr.tier3_comment = comment
            pr.tier3_decided_at = now
            pr.status = 'approved'
            pr.save()

            link = f'/projects/{pr.project_id}/procurement/{pr.id}'
            notify(
                pr.requested_by, title=f'{pr.code} approved',
                message=comment or f'{pr.title} is fully approved.', level='info', link=link,
            )
        else:
            raise ValidationError(f'This request is not awaiting approval (status: {pr.status}).')

        return Response(PurchaseRequestSerializer(pr).data)

    def _apply_approved_quantities(self, pr, items_payload):
        """
        Shared by tier2/tier3 approve() — lets the approver set a real
        quantity per line ("only 60 of the 100"), not just a blanket
        approve/reject. Falls back to the full requested quantity for
        any line not explicitly listed, so an approver who doesn't
        touch this at all still gets a normal full approval.
        """
        if items_payload:
            serializer = ApprovedQuantityItemSerializer(data=items_payload, many=True)
            serializer.is_valid(raise_exception=True)
            by_id = {row['id']: row['approved_quantity'] for row in serializer.validated_data}
            for item in pr.items.all():
                if item.id in by_id:
                    item.approved_quantity = by_id[item.id]
                    item.save(update_fields=['approved_quantity'])
        # Anything left untouched defaults to the full requested amount.
        pr.items.filter(approved_quantity__isnull=True).update(
            approved_quantity=models.F('quantity')
        )

    @action(detail=True, methods=['post'])
    def escalate(self, request, project_pk=None, pk=None):
        """
        Bharti's own judgment call — not a system rule. She can push a
        request to the Director even when it's under the company's
        procurement_approval_threshold, same as she can approve
        something herself that's technically over it (company_admin
        override aside, the threshold otherwise auto-forces tier 3
        regardless of her preference on this path).
        """
        pr = self.get_object()
        if pr.status != 'pending_tier2':
            raise ValidationError('Only a request awaiting Procurement Manager review can be escalated.')
        if not is_tier2_approver(request.user):
            raise PermissionDenied(
                "Only a Procurement Manager (or a Company Admin) can escalate this request."
            )

        comment = request.data.get('comment', '')
        pr.tier2_approver = request.user
        pr.tier2_decision = 'escalated'
        pr.tier2_comment = comment
        pr.tier2_decided_at = timezone.now()
        pr.status = 'pending_tier3'
        pr.save()

        _notify_role(
            pr.project.company, 'director',
            f'{pr.code} escalated for your review',
            comment or f'{pr.title} — {pr.project.name}',
            'warning', f'/projects/{pr.project_id}/procurement/{pr.id}',
        )
        return Response(PurchaseRequestSerializer(pr).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, project_pk=None, pk=None):
        pr = self.get_object()
        comment = request.data.get('comment', '')
        now = timezone.now()
        pending_before = pr.status

        if pr.status == 'pending_tier1':
            if not is_tier1_approver(request.user, pr.project):
                raise PermissionDenied(
                    "Only this project's Project Manager (or a Company Admin) can reject at this stage."
                )
            pr.tier1_approver = request.user
            pr.tier1_decision = 'rejected'
            pr.tier1_comment = comment
            pr.tier1_decided_at = now
            pr.status = 'rejected'
            pr.save()
        elif pr.status == 'pending_tier2':
            if not is_tier2_approver(request.user):
                raise PermissionDenied(
                    "Only a Procurement Manager (or a Company Admin) can reject at this stage."
                )
            pr.tier2_approver = request.user
            pr.tier2_decision = 'rejected'
            pr.tier2_comment = comment
            pr.tier2_decided_at = now
            pr.status = 'rejected'
            pr.save()
        elif pr.status == 'pending_tier3':
            if not is_tier3_approver(request.user):
                raise PermissionDenied(
                    "Only a Director (or a Company Admin) can reject at this stage."
                )
            pr.tier3_approver = request.user
            pr.tier3_decision = 'rejected'
            pr.tier3_comment = comment
            pr.tier3_decided_at = now
            pr.status = 'rejected'
            pr.save()
        else:
            raise ValidationError(f'This request is not awaiting approval (status: {pr.status}).')

        notify(
            pr.requested_by, title=f'{pr.code} rejected',
            message=comment or f'{pr.title} was rejected at {pending_before.replace("pending_", "").replace("_", " ")}.',
            level='warning', link=f'/projects/{pr.project_id}/procurement/{pr.id}',
        )
        return Response(PurchaseRequestSerializer(pr).data)

    @action(detail=True, methods=['post'])
    def record_delivery(self, request, project_pk=None, pk=None):
        """
        Procurement logs what the supplier's delivery note says arrived
        — separate from what was requested/approved, and separate from
        what gets physically received later. Doesn't touch inventory at
        all; this is purely "here's what the paperwork says showed up."
        """
        pr = self.get_object()
        if pr.status != 'approved':
            raise ValidationError('Only an approved request can have deliveries recorded against it.')

        serializer = RecordDeliverySerializer(data=request.data.get('items', []), many=True)
        serializer.is_valid(raise_exception=True)

        now = timezone.now()
        items_by_id = {item.id: item for item in pr.items.all()}
        for row in serializer.validated_data:
            item = items_by_id.get(row['id'])
            if item is None:
                continue
            item.delivered_quantity = row['delivered_quantity']
            item.delivered_by = row.get('delivered_by', '')
            item.delivered_at = now
            item.save(update_fields=['delivered_quantity', 'delivered_by', 'delivered_at'])

        return Response(PurchaseRequestSerializer(pr).data)

    @action(detail=True, methods=['post'])
    def record_receipt(self, request, project_pk=None, pk=None):
        """
        Whoever physically received it confirms a quantity, into a real
        warehouse — this is the step that actually creates a
        StockMovement (receipt) and links it back via
        PurchaseRequestItem.stock_movement, so "was this ever really
        reflected in the system's inventory" has a real, checkable
        answer instead of just paperwork sitting disconnected from
        actual stock levels.

        A line must have been delivered first (delivered_quantity set
        via record_delivery) before it can be received — receiving is
        confirming what the delivery note already claimed, not a way to
        skip that step. And received_quantity must exactly match
        delivered_quantity: this isn't the place to record a shortfall
        or an overage against the delivery note — a mismatch there
        means the delivery note itself was wrong and should be
        corrected via record_delivery, not papered over at receipt.
        """
        from apps.inventory.models import Warehouse, StockItem, StockLevel, StockMovement

        pr = self.get_object()
        if pr.status != 'approved':
            raise ValidationError('Only an approved request can have receipts recorded against it.')

        serializer = RecordReceiptSerializer(data=request.data.get('items', []), many=True)
        serializer.is_valid(raise_exception=True)

        now = timezone.now()
        items_by_id = {item.id: item for item in pr.items.all()}
        results = []

        # wrapped so a bad line partway through a multi-item batch
        # (e.g. a quantity mismatch on line 3 of 5) rolls back any
        # stockmovements/stocklevel changes already made for lines 1-2
        # in this same request, instead of leaving a half-applied
        # receipt with some lines reflected in stock and others not.
        with transaction.atomic():
            for row in serializer.validated_data:
                item = items_by_id.get(row['id'])
                if item is None:
                    continue

                if item.delivered_quantity is None:
                    raise ValidationError(
                        f'"{item.description}" has not been marked delivered yet — '
                        'record the delivery before recording receipt.'
                    )
                if row['received_quantity'] != item.delivered_quantity:
                    raise ValidationError(
                        f'"{item.description}": received quantity ({row["received_quantity"]}) '
                        f'must exactly match the delivered quantity ({item.delivered_quantity}). '
                        'If the delivery note was wrong, correct it via record_delivery first.'
                    )

                try:
                    warehouse = Warehouse.objects.get(
                        pk=row['warehouse'], company=pr.project.company,
                    )
                except Warehouse.DoesNotExist:
                    raise ValidationError(f'Invalid warehouse for item {item.id}.')

                # Free-text PR line items don't carry a StockItem link today
                # — matched by description as a best-effort convenience so
                # receiving doesn't force re-picking every item from the
                # catalog. If nothing matches, the receipt is still recorded
                # on the PR item itself (received_quantity/by/at), it just
                # won't move a real StockLevel — surfaced via is_in_stock
                # staying false, which is itself useful signal.
                stock_item = StockItem.objects.filter(
                    company=pr.project.company, name__iexact=item.description,
                ).first()

                item.received_quantity = row['received_quantity']
                item.received_by = request.user
                item.received_at = now

                if stock_item is not None:
                    level, _ = StockLevel.objects.get_or_create(
                        warehouse=warehouse, item=stock_item, defaults={'quantity': 0},
                    )
                    level.quantity += row['received_quantity']
                    level.save()

                    movement = StockMovement.objects.create(
                        company=pr.project.company, movement_type='receipt',
                        item=stock_item, warehouse=warehouse, quantity=row['received_quantity'],
                        reference=pr.code, performed_by=request.user,
                        notes=f'Received against {pr.code} — {item.description}',
                    )
                    item.stock_movement = movement

                item.save(update_fields=['received_quantity', 'received_by', 'received_at', 'stock_movement'])
                results.append(item)

        notify(
            pr.requested_by, title=f'{pr.code} — items received',
            message=f'{len(results)} line(s) received against your request.',
            level='info', link=f'/projects/{pr.project_id}/procurement/{pr.id}',
        )

        return Response(PurchaseRequestSerializer(pr).data)

    @action(detail=False, methods=['get'], url_path='inbox')
    def inbox(self, request):
        """
        GET /api/procurement/inbox/
        Everything currently sitting at a stage this user can act on,
        across EVERY project — not nested under one project_pk, since
        procurement_manager/director approve company-wide, not per
        project. This is the queue Bharti actually works from, instead
        of checking each project one at a time.
        """
        company = request.user.company
        if company is None:
            return Response([])

        qs = PurchaseRequest.objects.filter(project__company=company).select_related(
            'project', 'requested_by',
        ).prefetch_related('items')

        role = request.user.role
        if role == 'company_admin':
            qs = qs.filter(status__in=['pending_tier1', 'pending_tier2', 'pending_tier3'])
        elif role == 'project_manager':
            qs = qs.filter(status='pending_tier1', project__project_manager_id=request.user.id)
        elif role == 'procurement_manager':
            qs = qs.filter(status='pending_tier2')
        elif role == 'director':
            qs = qs.filter(status='pending_tier3')
        else:
            qs = qs.none()

        return Response(PurchaseRequestSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'], url_path='all')
    def all_requests(self, request):
        """
        GET /api/procurement/all/
        Every PurchaseRequest this user can VIEW, across every project —
        not narrowed to a specific actionable stage like inbox() is.
        Same company-wide-vs-own-projects split as inbox(), just against
        can_view_requests's broader visibility rule instead of an
        action-specific status filter.

        Optional query params:
          status=<PRStatus>        filter to one status
          project=<id>             filter to one project
        """
        from .permissions import is_company_wide_procurement, is_company_wide_manager

        company = request.user.company
        if company is None:
            return Response([])

        qs = PurchaseRequest.objects.filter(project__company=company).select_related(
            'project', 'requested_by',
        ).prefetch_related('items')

        role = request.user.role
        if is_company_wide_manager(request.user) or is_company_wide_procurement(request.user):
            pass  # full company-wide visibility, no further narrowing
        elif role == 'project_manager':
            qs = qs.filter(project__project_manager_id=request.user.id)
        else:
            qs = qs.none()

        status_param = request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        project_param = request.query_params.get('project')
        if project_param:
            qs = qs.filter(project_id=project_param)

        return Response(PurchaseRequestSerializer(qs.order_by('-created_at'), many=True).data)


class LPOViewSet(viewsets.ModelViewSet):
    serializer_class = LPOSerializer
    permission_classes = [LPOPermission]
    http_method_names = ['get', 'post']  # no direct edits — actions only, snapshot data shouldn't drift

    def get_queryset(self):
        return LPO.objects.filter(
            purchase_request__project__company=self.request.user.company
        ).select_related('purchase_request', 'supplier').prefetch_related('items')

    @action(detail=False, methods=['post'], url_path='generate')
    def generate(self, request):
        """
        Body: { purchase_request: <id>, supplier: <id>, vat_applicable?: bool, vat_percent?: decimal }
        Only allowed once the PR is fully approved — an LPO represents a
        real commitment to buy, so it can't be generated from something
        still under review.
        """
        pr_id = request.data.get('purchase_request')
        pr = get_object_or_404(
            PurchaseRequest, pk=pr_id, project__company=request.user.company,
        )
        if pr.status != 'approved':
            raise ValidationError('Only a fully approved Purchase Request can generate an LPO.')
        if hasattr(pr, 'lpo'):
            raise ValidationError(f'An LPO ({pr.lpo.code}) already exists for this request.')

        supplier = get_object_or_404(
            Supplier, pk=request.data.get('supplier'), company=request.user.company,
        )

        company = pr.project.company
        vat_applicable = request.data.get('vat_applicable', True)
        vat_percent = request.data.get('vat_percent', 16)

        subtotal = sum((item.approved_quantity or item.quantity) * (item.estimated_unit_cost or 0) for item in pr.items.all())
        vat_amount = (subtotal * vat_percent / 100) if vat_applicable else 0
        total = subtotal + vat_amount

        lpo = LPO.objects.create(
            purchase_request=pr,
            project=pr.project,
            supplier=supplier,
            origin='generated',
            company_name=company.name,
            company_address=company.address,
            company_po_box='',  # Company has no P.O. Box field yet — left blank, editable on the LPO if needed later
            company_phone=company.phone,
            company_email=company.email,
            supplier_name=supplier.name,
            supplier_address=supplier.physical_address,
            supplier_email=supplier.email,
            supplier_phone=supplier.phone,
            vat_applicable=vat_applicable,
            vat_percent=vat_percent,
            subtotal=subtotal,
            vat_amount=vat_amount,
            total=total,
            created_by=request.user,
        )
        LPOItem.objects.bulk_create([
            LPOItem(
                lpo=lpo, description=item.description,
                quantity=item.approved_quantity or item.quantity,
                unit=item.unit, rate=item.estimated_unit_cost or 0,
            )
            for item in pr.items.all()
        ])
        _record_supplier_items(supplier, [item.description for item in pr.items.all()])
        return Response(LPOSerializer(lpo, context={'request': request}).data, status=201)

    @action(detail=False, methods=['post'], url_path='manual')
    def manual(self, request):
        """
        Body (multipart or JSON):
          supplier            required — supplier id
          project              required — which project this LPO is for
          items                required — JSON list: [{description, quantity, unit, rate}, ...]
          vat_applicable       optional, default true
          vat_percent          optional, default 16
          purchase_request     optional — link to an existing PR this LPO fulfils
                                (e.g. one escalated from a restock shortfall)
          source_document      optional file — the handwritten/external LPO image or PDF
          already_signed       optional bool — defaults to true if source_document is
                                given (a handwritten LPO already carries a real signature,
                                or an externally-issued one is already valid), false
                                otherwise. When true, status is set straight to 'signed',
                                skipping approve_digital/upload_signed entirely.

        Procurement is trusted to record this directly — no PurchaseRequest
        approval chain required, matching how generate() only requires an
        approved PR rather than re-approving anything itself.
        """
        supplier = get_object_or_404(
            Supplier, pk=request.data.get('supplier'), company=request.user.company,
        )
        project = get_object_or_404(
            Project, pk=request.data.get('project'), company=request.user.company,
        )

        pr = None
        pr_id = request.data.get('purchase_request')
        if pr_id:
            pr = get_object_or_404(
                PurchaseRequest, pk=pr_id, project__company=request.user.company,
            )
            if hasattr(pr, 'lpo'):
                raise ValidationError(f'An LPO ({pr.lpo.code}) already exists for this request.')

        raw_items = request.data.get('items')
        if isinstance(raw_items, str):
            try:
                raw_items = _json.loads(raw_items)
            except ValueError:
                raise ValidationError('items must be valid JSON.')
        if not raw_items:
            raise ValidationError('At least one item is required.')

        try:
            parsed_items = [
                {
                    'description': row.get('description', ''),
                    'quantity': Decimal(str(row.get('quantity', 0))),
                    'unit': row.get('unit', ''),
                    'rate': Decimal(str(row.get('rate', 0))),
                }
                for row in raw_items
            ]
        except InvalidOperation:
            raise ValidationError('Every item needs a numeric quantity and rate.')

        company = project.company
        vat_applicable = str(request.data.get('vat_applicable', 'true')).lower() != 'false'
        try:
            vat_percent = Decimal(str(request.data.get('vat_percent', 16)))
        except InvalidOperation:
            raise ValidationError('vat_percent must be a number.')

        subtotal = sum((row['quantity'] * row['rate'] for row in parsed_items), Decimal('0'))
        vat_amount = (subtotal * vat_percent / 100) if vat_applicable else Decimal('0')
        total = subtotal + vat_amount

        source_document = request.FILES.get('source_document')
        already_signed = str(
            request.data.get('already_signed', 'true' if source_document else 'false')
        ).lower() != 'false'

        lpo = LPO.objects.create(
            purchase_request=pr,
            project=project,
            supplier=supplier,
            origin='manual',
            company_name=company.name,
            company_address=company.address,
            company_po_box='',
            company_phone=company.phone,
            company_email=company.email,
            supplier_name=supplier.name,
            supplier_address=supplier.physical_address,
            supplier_email=supplier.email,
            supplier_phone=supplier.phone,
            vat_applicable=vat_applicable,
            vat_percent=vat_percent,
            subtotal=subtotal,
            vat_amount=vat_amount,
            total=total,
            source_document=source_document,
            signature_mode='wet_ink' if source_document else '',
            status='signed' if already_signed else 'awaiting_signature',
            created_by=request.user,
        )
        LPOItem.objects.bulk_create([
            LPOItem(
                lpo=lpo, description=row['description'],
                quantity=row['quantity'], unit=row['unit'], rate=row['rate'],
            )
            for row in parsed_items
        ])
        _record_supplier_items(supplier, [row['description'] for row in parsed_items])

        return Response(LPOSerializer(lpo, context={'request': request}).data, status=201)
    
    @action(detail=True, methods=['post'], url_path='approve-digital')
    def approve_digital(self, request, pk=None):
        lpo = self.get_object()
        if lpo.status != 'awaiting_signature':
            raise ValidationError(f'This LPO is already {lpo.get_status_display()}.')
        lpo.signature_mode = 'digital'
        lpo.digitally_approved_by = request.user
        lpo.digitally_approved_at = timezone.now()
        lpo.status = 'signed'
        lpo.save()
        return Response(LPOSerializer(lpo, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='upload-signed')
    def upload_signed(self, request, pk=None):
        lpo = self.get_object()
        if lpo.status != 'awaiting_signature':
            raise ValidationError(f'This LPO is already {lpo.get_status_display()}.')
        signed_file = request.FILES.get('signed_document')
        if not signed_file:
            raise ValidationError('signed_document file is required.')
        lpo.signature_mode = 'wet_ink'
        lpo.signed_document = signed_file
        lpo.status = 'signed'
        lpo.save()
        return Response(LPOSerializer(lpo, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        """
        Body: { delivery_location: 'site'|'main_warehouse', email?: bool }
        Marks it dispatched — email sending is stubbed as a TODO below,
        since I haven't seen how outbound email is configured in this
        codebase yet.
        """
        lpo = self.get_object()
        if lpo.status != 'signed':
            raise ValidationError('Only a signed LPO can be sent.')
        delivery_location = request.data.get('delivery_location')
        if delivery_location not in ('site', 'main_warehouse'):
            raise ValidationError('delivery_location must be "site" or "main_warehouse".')

        lpo.delivery_location = delivery_location
        lpo.status = 'sent'
        lpo.sent_at = timezone.now()
        lpo.save()

        if lpo.supplier_email:
            self._email_lpo_to_supplier(lpo)

        return Response(LPOSerializer(lpo, context={'request': request}).data)

    def _email_lpo_to_supplier(self, lpo):
        """
        Same pattern as apps.companies.utils.send_credentials_email —
        logged on failure rather than raised, since a flaky email
        provider shouldn't turn a successful "mark as sent" action into
        a 500. The LPO is already saved as sent by the time this runs;
        email delivery is best-effort on top of that, not a precondition.
        """
        import logging
        from django.core.mail import EmailMessage
        from django.conf import settings

        logger = logging.getLogger(__name__)
        try:
            email = EmailMessage(
                subject=f'Local Purchase Order {lpo.code} — {lpo.company_name}',
                body=(
                    f'Dear {lpo.supplier_name},\n\n'
                    f'Please find attached Local Purchase Order {lpo.code} '
                    f'from {lpo.company_name}.\n\n'
                    f'Total: {lpo.total} ({"incl." if lpo.vat_applicable else "excl."} VAT)\n\n'
                    f'Kindly confirm receipt and expected delivery date.\n\n'
                    f'Regards,\n{lpo.company_name}'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[lpo.supplier_email],
            )
            if lpo.signed_document:
                lpo.signed_document.open('rb')
                email.attach(
                    f'{lpo.code}-signed.pdf', lpo.signed_document.read(), 'application/pdf'
                )
                lpo.signed_document.close()
            else:
                from .services.lpo_pdf import generate_lpo_pdf
                pdf_buffer = generate_lpo_pdf(lpo)
                email.attach(f'{lpo.code}.pdf', pdf_buffer.read(), 'application/pdf')
            email.send()
        except Exception:
            logger.exception(
                'Failed to email LPO %s to supplier %s', lpo.code, lpo.supplier_email,
            )

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        from django.http import HttpResponse
        from .services.lpo_pdf import generate_lpo_pdf

        lpo = self.get_object()
        buffer = generate_lpo_pdf(lpo)
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{lpo.code}.pdf"'
        return response


class SupplierItemViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only — GET /api/procurement/supplier-items/?supplier=<id>
    What a supplier has been ordered for before, most-ordered first.
    Powers "this supplier usually sells..." suggestions when picking a
    supplier for a new LPO. Rows are written only via _record_supplier_items(),
    never through this viewset directly.
    """
    from .serializers import SupplierItemSerializer as _SupplierItemSerializer
    serializer_class = _SupplierItemSerializer
    permission_classes = [PurchaseRequestPermission]  # any authenticated company user can view

    def get_queryset(self):
        qs = SupplierItem.objects.filter(supplier__company=self.request.user.company)
        supplier_id = self.request.query_params.get('supplier')
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        return qs

    def get_permissions(self):
        # Override — viewing supplier history is harmless read access,
        # doesn't need the full PurchaseRequestPermission project-scoping
        # logic (this viewset has no get_project(), so that class's
        # has_permission would break here). Simple auth check instead.
        from rest_framework.permissions import IsAuthenticated
        return [IsAuthenticated()]