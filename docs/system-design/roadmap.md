# Construction ERP SaaS — Developer Implementation Roadmap

**Purpose:** Turn the 19-phase WBS into an executable build plan. Every phase lists the database tables, API endpoints, frontend pages, mobile screens, dependencies, and a realistic time estimate for a single strong full-stack developer (or a small 2–3 person team, noted where relevant).

**Stack assumed:** Django + DRF (backend), PostgreSQL, React + TypeScript + Tailwind (web), React Native/Expo (mobile), JWT auth, Docker.

**Estimate basis:** "Dev-days" = one focused developer working full days. A 2–3 person team roughly divides these by 1.5–2x, not 3x, because of integration and review overhead.

---

## How to Read Each Phase

Each phase below has six sections:
- **Depends on** — phases that must be functionally complete first
- **Database tables** — new models/tables introduced
- **API endpoints** — REST resources exposed
- **Frontend pages** — web routes/screens
- **Mobile screens** — Expo/React Native screens (only where relevant)
- **Estimate** — dev-days

Totals and a suggested calendar are at the end.

---

## Phase 0 — Project Initialization

**Depends on:** Nothing.

**Database tables:** None yet.

**API endpoints:** None yet.

**Frontend pages:** None yet — scaffold only.

**Mobile screens:** None yet — scaffold only.

**Tasks:**
- Create root repo, `.gitignore`, `README.md`
- Create `backend/`, `frontend/`, `mobile/`, `docs/`, `database/`, `storage/`, `deployment/`, `ai-services/`
- Write `docs/business/requirements.md` and `modules.md` (lock scope for V1)
- Set up `docker-compose.yml` with Postgres + Redis services

**Estimate:** 1 dev-day

---

## Phase 1 — System Foundation

**Depends on:** Phase 0.

**Database tables:**
- None business-specific yet — just Django's default auth/session tables and a health-check table if desired.

**API endpoints:**
- `GET /api/health/` — service check

**Frontend pages:**
- Blank shell app with router mounted, Tailwind configured, `.env` wired to API base URL

**Mobile screens:**
- Blank Expo shell, confirms it can hit `/api/health/`

**Tasks:**
- `django-admin startproject config .`
- Install DRF, `djangorestframework-simplejwt`, `django-cors-headers`, `psycopg2-binary`
- Split settings into `base.py` / `development.py` / `production.py`
- `npm create vite` for frontend, install React Router, Axios, Tailwind, Zustand or Redux Toolkit
- `npx create-expo-app` for mobile

**Estimate:** 2 dev-days

---

## Phase 2 — Multi-Tenant Company System

**Depends on:** Phase 1.

**Database tables:**
- `Company` (id, name, registration_no, logo, address, subscription_plan, subscription_status, created_at)
- `Branch` (id, company_id FK, name, location)
- `Subscription` (id, company_id FK, plan, seats, billing_cycle, status, trial_ends_at)

**API endpoints:**
- `POST /api/companies/` — register company
- `GET /api/companies/{id}/`
- `PATCH /api/companies/{id}/`
- `GET /api/companies/{id}/branches/`
- `POST /api/companies/{id}/branches/`

**Frontend pages:**
- `/register-company`
- `/company/settings/profile`
- `/company/settings/branches`

**Mobile screens:** None (office-side feature).

**Key architectural decision to implement now:** every future model gets a `company_id` FK (directly or via project). Build a `TenantScopedManager`/base model mixin now so every app inherits it — this saves huge rework later.

**Estimate:** 3 dev-days

---

## Phase 3 — Authentication & Security

**Depends on:** Phase 2.

**Database tables:**
- `User` (custom user model — id, email, phone, password, company_id FK, is_active, last_login)
- `Role` (id, company_id FK, name, is_system_role)
- `Permission` (id, code, description)
- `RolePermission` (role_id FK, permission_id FK)
- `UserRole` (user_id FK, role_id FK, project_id FK nullable — supports project-scoped roles)

**API endpoints:**
- `POST /api/auth/register/`
- `POST /api/auth/login/` — returns JWT access + refresh
- `POST /api/auth/refresh/`
- `POST /api/auth/logout/`
- `POST /api/auth/password-reset/`
- `POST /api/auth/password-reset-confirm/`
- `GET /api/roles/`
- `POST /api/roles/`
- `GET /api/permissions/`

