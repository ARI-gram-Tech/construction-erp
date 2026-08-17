// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { AuthLayout } from "@/layouts/AuthLayout";
import { CompanyLayout } from "@/layouts/CompanyLayout";
import { ProjectLayout } from "@/layouts/ProjectLayout";
import { LoginPage } from "@/modules/auth/LoginPage";
import { ChangePasswordPage } from "@/modules/auth/ChangePasswordPage";
import AcceptInvite from "@/modules/auth/AcceptInvite";
import { CompanyDashboard } from "@/modules/dashboard/CompanyDashboard";
import { SiteEngineerDashboard } from "@/modules/dashboard/SiteEngineerDashboard";
import { UsersManagement } from "@/modules/users/UsersManagement";
import { ProjectListPage } from "@/modules/projects/ProjectListPage";
import { ProjectOverviewPage } from "@/modules/projects/ProjectOverview/ProjectOverviewPage";
import { ProjectTeamPage } from "@/modules/projects/ProjectTeam/ProjectTeamPage";
import { ProjectSitePage } from "@/modules/projects/ProjectSite/ProjectSitePage";
import { CompanyDocumentsPage } from "@/modules/company/CompanyDocumentsPage";
import { ProjectDocumentsPage } from "@/modules/projects/ProjectDocuments/ProjectDocumentsPage";
import { SuppliersHeader } from "@/modules/suppliers/components/SuppliersHeader";
import { SuppliersPage } from "@/modules/suppliers/SuppliersPage";
import { AddSupplierPage } from "@/modules/suppliers/AddSupplierPage";
import { SupplierProfilePage } from "@/modules/suppliers/SupplierProfilePage";
import { ProjectPlanningPage } from "@/modules/projects/ProjectPlanning/ProjectPlanningPage";
import { ActivityDetailPage } from "@/modules/projects/ProjectPlanning/ActivityDetailPage";
import { SuperAdminLayout } from "./layouts/SuperAdminLayout";
import { SuperAdminDashboard } from "./modules/dashboard/SuperAdminDashboard";
import { SubscriptionsPage } from "@/modules/super-admin/SubscriptionsPage";
import { AuditLogsPage } from "@/modules/super-admin/AuditLogsPage";
import { EmployeesPage } from "@/modules/company/EmployeesPage";
import { ProcurementLayout } from "@/modules/projects/ProjectProcurement/components/ProcurementLayout";
import { ProcurementDashboard } from "@/modules/projects/ProjectProcurement/ProcurementDashboard";
import { ProcurementPage } from "@/modules/projects/ProjectProcurement/ProcurementPage";
import { CompanyProcurementLayout } from "@/modules/procurement/components/CompanyProcurementLayout";
import { CompanyProcurementDashboard } from "@/modules/procurement/CompanyProcurementDashboard";
import { CompanyPurchaseRequestsPage } from "@/modules/procurement/CompanyPurchaseRequestsPage";
import { BudgetWorkspacePage } from "@/modules/projects/ProjectBudget/BudgetWorkspacePage";
import { CashFlowWorkspacePage } from "@/modules/projects/ProjectCashFlow/CashFlowWorkspacePage";
import { VariationsPage } from "@/modules/projects/ProjectVariations/VariationsPage";
import { IPCListPage } from "@/modules/projects/ProjectVariations/IPCListPage";
import { RoleGate } from "@/components/RoleGate";
import {
  PROCUREMENT_INVOLVED_ROLES,
  PROCUREMENT_CREATE_ROLES,
  INVENTORY_CATALOG_MANAGER_ROLES,
} from "@/constants/projectRoles";
import { NewPurchaseRequestPage } from "@/modules/projects/ProjectProcurement/NewPurchaseRequestPage";
import { PurchaseRequestDetailPage } from "@/modules/projects/ProjectProcurement/PurchaseRequestDetailPage";
import { InventoryEntryPoint } from "@/modules/inventory/InventoryEntryPoint";
import { NewStockItemPage } from "@/modules/inventory/NewStockItemPage";
import { StockItemDetailPage } from "@/modules/inventory/StockItemDetailPage";
import { ProjectInventoryPage } from "@/modules/projects/ProjectInventory/ProjectInventoryPage";
import { WarehousePage } from "@/modules/inventory/WarehousePage";
import { MovementPage } from "@/modules/inventory/MovementPage";
import { RestockRequestDetailPage } from "@/modules/inventory/RestockRequestDetailPage";
import { BOQListPage } from "@/modules/projects/ProjectBOQ/BOQListPage";
import { NewBOQPage } from "@/modules/projects/ProjectBOQ/NewBOQPage";
import { BOQDetailPage } from "@/modules/projects/ProjectBOQ/BOQDetailPage";
import { BOQDashboardPage } from "@/modules/projects/ProjectBOQ/BOQDashboardPage";
import { BOQImportPage } from "@/modules/projects/ProjectBOQ/BOQImportPage";
import { QSCompanyDashboard } from "@/modules/dashboard/QSCompanyDashboard";
import { TendersPage } from "@/modules/tenders/TendersPage";
import { TenderDetailPage } from "@/modules/tenders/TenderDetailPage";
import { NewTenderPage } from "@/modules/tenders/NewTenderPage";

