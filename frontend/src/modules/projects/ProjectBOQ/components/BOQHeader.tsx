// frontend/src/modules/projects/ProjectBOQ/components/BOQHeader.tsx
import {
  LayoutDashboard,
  Layers,
  List,
  History,
  Plus,
  FolderPlus,
  Copy,
  Upload,
} from "lucide-react";
import type { BOQ } from "@/types/boq";
import { BOQ_STATUS_LABELS } from "@/types/boq";
import type { BOQTab } from "./BOQNav";

interface BOQHeaderProps {
  boq: BOQ;
  activeTab: BOQTab;
  onAddSection: () => void;
  onAddItem: () => void;
  onNewRevision: () => void;
  onDuplicate: () => void;
  onImport: () => void;
  busy: boolean;
}

const TITLE_BY_TAB: Record<BOQTab, { label: string; icon: React.ElementType }> =
  {
    overview: { label: "Overview", icon: LayoutDashboard },
    sections: { label: "Sections", icon: Layers },
    items: { label: "Items", icon: List },
    revisions: { label: "Revisions", icon: History },
  };

export function BOQHeader({
  boq,
  activeTab,
  onAddSection,
  onAddItem,
  onNewRevision,
  onDuplicate,
  onImport,
  busy,
}: BOQHeaderProps) {
  const { label: title, icon: TitleIcon } = TITLE_BY_TAB[activeTab];

  const tabAction =
    activeTab === "sections"
      ? { label: "Add Section", icon: FolderPlus, onClick: onAddSection }
      : activeTab === "items"
        ? { label: "Add Item", icon: Plus, onClick: onAddItem }
        : activeTab === "revisions"
          ? { label: "New Revision", icon: History, onClick: onNewRevision }
          : undefined;

  return (
    <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-steel-900 flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl border border-orange-200/50">
              <TitleIcon size={24} className="text-orange-500" />
            </div>
            {title}
          </h1>
          <p className="text-sm text-steel-500 mt-1 ml-13">
            {boq.title} · {boq.currency}{" "}
            {Number(boq.total_amount).toLocaleString()} · {boq.item_count} item
            {boq.item_count === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-3 py-1.5 rounded-full bg-steel-100 text-steel-600 font-medium">
            {BOQ_STATUS_LABELS[boq.status]}
          </span>

          {activeTab === "items" && (
            <button
              onClick={onImport}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-steel-200 text-steel-700 hover:bg-steel-50 transition-colors"
            >
              <Upload size={16} />
              Import
            </button>
          )}

          <button
            onClick={onDuplicate}
            disabled={busy}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-steel-200 text-steel-700 hover:bg-steel-50 transition-colors disabled:opacity-50"
          >
            <Copy size={16} />
            Duplicate
          </button>

          {tabAction && (
            <button
              onClick={tabAction.onClick}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <tabAction.icon size={18} />
              {tabAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
