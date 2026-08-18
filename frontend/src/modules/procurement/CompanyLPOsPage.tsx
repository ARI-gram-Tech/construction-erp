// /frontend/src/modules/procurement/CompanyLPOsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { ProcurementOutletContext } from "./components/CompanyProcurementLayout";
import { useFetch } from "@/hooks/useFetch";
import { listAllLPOs } from "@/services/lpo";
import type { LPOStatus, LPOOrigin } from "@/types/lpo";
import { FileText, ClipboardEdit, Paperclip } from "lucide-react";

const STATUS_LABELS: Record<LPOStatus, string> = {
  awaiting_signature: "Awaiting Signature",
  signed: "Signed",
  sent: "Sent to Supplier",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<LPOStatus, string> = {
  awaiting_signature: "bg-amber-50 text-amber-700",
  signed: "bg-blue-50 text-blue-700",
  sent: "bg-green-50 text-green-700",
  fulfilled: "bg-green-50 text-green-700",
  cancelled: "bg-steel-100 text-steel-500",
};

export function CompanyLPOsPage() {
  const navigate = useNavigate();
  const { searchTerm, reloadSignal } =
    useOutletContext<ProcurementOutletContext>();

  const { data: lpos, loading, error, reload } = useFetch(() => listAllLPOs());

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadSignal]);

  const [originFilter, setOriginFilter] = useState<LPOOrigin | "all">("all");

  const filtered = useMemo(() => {
    if (!lpos) return [];
    let list = [...lpos];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(
        (l) =>
          l.code.toLowerCase().includes(term) ||
          l.supplier_name.toLowerCase().includes(term) ||
          l.project_name.toLowerCase().includes(term),
      );
    }

    if (originFilter !== "all") {
      list = list.filter((l) => l.origin === originFilter);
    }

    return list.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [lpos, searchTerm, originFilter]);

  if (loading) return <div className="text-steel-500">Loading LPOs...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["all", "generated", "manual"] as const).map((val) => (
          <button
            key={val}
            onClick={() => setOriginFilter(val)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              originFilter === val
                ? "border-orange-300 bg-orange-50 text-orange-700"
                : "border-steel-200 text-steel-600 hover:bg-steel-50"
            }`}
          >
            {val === "all"
              ? "All"
              : val === "generated"
                ? "Generated"
                : "Manually Recorded"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-steel-200/50 divide-y">
        {filtered.length > 0 ? (
          filtered.map((lpo) => (
            <div
              key={lpo.id}
              onClick={() =>
                navigate(
                  lpo.purchase_request
                    ? `/projects/${lpo.project}/procurement/${lpo.purchase_request}`
                    : `/projects/${lpo.project}/procurement`,
                )
              }
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-steel-50/60 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-steel-400">
                    {lpo.code}
                  </span>
                  {lpo.origin === "manual" ? (
                    <span className="flex items-center gap-1 text-xs text-steel-500">
                      <ClipboardEdit size={11} />
                      Manual
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-steel-500">
                      <FileText size={11} />
                      Generated
                    </span>
                  )}
                  {lpo.source_document_url && (
                    <Paperclip size={11} className="text-steel-400" />
                  )}
                </div>
                <p className="text-sm font-medium text-steel-900 mt-0.5 truncate">
                  {lpo.supplier_name}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-steel-500 flex-wrap">
                  <span>{lpo.project_name}</span>
                  <span>•</span>
                  <span>{Number(lpo.total).toLocaleString()}</span>
                </div>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full shrink-0 ml-3 ${STATUS_STYLES[lpo.status]}`}
              >
                {STATUS_LABELS[lpo.status]}
              </span>
            </div>
          ))
        ) : (
          <div className="p-10 text-center">
            <FileText size={24} className="text-steel-300 mx-auto mb-2" />
            <p className="text-sm text-steel-500">No LPOs yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
