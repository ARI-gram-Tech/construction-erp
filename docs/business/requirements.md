# Requirements — Construction ERP SaaS (V1 Scope)

## What the system must do
A multi-tenant SaaS platform where construction companies each get an isolated
workspace to manage projects, staff, documents, planning, procurement,
inventory, and finance — with a mobile app for site staff and a web app for
office staff.

## V1 cut line (per Developer Implementation Roadmap)
Phases 0–12 + 17–18. Equipment/Fleet, AI Document Intelligence, and self-serve
SaaS billing (Phase 13, 16, 19) are deferred until there are 5–10 paying pilot
companies.

## Non-negotiables from day one
- Every business record is scoped to a `company_id` (directly or via project).
  No cross-tenant data leaks — this is tested explicitly in Phase 17.
- Role-based permissions checked server-side on every request, not just hidden
  in the UI.
- Mobile app works offline and syncs when connectivity returns.
- Documents keep version history — never overwrite the original file.

## Out of scope for V1
- Full double-entry accounting automation beyond journal entries + basic P&L/cash flow
- AI-powered BOQ/document parsing (manual/CSV entry for now)
- Equipment & fleet tracking
- Client-facing portal
- Self-serve billing (manual invoicing to pilot customers)
