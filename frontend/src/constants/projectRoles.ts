// /src/constants/projectRoles.ts
// Shared role groupings used by both ProjectSidebar (what's shown) and
// RoleGate (what's actually allowed) — one source of truth so the two
// can never drift out of sync with each other.

export const PROJECT_MANAGEMENT_ROLES = ["project_manager"];
export const COMPANY_WIDE_ROLES = [
  "company_admin",
  "director",
  "operations_manager",
];
export const SITE_EXECUTION_ROLES = [
  "site_manager",
  "site_engineer",
  "foreman",
  "site_supervisor",
];

export const WAREHOUSE_LOGISTICS_ROLES = ["main_store_manager", "storekeeper"];

export const PROCUREMENT_INVOLVED_ROLES = [
  ...PROJECT_MANAGEMENT_ROLES,
  ...COMPANY_WIDE_ROLES,
  ...SITE_EXECUTION_ROLES,
  "qs",
  "procurement_manager",
  "procurement",
];

export const FINANCE_INVOLVED_ROLES = [
  ...COMPANY_WIDE_ROLES,
  ...PROJECT_MANAGEMENT_ROLES,
  "qs",
  "finance_manager",
  "accountant",
];

// Who can approve/reject new stock-catalog item requests. Matches
// can_manage_warehouse_logistics on the backend (company_admin, director,
// operations_manager, main_store_manager) plus procurement, per the
// business decision that procurement staff should also be able to
// approve catalog additions even though they don't otherwise touch
// warehouse logistics.
export const INVENTORY_CATALOG_MANAGER_ROLES = [
  ...COMPANY_WIDE_ROLES,
  "main_store_manager",
  "procurement_manager",
  "procurement",
];

// Who can approve/reject RESTOCK requests specifically — this must
// match can_manage_warehouse_logistics on the backend exactly
// (company_admin, director, operations_manager, main_store_manager).
// Deliberately narrower than INVENTORY_CATALOG_MANAGER_ROLES above:
// procurement doesn't move physical stock between warehouses, only
// catalog additions — approving a restock actually executes a
// transfer, which is logistics-tier only. storekeeper is excluded
// too, even though WAREHOUSE_LOGISTICS_ROLES includes them — they
// create restock requests, they don't approve their own.
export const RESTOCK_APPROVER_ROLES = [
  ...COMPANY_WIDE_ROLES,
  "main_store_manager",
];

// Who sees BOQ/Budget/Variations in a project's sidebar. QS is the
// primary owner; PM and company-wide managers need visibility too
// since they're the ones approving budgets/variations per
// apps.budget/apps.variations' own permission expectations.
export const QS_INVOLVED_ROLES = [
  ...COMPANY_WIDE_ROLES,
  ...PROJECT_MANAGEMENT_ROLES,
  "qs",
];

// Who can actually CREATE a Purchase Request — narrower than
// PROCUREMENT_INVOLVED_ROLES (which also covers who can just VIEW
// requests). Must match apps.procurement.permissions.can_create_request
// on the backend exactly: procurement staff + company-wide managers
// only. Site/PM/QS roles can still see requests, they just can't
// raise new ones anymore — that moved to Procurement's lane.
export const PROCUREMENT_CREATE_ROLES = [
  ...COMPANY_WIDE_ROLES,
  "procurement_manager",
  "procurement",
];

// Who sees "Tenders" in the company sidebar and can view a tender.
// Matches apps.tenders.permissions.can_view_tender on the backend:
// company-wide managers, qs (the primary owner), and procurement
// roles (visibility for future Market Pricing collaboration).
export const TENDER_VIEW_ROLES = [
  ...COMPANY_WIDE_ROLES,
  "qs",
  "procurement_manager",
  "procurement",
];