**Frontend pages:**
- `/login`
- `/forgot-password`
- `/reset-password`
- `/company/settings/roles`
- `/company/settings/users`

**Mobile screens:**
- Login
- Forgot password

**Tasks:**
- Seed default roles: CEO, Director, PM, Site Engineer, QS, Procurement Officer, Store Keeper, Accountant, HR, Foreman, Driver
- Build a `permissions.py` DRF permission class that checks `UserRole` + `RolePermission` against the requested action

**Estimate:** 5 dev-days

---

## Phase 4 — Company Management

**Depends on:** Phase 3.

**Database tables:**
- `Department` (id, company_id FK, name)
- `Employee` (id, user_id FK, company_id FK, department_id FK, position, hire_date, employment_status)

**API endpoints:**
- `GET/POST /api/departments/`
- `GET/POST /api/employees/`
- `GET /api/employees/{id}/`
- `PATCH /api/employees/{id}/`

**Frontend pages:**
- `/company/dashboard` (placeholder KPIs — real data comes later)
- `/company/departments`
- `/company/employees`
- `/company/employees/{id}`

**Mobile screens:** None.

**Estimate:** 3 dev-days

---

## Phase 5 — Project Workspace Core

**Depends on:** Phase 4.

**Database tables:**
- `Project` (id, company_id FK, name, client_id FK, location, contract_value, budget, start_date, end_date, status)
- `Client` (id, company_id FK, name, contact_person, phone, email)
- `Contract` (id, project_id FK, document_id FK nullable, value, signed_date)
- `ProjectMember` (id, project_id FK, user_id FK, role_on_project)

**API endpoints:**
- `GET/POST /api/projects/`
- `GET /api/projects/{id}/`
- `PATCH /api/projects/{id}/`
- `GET/POST /api/projects/{id}/members/`
- `GET/POST /api/clients/`

**Frontend pages:**
- `/company/projects` (list + create)
- `/projects/{id}` → **ProjectLayout** wrapper with sidebar
- `/projects/{id}/overview`
- `/projects/{id}/members`

**Mobile screens:**
- Project switcher (list of projects assigned to the logged-in field user)

**This is the architectural hinge point of the whole system** — every subsequent module attaches to `Project`. Budget extra review time here.

**Estimate:** 5 dev-days

---

## Phase 6 — Document Management

**Depends on:** Phase 5.

**Database tables:**
- `Document` (id, company_id FK, project_id FK nullable, category, name, file_url, version, uploaded_by FK, created_at)
- `DocumentVersion` (id, document_id FK, file_url, version_number, uploaded_by FK, created_at)
- `FilingReference` (id, document_id FK, cabinet, drawer, file_label, section)

**API endpoints:**
- `GET/POST /api/documents/` (filterable by company/project/category)
- `GET /api/documents/{id}/`
- `POST /api/documents/{id}/versions/`
- `GET /api/documents/{id}/versions/`
- `GET /api/documents/search/?q=`

**Frontend pages:**
- `/company/documents`
- `/projects/{id}/documents`
- Document preview modal/viewer (PDF, image, Office via preview lib)

**Mobile screens:**
- Document viewer (read-only, offline-cached recent files)

**Note:** wire storage to S3-compatible bucket or Cloudinary now — don't use local `media/` beyond dev.

**Estimate:** 5 dev-days

> **✅ End of Phase 6 = usable MVP skeleton.** A company can sign up, add staff, create projects, and store documents. This is a legitimate demo-able milestone.

---

## Phase 7 — Planning & Scheduling

**Depends on:** Phase 5, Phase 6 (for program file uploads).

**Database tables:**
- `Activity` (id, project_id FK, name, planned_start, planned_end, actual_start, actual_end, percent_complete, status, dependency_id FK nullable)
- `Milestone` (id, project_id FK, name, target_date, achieved_date, status)
- `ProgressUpdate` (id, activity_id FK, updated_by FK, percent_complete, notes, created_at)

