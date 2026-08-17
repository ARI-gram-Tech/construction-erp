// /src/modules/tenders/TenderDetailPage.tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  getTender,
  promoteTender,
  submitTender,
  recordTenderOutcome,
  convertTenderToProject,
  startPricing,
} from "@/services/tenders";
import type { LossReason } from "@/types/tender";
import { TenderItemsTab } from "./components/TenderItemsTab";
import { TenderImportTab } from "./components/TenderImportTab";
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Calendar,
  User,
  Upload,
  Send,
  Trophy,
  XCircle,
  ArrowRightCircle,
} from "lucide-react";

type Tab = "overview" | "items" | "import";

const STATUS_STYLES: Record<string, string> = {
  filed: "bg-steel-100 text-steel-600",
  opportunity: "bg-blue-50 text-blue-700",
  pricing: "bg-amber-50 text-amber-700",
  submitted: "bg-purple-50 text-purple-700",
  won: "bg-green-50 text-green-700",
  lost: "bg-red-50 text-red-700",
  withdrawn: "bg-steel-100 text-steel-500",
};

const HEALTH_LABELS: Record<string, string> = {
  reference_only: "🔴 Reference Only",
  not_started: "⚪ Not Started",
  needs_review: "🟡 Needs Review",
  ready: "🟢 Ready",
};

