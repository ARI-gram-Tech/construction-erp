// frontend/src/modules/projects/ProjectPlanning/components/ActivityFilters.tsx
import { useEffect, useRef, useState } from "react";
import { Search, X, SlidersHorizontal, ChevronDown } from "lucide-react";

interface ActivityFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  delayFilter: string;
  onDelayFilterChange: (value: string) => void;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "delayed", label: "Delayed" },
  { value: "completed", label: "Completed" },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
  { value: "delayed", label: "Delayed" },
  { value: "critical", label: "Critical" },
  { value: "overdue", label: "Overdue" },
];

export function ActivityFilters({
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  delayFilter,
  onDelayFilterChange,
}: ActivityFiltersProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const activeCount =
    (statusFilter !== "all" ? 1 : 0) + (delayFilter !== "all" ? 1 : 0);

  return (
    <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400"
          />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search activities..."
            className="w-full border border-steel-300 rounded-lg pl-9 pr-9 py-2 text-sm"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border transition-colors ${
              activeCount > 0
                ? "border-orange-300 text-orange-600 bg-orange-50"
                : "border-steel-200 text-steel-600 hover:bg-steel-50"
            }`}
          >
            <SlidersHorizontal size={16} />
            Filters
            {activeCount > 0 && (
              <span className="w-4.5 h-4.5 flex items-center justify-center text-[10px] font-semibold rounded-full bg-orange-500 text-white">
                {activeCount}
              </span>
            )}
            <ChevronDown
              size={14}
              className={`transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-steel-200 shadow-lg p-3 z-20">
              <p className="text-xs font-semibold text-steel-500 uppercase tracking-wide mb-2">
                Status
              </p>
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="w-full border border-steel-200 rounded-lg px-3 py-2 text-sm mb-3"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <p className="text-xs font-semibold text-steel-500 uppercase tracking-wide mb-2">
                Quick Filters
              </p>
              <div className="flex flex-col gap-1">
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onDelayFilterChange(opt.value)}
                    className={`text-left px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      delayFilter === opt.value
                        ? "bg-orange-50 text-orange-700 font-medium"
                        : "text-steel-600 hover:bg-steel-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
