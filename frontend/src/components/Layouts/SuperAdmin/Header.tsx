// frontend/src/components/layouts/SuperAdmin/Header.tsx
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Bell,
  User,
  Settings,
  ChevronDown,
  Search,
} from "lucide-react";
import { useState } from "react";

export function Header() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/login");
  }

  return (
    <header className="bg-white/90 backdrop-blur-sm border-b border-steel-200/70 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
      {/* Left Section */}
      <div className="flex items-center gap-6">
        <div>
          <h1 className="font-semibold text-xl tracking-tight text-steel-900">
            Platform Overview
          </h1>
          <p className="text-sm text-steel-500 mt-0.5 flex items-center gap-2">
            <span>Manage your organization and users</span>
            <span className="w-1 h-1 rounded-full bg-steel-300" />
            <span className="text-orange-500 font-medium">Live</span>
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <button className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-steel-100/80 transition-colors text-steel-500">
          <Search size={18} />
          <span className="text-sm">Search...</span>
          <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-steel-100 rounded text-steel-500 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-steel-100/80 transition-colors">
          <Bell size={20} className="text-steel-600" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white animate-pulse" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-lg hover:bg-steel-100/80 transition-colors border border-transparent hover:border-steel-200"
          >
            <div className="h-8 w-8 rounded-full  bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-medium text-sm shadow-sm shadow-orange-500/20">
              SA
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-steel-900">Super Admin</p>
              <p className="text-xs text-steel-500">admin@arigram.com</p>
            </div>
            <ChevronDown size={16} className="text-steel-400 hidden sm:block" />
          </button>

          {/* Dropdown */}
          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-steel-200/50 py-1.5 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-steel-200/50">
                  <p className="text-sm font-medium text-steel-900">
                    Super Admin
                  </p>
                  <p className="text-xs text-steel-500">admin@arigram.com</p>
                </div>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-steel-700 hover:bg-orange-50 hover:text-orange-700 transition-colors">
                  <User size={16} className="text-steel-400" />
                  Profile
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-steel-700 hover:bg-orange-50 hover:text-orange-700 transition-colors">
                  <Settings size={16} className="text-steel-400" />
                  Settings
                </button>
                <div className="h-px bg-steel-200/50 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
