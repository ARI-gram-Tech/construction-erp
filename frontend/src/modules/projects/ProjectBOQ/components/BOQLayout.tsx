// frontend/src/modules/projects/ProjectBOQ/components/BOQLayout.tsx
import type { ReactNode } from "react";
import type { BOQ } from "@/types/boq";
import { BOQNav, type BOQTab } from "./BOQNav";
import { BOQHeader } from "./BOQHeader";

interface BOQLayoutProps {
  boq: BOQ;
  activeTab: BOQTab;
  onTabChange: (tab: BOQTab) => void;
  onAddSection: () => void;
  onAddItem: () => void;
  onNewRevision: () => void;
  onDuplicate: () => void;
  onImport: () => void;
  busy: boolean;
  children: ReactNode;
}

export function BOQLayout({
  boq,
  activeTab,
  onTabChange,
  onAddSection,
  onAddItem,
  onNewRevision,
  onDuplicate,
  onImport,
  busy,
  children,
}: BOQLayoutProps) {
  return (
    <div className="space-y-6">
      <BOQNav activeTab={activeTab} onTabChange={onTabChange} />
      <BOQHeader
        boq={boq}
        activeTab={activeTab}
        onAddSection={onAddSection}
        onAddItem={onAddItem}
        onNewRevision={onNewRevision}
        onDuplicate={onDuplicate}
        onImport={onImport}
        busy={busy}
      />
      {children}
    </div>
  );
}