**API endpoints:**
- `GET/POST /api/projects/{id}/activities/`
- `PATCH /api/activities/{id}/`
- `GET/POST /api/projects/{id}/milestones/`
- `POST /api/activities/{id}/progress/`

**Frontend pages:**
- `/projects/{id}/planning` — Gantt view + Kanban toggle

**Mobile screens:**
- Activity list for site engineer
- Update progress (percent slider + notes + photo)

**Estimate:** 6 dev-days (Gantt UI is the time sink — consider a library like `frappe-gantt` or `dhtmlx-gantt` rather than building from scratch)

---

## Phase 8 — Quantity Surveying (BOQ, Valuations, Variations)

**Depends on:** Phase 6, Phase 7.

**Database tables:**
- `BOQ` (id, project_id FK, source_document_id FK, status)
- `BOQItem` (id, boq_id FK, item_code, description, unit, quantity, rate, amount, category)
- `Valuation` (id, project_id FK, valuation_number, period_start, period_end, gross_value, retention, net_value, status)
- `Variation` (id, project_id FK, description, boq_item_id FK nullable, quantity_change, value_change, status, approved_by FK)
- `PaymentCertificate` (id, valuation_id FK, certificate_number, amount, issued_date, status)

**API endpoints:**
- `POST /api/projects/{id}/boq/upload/` (raw file, Phase 16 will make this smart)
- `GET/POST /api/projects/{id}/boq/items/`
- `GET/POST /api/projects/{id}/valuations/`
- `GET/POST /api/projects/{id}/variations/`
- `POST /api/valuations/{id}/certificates/`

**Frontend pages:**
- `/projects/{id}/boq`
- `/projects/{id}/valuations`
- `/projects/{id}/variations`

**Mobile screens:** None (office/QS function).

**Note:** V1 BOQ item entry can be manual/CSV-import. Automated PDF/Excel parsing is deferred to Phase 16 — don't block this phase on AI extraction.

**Estimate:** 7 dev-days

---

## Phase 9 — Procurement System

**Depends on:** Phase 5. Benefits from Phase 8 (BOQ) and Phase 10 (inventory) but can be built in parallel with stubbed inventory checks.

**Database tables:**
- `Supplier` (id, company_id FK, name, contact, products, rating)
- `PurchaseRequest` (id, project_id FK nullable, company_id FK, requested_by FK, status, created_at)
- `PurchaseRequestItem` (id, request_id FK, item_name, quantity, unit, estimated_cost)
- `RFQ` (id, request_id FK, sent_to_suppliers M2M, deadline)
- `SupplierQuotation` (id, rfq_id FK, supplier_id FK, item_id FK, unit_price, lead_time)
- `PurchaseOrder` (id, request_id FK, supplier_id FK, total_amount, status, issued_date)
- `GoodsReceivedNote` (id, po_id FK, received_by FK, received_date, notes)
- `SupplierInvoice` (id, po_id FK, invoice_number, amount, due_date, status)

**API endpoints:**
- `GET/POST /api/suppliers/`
- `GET/POST /api/procurement/requests/`
- `POST /api/procurement/requests/{id}/approve/`
- `POST /api/procurement/requests/{id}/rfq/`
- `POST /api/rfq/{id}/quotations/`
- `POST /api/procurement/requests/{id}/purchase-order/`
- `POST /api/purchase-orders/{id}/grn/`
- `POST /api/purchase-orders/{id}/invoice/`

**Frontend pages:**
- `/company/procurement/suppliers`
- `/company/procurement/requests` and `/projects/{id}/procurement/requests`
- `/procurement/requests/{id}` — full workflow visual (Request → Approval → RFQ → Quotation → LPO → Delivery → Invoice → Payment)

**Mobile screens:**
- Request material (simple form, syncs to `PurchaseRequest`)
- Track request status

**Estimate:** 8 dev-days

---

## Phase 10 — Inventory & Warehouse

**Depends on:** Phase 9 (goods received feeds stock).

