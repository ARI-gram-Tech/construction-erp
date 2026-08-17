// frontend/src/modules/projects/ProjectBOQ/components/BOQNav.tsx
import { LayoutDashboard, Layers, List, History } from "lucide-react";

export type BOQTab = "overview" | "sections" | "items" | "revisions";

const TABS: { key: BOQTab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "sections", label: "Sections", icon: Layers },
  { key: "items", label: "Items", icon: List },
  { key: "revisions", label: "Revisions", icon: History },
];

interface BOQNavProps {
  activeTab: BOQTab;
  onTabChange: (tab: BOQTab) => void;
}

export function BOQNav({ activeTab, onTabChange }: BOQNavProps) {
  return (
    <div className="border-b border-steel-200/50 flex gap-6 overflow-x-auto">
      {TABS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onTabChange(key)}
          className={`pb-3 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === key
              ? "border-orange-500 text-steel-900"
              : "border-transparent text-steel-500 hover:text-steel-700"
          }`}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}
