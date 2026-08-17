// /src/modules/inventory/components/FilterToolbar.tsx

import { Search, Download } from "lucide-react";

interface FilterToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  movementTypeFilter?: string;
  onMovementTypeChange?: (value: string) => void;
  warehouseFilter?: string;
  onWarehouseFilterChange?: (value: string) => void;
  projectFilter?: string;
  onProjectFilterChange?: (value: string) => void;
  supplierFilter?: string;
  onSupplierFilterChange?: (value: string) => void;
  employeeFilter?: string;
  onEmployeeFilterChange?: (value: string) => void;
  dateRange?: string;
  onDateRangeChange?: (value: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  onExport?: () => void;
}

export function FilterToolbar({
  searchValue,
  onSearchChange,
  movementTypeFilter,
  onMovementTypeChange,
  warehouseFilter,
  onWarehouseFilterChange,
  projectFilter,
  onProjectFilterChange,
  supplierFilter,
  onSupplierFilterChange,
  employeeFilter,
  onEmployeeFilterChange,
  dateRange,
  onDateRangeChange,
  statusFilter,
  onStatusFilterChange,
  onExport,
}: FilterToolbarProps) {
  return (
    <div className="bg-white rounded-xl border border-steel-200/50 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400"
          />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-full border border-steel-300 rounded-lg pl-9 pr-3 py-2 text-sm"
          />
        </div>

        {onMovementTypeChange && (
          <select
            value={movementTypeFilter}
            onChange={(e) => onMovementTypeChange(e.target.value)}
            className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Types</option>
            <option value="receipt">Receipt</option>
            <option value="issue">Issue</option>
            <option value="transfer_out">Transfer Out</option>
            <option value="transfer_in">Transfer In</option>
            <option value="adjustment">Adjustment</option>
          </select>
        )}

        {onWarehouseFilterChange && (
          <select
            value={warehouseFilter}
            onChange={(e) => onWarehouseFilterChange(e.target.value)}
            className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Warehouses</option>
          </select>
        )}

        {onProjectFilterChange && (
          <select
            value={projectFilter}
            onChange={(e) => onProjectFilterChange(e.target.value)}
            className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Projects</option>
          </select>
        )}

        {onSupplierFilterChange && (
          <select
            value={supplierFilter}
            onChange={(e) => onSupplierFilterChange(e.target.value)}
            className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Suppliers</option>
          </select>
        )}

        {onEmployeeFilterChange && (
          <select
            value={employeeFilter}
            onChange={(e) => onEmployeeFilterChange(e.target.value)}
            className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Employees</option>
          </select>
        )}

        {onDateRangeChange && (
          <select
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value)}
            className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
        )}

        {onStatusFilterChange && (
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        )}

        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50 transition-colors ml-auto"
          >
            <Download size={16} />
            Export
          </button>
        )}
      </div>
    </div>
  );
}
