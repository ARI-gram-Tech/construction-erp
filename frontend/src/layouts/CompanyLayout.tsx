// frontend/src/layouts/CompanyLayout.tsx
import { Outlet } from "react-router-dom";
import { CompanySidebar } from "@/components/Layouts/Company/Sidebar";
import { CompanyHeader } from "@/components/Layouts/Company/CompanyHeader";
import { useFetch } from "@/hooks/useFetch";
import { getMyCompany } from "@/services/companies";
import { PasswordGateway } from "@/components/PasswordGateway";

export function CompanyLayout() {
  const { data: company, loading } = useFetch(() => getMyCompany());

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-steel-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
          <p className="text-sm text-steel-500">Loading company...</p>
        </div>
      </div>
    );
  }

  return (
    <PasswordGateway>
      <div className="min-h-screen flex bg-linear-to-br from-steel-50 via-white to-steel-50/80">
        <CompanySidebar company={company ?? null} />
        <div className="flex-1 flex flex-col min-h-screen">
          <CompanyHeader company={company ?? null} />
          <main className="flex-1 p-8">
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </PasswordGateway>
  );
}