export function TenderDetailPage() {
  const { tenderId } = useParams<{ tenderId: string }>();
  const id = Number(tenderId);
  const navigate = useNavigate();
  const { data: me } = useCurrentUser();

  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState<
    "won" | "lost" | null
  >(null);
  const [showConvertModal, setShowConvertModal] = useState(false);

  const {
    data: tender,
    loading,
    error,
    reload,
  } = useFetch(() => getTender(id), [id]);

  const canManage =
    me?.role === "qs" ||
    ["company_admin", "director", "operations_manager"].includes(
      me?.role ?? "",
    );

  async function handlePromote() {
    setBusy(true);
    try {
      await promoteTender(id);
      reload();
    } finally {
      setBusy(false);
    }
  }

  async function handleStartPricing() {
    setBusy(true);
    try {
      await startPricing(id);
      reload();
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    setBusy(true);
    try {
      await submitTender(id);
      reload();
    } finally {
      setBusy(false);
    }
  }

  async function handleConvert(payload: {
    project_name?: string;
    start_date?: string | null;
  }) {
    setBusy(true);
    try {
      await convertTenderToProject(id, payload);
      reload();
      setShowConvertModal(false);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-steel-500">Loading tender...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!tender) return null;

  const tabs = [
    { key: "overview", label: "Overview", icon: FileSpreadsheet },
    { key: "items", label: "Line Items", icon: FileText },
    { key: "import", label: "Import", icon: Upload },
  ] as const;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/company/tenders")}
        className="inline-flex items-center gap-1.5 text-sm text-steel-500 hover:text-steel-800 transition-colors"
      >
        <ArrowLeft size={14} />
        Tenders
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-steel-200/70 overflow-hidden">
        <div className="px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={20} className="text-orange-500" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-steel-900 truncate">
                {tender.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-steel-500">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLES[tender.status]}`}
                >
                  {tender.status}
                </span>
                <span>•</span>
                <span>{HEALTH_LABELS[tender.health]}</span>
                {tender.client_name && (
                  <>
                    <span>•</span>
                    <span>{tender.client_name}</span>
                  </>
                )}
                {tender.closing_date && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      Closes{" "}
                      {new Date(tender.closing_date).toLocaleDateString()}
                    </span>
                  </>
                )}
                {tender.assigned_qs_name && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <User size={12} />
                      {tender.assigned_qs_name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status-driven actions */}
          {canManage && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {tender.mode === "reference" && (
                <button
                  onClick={handlePromote}
                  disabled={busy}
                  className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50"
                >
                  <ArrowRightCircle size={16} />
                  Start Pricing
                </button>
              )}

              {tender.mode === "active" && tender.status === "opportunity" && (
                <button
                  onClick={handleStartPricing}
                  disabled={busy}
                  className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50"
                >
                  <ArrowRightCircle size={16} />
                  Move to Pricing
                </button>
              )}

              {tender.mode === "active" && tender.status === "pricing" && (
                <button
                  onClick={handleSubmit}
                  disabled={busy || tender.boq_item_count === 0}
                  className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-purple-500 hover:bg-purple-600 text-white transition-colors disabled:opacity-50"
                  title={
                    tender.boq_item_count === 0
                      ? "Add at least one line item before submitting"
                      : undefined
                  }
                >
                  <Send size={16} />
                  Submit Tender
                </button>
              )}
              {((tender.mode === "active" && tender.status === "submitted") ||
                (tender.mode === "reference" && tender.status === "filed")) && (
                <>
                  <button
                    onClick={() => setShowOutcomeModal("won")}
                    disabled={busy}
                    className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50"
                  >
                    <Trophy size={16} />
                    Mark Won
                  </button>
                  <button
                    onClick={() => setShowOutcomeModal("lost")}
                    disabled={busy}
                    className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    Mark Lost
                  </button>
                </>
              )}
              {tender.status === "won" && !tender.converted_project && (
                <button
                  onClick={() => setShowConvertModal(true)}
                  disabled={busy}
                  className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50"
                >
                  <ArrowRightCircle size={16} />
                  Convert to Project
                </button>
              )}
              {tender.converted_project && (
                <button
                  onClick={() =>
                    navigate(`/projects/${tender.converted_project}/overview`)
                  }
                  className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50 transition-colors"
                >
                  View Project
                </button>
              )}
            </div>
          )}
        </div>

        {/* Reference document link */}
        {tender.reference_document_url && (
          <div className="px-6 py-3 border-t border-steel-200/50 bg-steel-50/50">
            <a
              href={tender.reference_document_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700"
            >
              <FileText size={14} />
              View filed tender document
            </a>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-steel-200/70 px-6">
        <div className="flex gap-6 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative flex items-center gap-1.5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === key
                  ? "text-steel-900"
                  : "text-steel-500 hover:text-steel-800"
              }`}
            >
              <Icon size={14} />
              {label}
              {tab === key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && <TenderOverviewTab tender={tender} />}
      {tab === "items" && (
        <TenderItemsTab
          tenderId={id}
          canEdit={canManage && tender.mode === "active"}
          onChanged={reload}
        />
      )}
      {tab === "import" && (
        <TenderImportTab
          tenderId={id}
          canEdit={canManage && tender.mode === "active"}
          onImported={reload}
        />
      )}

      {showOutcomeModal && (
        <RecordOutcomeModal
          outcome={showOutcomeModal}
          onClose={() => setShowOutcomeModal(null)}
          onSubmit={async (loss_reason, loss_notes) => {
            setBusy(true);
            try {
              await recordTenderOutcome(id, {
                outcome: showOutcomeModal,
                loss_reason: loss_reason as LossReason,
                loss_notes,
              });
              reload();
              setShowOutcomeModal(null);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      {showConvertModal && (
        <ConvertToProjectModal
          defaultName={tender.title}
          onClose={() => setShowConvertModal(false)}
          onSubmit={handleConvert}
          busy={busy}
        />
      )}
    </div>
  );
}

function TenderOverviewTab({
  tender,
}: {
  tender: import("@/types/tender").Tender;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white rounded-xl border border-steel-200/50 p-5">
        <p className="text-sm text-steel-500">Direct Cost (BOQ Total)</p>
        <p className="text-2xl font-semibold text-steel-900 mt-1">
          KES {Number(tender.boq_total).toLocaleString()}
        </p>
        <p className="text-xs text-steel-400 mt-1">
          {tender.boq_item_count} line item
          {tender.boq_item_count === 1 ? "" : "s"}
        </p>
      </div>
      <div className="bg-white rounded-xl border border-steel-200/50 p-5">
        <p className="text-sm text-steel-500">Overheads + Risk</p>
        <p className="text-2xl font-semibold text-steel-900 mt-1">
          KES{" "}
          {(
            Number(tender.overheads_amount) + Number(tender.risk_amount)
          ).toLocaleString()}
        </p>
        <p className="text-xs text-steel-400 mt-1">
          Profit margin: {Number(tender.profit_percent)}%
        </p>
      </div>
      <div className="bg-white rounded-xl border border-orange-200 orange-50/40 p-5">
        <p className="text-sm text-orange-700">Tender Price</p>
        <p className="text-2xl font-semibold text-orange-700 mt-1">
          KES {Number(tender.tender_price).toLocaleString()}
        </p>
        {tender.submitted_price && (
          <p className="text-xs text-steel-500 mt-1">
            Submitted at KES {Number(tender.submitted_price).toLocaleString()}
          </p>
        )}
      </div>

      {tender.status === "lost" && tender.loss_reason && (
        <div className="sm:col-span-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <span className="font-medium">Loss reason:</span> {tender.loss_reason}
          {tender.loss_notes && <p className="mt-1">{tender.loss_notes}</p>}
        </div>
      )}
    </div>
  );
}

function RecordOutcomeModal({
  outcome,
  onClose,
  onSubmit,
}: {
  outcome: "won" | "lost";
  onClose: () => void;
  onSubmit: (lossReason: string, lossNotes: string) => void;
}) {
  const [lossReason, setLossReason] = useState("price");
  const [lossNotes, setLossNotes] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-steel-900">
          {outcome === "won" ? "Mark tender as Won" : "Mark tender as Lost"}
        </h2>
        {outcome === "lost" && (
          <>
            <select
              value={lossReason}
              onChange={(e) => setLossReason(e.target.value)}
              className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="price">Price too high</option>
              <option value="technical">Technical score</option>
              <option value="late">Late submission</option>
              <option value="disqualified">Failed qualification</option>
              <option value="cancelled">Client cancelled</option>
              <option value="other">Other / unknown</option>
            </select>
            <textarea
              value={lossNotes}
              onChange={(e) => setLossNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              rows={3}
              className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
            />
          </>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(lossReason, lossNotes)}
            className={`px-3.5 py-2 text-sm font-medium rounded-lg text-white ${
              outcome === "won"
                ? "bg-green-500 hover:bg-green-600"
                : "bg-red-500 hover:bg-red-600"
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function ConvertToProjectModal({
  defaultName,
  onClose,
  onSubmit,
  busy,
}: {
  defaultName: string;
  onClose: () => void;
  onSubmit: (payload: {
    project_name?: string;
    start_date?: string | null;
  }) => void;
  busy: boolean;
}) {
  const [projectName, setProjectName] = useState(defaultName);
  const [startDate, setStartDate] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-steel-900">
          Convert to Project
        </h2>
        <p className="text-sm text-steel-500">
          Creates a new project and moves this tender's priced line items into
          its BOQ.
        </p>
        <div className="space-y-3">
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project name"
            className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSubmit({
                project_name: projectName,
                start_date: startDate || null,
              })
            }
            disabled={busy}
            className="px-3.5 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {busy ? "Converting..." : "Convert"}
          </button>
        </div>
      </div>
    </div>
  );
}
