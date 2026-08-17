// frontend/src/layouts/SuperAdminLayout.tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Layouts/SuperAdmin/Sidebar";
import { Header } from "@/components/Layouts/SuperAdmin/Header";
import { PasswordGateway } from "@/components/PasswordGateway";

export function SuperAdminLayout() {
  return (
    <PasswordGateway>
      <div className="min-h-screen flex bg-linear-to-r from-steel-50 via-white to-steel-50/80">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <Header />
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
