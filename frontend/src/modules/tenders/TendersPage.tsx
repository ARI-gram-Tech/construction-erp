// /src/modules/tenders/TendersPage.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { listTenders, createReferenceTender } from "@/services/tenders";
import type { Tender, TenderStatus, TenderMode } from "@/types/tender";
import {
  FileSpreadsheet,
  Search,
  Plus,
  Upload,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const STATUS_STYLES: Record<TenderStatus, string> = {
  filed: "bg-steel-100 text-steel-600",
  opportunity: "bg-blue-50 text-blue-700",
  pricing: "bg-amber-50 text-amber-700",
  submitted: "bg-purple-50 text-purple-700",
  won: "bg-green-50 text-green-700",
  lost: "bg-red-50 text-red-700",
  withdrawn: "bg-steel-100 text-steel-500",
};

const STATUS_LABELS: Record<TenderStatus, string> = {
  filed: "Filed",
  opportunity: "Opportunity",
  pricing: "Pricing",
  submitted: "Submitted",
  won: "Won",
  lost: "Lost",
  withdrawn: "Withdrawn",
};

export function TendersPage() {
  const navigate = useNavigate();
  const { data: me } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TenderStatus | "all">("all");
  const [modeFilter, setModeFilter] = useState<TenderMode | "all">("all");
  const [showReferenceModal, setShowReferenceModal] = useState(false);

  const {
    data: tenders,
    loading,
    error,
    reload,
  } = useFetch(() => listTenders());

  const canCreateTender =
    me?.role === "qs" ||
    ["company_admin", "director", "operations_manager"].includes(
      me?.role ?? "",
    );

  const stats = useMemo(() => {
    if (!tenders) return null;
    return {
      total: tenders.length,
      active: tenders.filter((t) => t.mode === "active").length,
      won: tenders.filter((t) => t.status === "won").length,
      lost: tenders.filter((t) => t.status === "lost").length,
    };
  }, [tenders]);

  const filtered = useMemo(() => {
    if (!tenders) return [];
    let list = tenders;
    if (statusFilter !== "all")
      list = list.filter((t) => t.status === statusFilter);
    if (modeFilter !== "all") list = list.filter((t) => t.mode === modeFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.client_name.toLowerCase().includes(q),
      );
    }
    return list;
  }, [tenders, search, statusFilter, modeFilter]);

  if (loading) return <div className="text-steel-500">Loading tenders...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-steel-900">Tenders</h1>
          <p className="text-sm text-steel-500 mt-0.5">
            Pre-contract pricing and filed tender documents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReferenceModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50 transition-colors"
          >
            <Upload size={16} />
            File a Tender
          </button>
          {canCreateTender && (
            <button
              onClick={() => navigate("/company/tenders/new")}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
            >
              <Plus size={16} />
              New Tender
            </button>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-steel-200/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-steel-500">Total Tenders</p>
                <p className="text-2xl font-semibold text-steel-900 mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                <FileSpreadsheet size={20} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-steel-200/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-steel-500">Being Priced</p>
                <p className="text-2xl font-semibold text-steel-900 mt-1">
                  {stats.active}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
                <Clock size={20} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-steel-200/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-steel-500">Won</p>
                <p className="text-2xl font-semibold text-green-600 mt-1">
                  {stats.won}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 text-green-600">
                <CheckCircle2 size={20} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-steel-200/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-steel-500">Lost</p>
                <p className="text-2xl font-semibold text-red-600 mt-1">
                  {stats.lost}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 text-red-600">
                <XCircle size={20} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-steel-200/50 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-55">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or client..."
              className="w-full border border-steel-300 rounded-lg pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <select
            value={modeFilter}
            onChange={(e) =>
              setModeFilter(e.target.value as TenderMode | "all")
            }
            className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All modes</option>
            <option value="reference">Reference only</option>
            <option value="active">Active pricing</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as TenderStatus | "all")
            }
            className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            {(Object.keys(STATUS_LABELS) as TenderStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-steel-200/50 divide-y">
        {filtered.length > 0 ? (
          filtered.map((t) => <TenderRow key={t.id} tender={t} />)
        ) : (
          <div className="p-10 text-center">
            <FileSpreadsheet
              size={24}
              className="text-steel-300 mx-auto mb-2"
            />
            <p className="text-sm text-steel-500">
              {(tenders?.length ?? 0) > 0
                ? "No tenders match your search or filters."
                : "No tenders yet."}
            </p>
          </div>
        )}
      </div>

      {showReferenceModal && (
        <ReferenceUploadModal
          onClose={() => setShowReferenceModal(false)}
          onSuccess={() => {
            setShowReferenceModal(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

function TenderRow({ tender }: { tender: Tender }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/company/tenders/${tender.id}`)}
      className="p-4 flex items-center justify-between cursor-pointer hover:bg-steel-50/60 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-steel-900 truncate">
          {tender.title}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-steel-500 flex-wrap">
          <span>{tender.client_name || "No client listed"}</span>
          {tender.mode === "active" && (
            <>
              <span>•</span>
              <span>KES {Number(tender.tender_price).toLocaleString()}</span>
            </>
          )}
          {tender.assigned_qs_name && (
            <>
              <span>•</span>
              <span>{tender.assigned_qs_name}</span>
            </>
          )}
          {tender.mode === "reference" && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <FileText size={11} />
                Reference only
              </span>
            </>
          )}
        </div>
      </div>
      <span
        className={`text-xs px-2.5 py-1 rounded-full shrink-0 ml-3 ${STATUS_STYLES[tender.status]}`}
      >
        {STATUS_LABELS[tender.status]}
      </span>
    </div>
  );
}

function ReferenceUploadModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit() {
    if (!title.trim() || !file) {
      setErr("Title and file are required.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await createReferenceTender({ title, client_name: clientName, file });
      onSuccess();
    } catch {
      setErr("Failed to upload. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-steel-900">
          File a Tender Document
        </h2>
        <p className="text-sm text-steel-500">
          Just keeping this tender on record — no pricing yet. You can start
          pricing it later.
        </p>
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tender title"
            className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Client / consultant (optional)"
            className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-3.5 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {submitting ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
