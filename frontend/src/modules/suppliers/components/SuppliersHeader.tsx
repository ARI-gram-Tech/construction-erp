import { useNavigate } from "react-router-dom";
import { Truck, Plus } from "lucide-react";

export function SuppliersHeader() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-steel-900 flex items-center gap-3">
          <div className="p-2 bg-orange-50 rounded-xl border border-orange-200/50">
            <Truck size={24} className="text-orange-500" />
          </div>
          Suppliers
        </h1>
        <p className="text-steel-500 mt-1 text-sm">
          Vendors your company buys from — shared across all projects
        </p>
      </div>
      <button
        onClick={() => navigate("/company/suppliers/new")}
        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <Plus size={18} />
        New Supplier
      </button>
    </div>
  );
}