**Database tables:**
- `Warehouse` (id, company_id FK, name, location, type: main/project)
- `InventoryItem` (id, company_id FK, name, unit, category)
- `StockBalance` (id, warehouse_id FK, item_id FK, quantity_available)
- `StockMovement` (id, item_id FK, from_warehouse_id FK nullable, to_warehouse_id FK nullable, quantity, movement_type: receipt/transfer/issue/return/damage, reference_id, created_by FK, created_at)
- `MaterialRequest` (id, project_id FK, requested_by FK, status) — site-to-store request, distinct from procurement's `PurchaseRequest`

**API endpoints:**
- `GET/POST /api/warehouses/`
- `GET /api/inventory/items/`
- `GET /api/warehouses/{id}/stock/`
- `POST /api/inventory/transfer/`
- `POST /api/inventory/issue/`
- `GET/POST /api/projects/{id}/material-requests/`

**Frontend pages:**
- `/company/inventory` — main warehouse view
- `/projects/{id}/inventory` — project store view
- `/inventory/movements` — full audit ledger

**Mobile screens:**
- Request material (site)
- Store keeper: receive/issue stock (can double as a lightweight web-first feature if store keepers are office-based)

**Estimate:** 6 dev-days

---

## Phase 11 — Site Operations Mobile App

**Depends on:** Phase 5, 7, 9, 10 (this phase is largely UI wiring the mobile app to existing endpoints, plus new site-only tables).

**Database tables:**
- `DailyReport` (id, project_id FK, submitted_by FK, date, weather, workers_present, activities_summary, notes)
- `DailyReportPhoto` (id, report_id FK, photo_url)
- `Attendance` (id, project_id FK, employee_id FK, check_in_time, check_out_time, gps_lat, gps_lng, photo_url)
- `SafetyIncident` (id, project_id FK, reported_by FK, description, severity, photo_url, status)
- `EquipmentRequest` (id, project_id FK, equipment_type, requested_by FK, needed_by_date, status)

**API endpoints:**
- `POST /api/projects/{id}/daily-reports/`
- `POST /api/attendance/checkin/`
- `POST /api/attendance/checkout/`
- `POST /api/projects/{id}/safety-incidents/`
- `POST /api/projects/{id}/equipment-requests/`

**Frontend pages:** None new (this phase is mobile-only); optionally a read-only web view of site reports.

**Mobile screens:**
- Home ("Good Morning [Name]" dashboard with action buttons)
- Attendance check-in/out (GPS + photo)
- Daily report (multi-step: weather → workers → activities → photos → submit)
- Material request
- Equipment request
- Safety incident report
- **Offline queue + sync manager** (`sync.ts`, `storage.ts`)

**Estimate:** 10 dev-days (offline sync is the hard part — budget real time for conflict handling and retry logic)

---

## Phase 12 — HR & Workforce

**Depends on:** Phase 4, Phase 11 (attendance feeds payroll).

**Database tables:**
- `LeaveRequest` (id, employee_id FK, type, start_date, end_date, status)
- `Payroll` (id, employee_id FK, period_start, period_end, gross_pay, deductions, net_pay, status)
- `WeeklyWage` (id, project_id FK, worker_id FK, week_start, days_worked, rate, total)
- `EmployeeContract` (id, employee_id FK, document_id FK, start_date, end_date, terms)

**API endpoints:**
- `GET/POST /api/employees/{id}/leave/`
- `POST /api/payroll/run/` (monthly, office staff)
- `POST /api/payroll/weekly-wages/run/` (site workers)
- `GET /api/payroll/{id}/`

**Frontend pages:**
- `/company/hr/leave`
- `/company/hr/payroll`
- `/projects/{id}/site-payroll` (weekly wages, driven by attendance)

**Mobile screens:** None new (consumes Phase 11 attendance data).

**Estimate:** 6 dev-days

---

## Phase 13 — Equipment & Fleet

**Depends on:** Phase 5.

**Database tables:**
- `Equipment` (id, company_id FK, name, type, current_project_id FK nullable, status)
- `EquipmentMaintenance` (id, equipment_id FK, type, date, cost, notes)
- `Vehicle` (id, company_id FK, registration_no, type, assigned_driver_id FK)
- `FuelLog` (id, equipment_id FK nullable, vehicle_id FK nullable, date, litres, cost)
- `Trip` (id, vehicle_id FK, driver_id FK, purpose, start_time, end_time)

