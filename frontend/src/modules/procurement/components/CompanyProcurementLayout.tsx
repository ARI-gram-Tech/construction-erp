// frontend/src/modules/procurement/CompanyProcurementLayout.tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { CompanyProcurementTabs } from "./CompanyProcurementTabs";
import { CompanyProcurementHeader } from "./CompanyProcurementHeader";
import { ManualLPOModal } from "./ManualLPOModal";

export interface ProcurementOutletContext {
  setRequestCount: (count: number | null) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  hasActiveFilters: boolean;
  setHasActiveFilters: (active: boolean) => void;
  reloadSignal: number;
}

export function CompanyProcurementLayout() {
  const [requestCount, setRequestCount] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [reloadSignal, setReloadSignal] = useState(0);

  const context: ProcurementOutletContext = {
    setRequestCount,
    searchTerm,
    setSearchTerm,
    showFilters,
    setShowFilters,
    hasActiveFilters,
    setHasActiveFilters,
    reloadSignal,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Navigation Tabs */}
      <CompanyProcurementTabs />

      {/* 2. Active Tab Title & Action Header Card */}
      <CompanyProcurementHeader
        requestCount={requestCount}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        hasActiveFilters={hasActiveFilters}
        onRecordLPO={() => setShowManualModal(true)}
      />

      {/* 3. Tab Content */}
      <div>
        <Outlet context={context} />
      </div>

      {showManualModal && (
        <ManualLPOModal
          onClose={() => setShowManualModal(false)}
          onCreated={() => {
            setShowManualModal(false);
            setReloadSignal((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