function Placeholder({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-steel-300 bg-white p-8 text-center text-sm text-steel-500">
      {title} — built in a later phase per the roadmap.
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />

          {/* Auth (pre-company) */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/accept-invite/:token" element={<AcceptInvite />} />
          </Route>

          {/*super-admin routes*/}
          <Route element={<SuperAdminLayout />}>
            <Route
              path="/super-admin/dashboard"
              element={<SuperAdminDashboard />}
            />
            <Route path="/super-admin/users" element={<UsersManagement />} />
            <Route
              path="/super-admin/subscriptions"
              element={<SubscriptionsPage />}
            />
            <Route path="/super-admin/audit-logs" element={<AuditLogsPage />} />
          </Route>

          {/* Level 1: Company office */}
          <Route element={<CompanyLayout />}>
            <Route path="/company/dashboard" element={<CompanyDashboard />} />
            <Route
              path="/company/dashboard/qs"
              element={<QSCompanyDashboard />}
            />
            <Route
              path="/company/dashboard/site-engineer"
              element={<SiteEngineerDashboard />}
            />
            <Route path="/company/tenders" element={<TendersPage />} />
            <Route
              path="/company/tenders/:tenderId"
              element={<TenderDetailPage />}
            />
            <Route path="/company/tenders/new" element={<NewTenderPage />} />
            <Route
              path="/company/profile"
              element={<Placeholder title="Company profile" />}
            />
            <Route path="/company/projects" element={<ProjectListPage />} />
            <Route path="/company/employees" element={<EmployeesPage />} />
            <Route
              path="/company/documents"
              element={<CompanyDocumentsPage />}
            />

            <Route
              path="/company/inventory"
              element={<InventoryEntryPoint />}
            />
            <Route
              path="/company/inventory/requests"
              element={
                <RoleGate
                  roles={INVENTORY_CATALOG_MANAGER_ROLES}
                  sectionName="Catalog Approvals"
                >
                  <Navigate to="/company/inventory?tab=requests" replace />
                </RoleGate>
              }
            />
            <Route
              path="/company/inventory/warehouses/:warehouseId"
              element={<WarehousePage />}
            />
            <Route
              path="/company/inventory/items/new"
              element={<NewStockItemPage />}
            />
            <Route
              path="/company/inventory/items/:itemId"
              element={<StockItemDetailPage />}
            />
            <Route
              path="/company/inventory/movements/:movementId"
              element={<MovementPage />}
            />
            <Route
              path="/company/inventory/restock-requests/:requestId"
              element={<RestockRequestDetailPage />}
            />

            <Route
              path="/company/fleet"
              element={<Placeholder title="Fleet & Equipment" />}
            />
            <Route
              path="/company/warehouse"
              element={<Placeholder title="Warehouse" />}
            />
            <Route
              path="/company/suppliers"
              element={
                <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 pb-12">
                  <SuppliersHeader />
                  <SuppliersPage />
                </div>
              }
            />
            <Route
              path="/company/suppliers/new"
              element={<AddSupplierPage />}
            />
            <Route
              path="/company/suppliers/:supplierId"
              element={<SupplierProfilePage />}
            />
            <Route
              path="/company/procurement"
              element={<CompanyProcurementLayout />}
            >
              <Route index element={<CompanyProcurementDashboard />} />
              <Route
                path="requests"
                element={<CompanyPurchaseRequestsPage />}
              />
              <Route path="suppliers" element={<SuppliersPage />} />
            </Route>
            <Route
              path="/company/finance"
              element={<Placeholder title="Company finance" />}
            />
            <Route
              path="/company/reports"
              element={<Placeholder title="Company reports" />}
            />
            <Route
              path="/company/messages"
              element={<Placeholder title="Messages" />}
            />
            <Route
              path="/company/settings"
              element={<Placeholder title="Company settings" />}
            />
          </Route>

          {/* Level 2: Project workspace */}
          <Route element={<ProjectLayout />}>
            <Route
              path="/projects/:projectId/overview"
              element={<ProjectOverviewPage />}
            />
            <Route
              path="/projects/:projectId/planning"
              element={<ProjectPlanningPage />}
            />
            <Route
              path="/projects/:projectId/planning/activities/:activityId"
              element={<ActivityDetailPage />}
            />
            <Route
              path="/projects/:projectId/documents"
              element={<ProjectDocumentsPage />}
            />
            <Route
              path="/projects/:projectId/boq"
              element={<BOQDashboardPage />}
            />
            <Route
              path="/projects/:projectId/boq/list"
              element={<BOQListPage />}
            />
            <Route
              path="/projects/:projectId/boq/new"
              element={<NewBOQPage />}
            />
            <Route
              path="/projects/:projectId/boq/:boqId"
              element={<BOQDetailPage />}
            />
            <Route
              path="/projects/:projectId/boq/import"
              element={<BOQImportPage />}
            />
            <Route
              path="/projects/:projectId/budget"
              element={<BudgetWorkspacePage />}
            />
            <Route
              path="/projects/:projectId/cashflow"
              element={<CashFlowWorkspacePage />}
            />
            <Route
              path="/projects/:projectId/variations"
              element={<VariationsPage />}
            />
            <Route
              path="/projects/:projectId/variations/ipcs"
              element={<IPCListPage />}
            />
            <Route
              path="/projects/:projectId/procurement"
              element={
                <RoleGate
                  roles={PROCUREMENT_INVOLVED_ROLES}
                  sectionName="Procurement"
                >
                  <ProcurementLayout />
                </RoleGate>
              }
            >
              <Route index element={<ProcurementDashboard />} />
              <Route path="requests" element={<ProcurementPage />} />
              <Route
                path="new"
                element={
                  <RoleGate
                    roles={PROCUREMENT_CREATE_ROLES}
                    sectionName="New Purchase Request"
                  >
                    <NewPurchaseRequestPage />
                  </RoleGate>
                }
              />
              <Route
                path=":requestId"
                element={<PurchaseRequestDetailPage />}
              />
            </Route>
            <Route
              path="/projects/:projectId/inventory"
              element={<ProjectInventoryPage />}
            />
            <Route
              path="/projects/:projectId/site"
              element={<ProjectSitePage />}
            />
            <Route
              path="/projects/:projectId/team"
              element={<ProjectTeamPage />}
            />
            <Route
              path="/projects/:projectId/finance"
              element={<Placeholder title="Project finance" />}
            />
            <Route
              path="/projects/:projectId/reports"
              element={<Placeholder title="Project reports" />}
            />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