**API endpoints:**
- `GET/POST /api/equipment/`
- `POST /api/equipment/{id}/maintenance/`
- `GET/POST /api/fleet/vehicles/`
- `POST /api/fleet/fuel-logs/`
- `POST /api/fleet/trips/`

**Frontend pages:**
- `/company/equipment`
- `/company/fleet`
- `/projects/{id}/equipment` (assigned to this project)

**Mobile screens:**
- Fuel log entry (driver/operator)
- Equipment request status (already covered in Phase 11, linked here)

**Estimate:** 5 dev-days

---

## Phase 14 — Finance & Accounting

**Depends on:** Phase 8 (valuations), Phase 9 (supplier invoices), Phase 12 (payroll). This is the most cross-cutting phase — don't start until those exist.

**Database tables:**
- `ChartOfAccounts` (id, company_id FK, code, name, type: asset/liability/equity/income/expense)
- `JournalEntry` (id, company_id FK, date, reference, created_by FK)
- `JournalLine` (id, journal_entry_id FK, account_id FK, debit, credit)
- `BankAccount` (id, company_id FK, name, bank, account_number, balance)
- `Expense` (id, project_id FK nullable, category, amount, date, paid_from_account_id FK)
- `Income` (id, project_id FK, source, amount, date)
- `PettyCash` (id, project_id FK, custodian_id FK, amount, purpose, date)
- `ProjectCosting` (materialized/view or computed — pulls from BOQ, procurement, payroll, expenses)

**API endpoints:**
- `GET/POST /api/accounting/journal-entries/`
- `GET/POST /api/accounting/bank-accounts/`
- `GET/POST /api/finance/expenses/`
- `GET/POST /api/finance/income/`
- `GET /api/reports/profit-loss/`
- `GET /api/reports/balance-sheet/`
- `GET /api/reports/cash-flow/`
- `GET /api/projects/{id}/cost-control/` — the flagship endpoint (budget vs actual, by category)

**Frontend pages:**
- `/company/finance/accounts`
- `/company/finance/journal`
- `/projects/{id}/finance` — cost control dashboard (contract value, budget, spent, materials, labour, equipment, procurement, % complete, expected vs actual profit, cash flow, overruns)

**Mobile screens:** None (office function).

**Estimate:** 10 dev-days — this is the module the WBS warns not to build from scratch carelessly; keep double-entry integrity strict from day one.

---

## Phase 15 — Reporting & Analytics

**Depends on:** All prior data-producing phases (7–14).

**Database tables:** Mostly none new — this phase is queries/aggregation, possibly a few `ReportSnapshot` cache tables for heavy dashboards.

**API endpoints:**
- `GET /api/reports/company-dashboard/`
- `GET /api/reports/project-dashboard/{id}/`
- `GET /api/reports/procurement-summary/`
- `GET /api/reports/inventory-summary/`
- `GET /api/reports/payroll-summary/`
- `GET /api/reports/export/?type=pdf|xlsx`

**Frontend pages:**
- `/company/dashboard` (finalized, real data — replaces Phase 4 placeholder)
- `/projects/{id}/dashboard` (finalized)
- Role-specific dashboards: Finance, Procurement, HR, Site

**Mobile screens:**
- Simple site dashboard summary (optional for V1)

**Estimate:** 6 dev-days

---

## Phase 16 — AI Document Intelligence

**Depends on:** Phase 6 (documents), Phase 8 (BOQ structure to populate).

**Database tables:**
- `DocumentExtraction` (id, document_id FK, extraction_type, raw_output_json, status, confidence_score)
- `KnowledgeBaseEntry` (id, company_id FK, project_id FK nullable, title, content, tags, created_by FK)

**API endpoints:**
- `POST /api/documents/{id}/extract/` (triggers async parse job)
- `GET /api/documents/{id}/extraction/`
- `GET/POST /api/knowledge-base/`
- `POST /api/assistant/ask/` (natural-language query endpoint)

**Frontend pages:**
- Extraction review screen (human confirms/corrects parsed BOQ before it commits to `BOQItem` table)
- `/company/knowledge-base`
- Floating "Ask AI" widget across the app

**Mobile screens:** None (defer to V2).

**Note:** This is a separate `ai-services/` microservice (`boq_parser.py`, `pdf_reader.py`, `excel_parser.py`) called via internal API, not built into the main Django monolith — keeps parsing dependencies isolated.

**Estimate:** 10 dev-days for a working first version (rule-based + LLM-assisted extraction with human review step, not fully autonomous)

---

## Phase 17 — Testing

**Depends on:** Runs continuously alongside all phases in practice, but budget a dedicated hardening pass here.

**Tasks:**
- Backend: pytest suite for models, permissions, and the procurement/inventory/finance workflows specifically (these have the most state transitions)
- API contract tests for every endpoint above
- Frontend: component tests for forms and the cost-control dashboard
- Mobile: offline sync tests (airplane-mode simulation, conflict resolution)
- Load test the multi-tenant query layer (confirm no cross-company data leaks — this is a security-critical test, not optional)

**Estimate:** 8 dev-days dedicated pass (in addition to tests written inline during each phase)

---

## Phase 18 — Deployment

**Depends on:** Phase 17.

**Tasks:**
- Production Dockerfiles for backend/frontend
- `docker-compose.prod.yml`
- Nginx reverse proxy + SSL (Let's Encrypt or managed cert)
- Managed Postgres (or self-hosted with backup cron)
- Object storage bucket (S3-compatible) for documents/photos
- CI/CD pipeline (GitHub Actions: test → build → deploy)
- Environment secrets management
- Monitoring/error tracking (Sentry) and uptime checks

**Estimate:** 5 dev-days

---

## Phase 19 — SaaS Operations

**Depends on:** Phase 2 (subscription model), Phase 18 (live infra).

**Database tables:**
- `Plan` (id, name, price, seat_limit, project_limit, storage_limit_gb)
- `Invoice` (id, company_id FK, plan_id FK, amount, status, period)
- `UsageLog` (id, company_id FK, metric, value, recorded_at)

**API endpoints:**
- `GET /api/plans/`
- `POST /api/billing/subscribe/`
- `GET /api/billing/invoices/`
- `GET /api/company/usage/`

**Frontend pages:**
- `/company/settings/billing`
- Super Admin panel: `/admin/companies`, `/admin/plans`, `/admin/usage`

**Mobile screens:** None.

**Estimate:** 6 dev-days

---

## Total Estimate & Suggested Sequencing

| Phase | Estimate (dev-days) |
|---|---|
| 0 – Init | 1 |
| 1 – Foundation | 2 |
| 2 – Multi-tenant | 3 |
| 3 – Auth & Security | 5 |
| 4 – Company Mgmt | 3 |
| 5 – Project Workspace | 5 |
| 6 – Documents | 5 |
| **MVP skeleton subtotal** | **24 dev-days (~5 weeks solo)** |
| 7 – Planning | 6 |
| 8 – QS/BOQ | 7 |
| 9 – Procurement | 8 |
| 10 – Inventory | 6 |
| 11 – Mobile site app | 10 |
| 12 – HR | 6 |
| 13 – Equipment/Fleet | 5 |
| 14 – Finance/Accounting | 10 |
| 15 – Reporting | 6 |
| **Core operations subtotal** | **64 dev-days (~13 weeks solo)** |
| 16 – AI Intelligence | 10 |
| 17 – Testing | 8 |
| 18 – Deployment | 5 |
| 19 – SaaS Ops | 6 |
| **Launch-readiness subtotal** | **29 dev-days (~6 weeks solo)** |
| **Grand total** | **~117 dev-days ≈ 5–6 months solo, ~3–4 months for a 2–3 person team** |

**Recommended cut line for a sellable V1:** Phases 0–12 plus 17–18 (skip Equipment/Fleet, AI, and full SaaS billing initially — sell manually to first few pilot customers, add self-serve billing once you have 5–10 paying companies). That trims roughly 25 dev-days off the timeline.

---

## What to Build Next

The next document that depends on this roadmap is the **Database ERD** — the full entity-relationship diagram showing every foreign key across all 19 phases in one view, so migrations can be planned without circular dependency surprises (e.g., `Project` → `Client`, `PurchaseOrder` → `Supplier` + `PurchaseRequest`, `JournalLine` → `ChartOfAccounts`).
