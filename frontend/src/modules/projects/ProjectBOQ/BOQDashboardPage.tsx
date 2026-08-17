// /src/modules/projects/ProjectBOQ/BOQDashboardPage.tsx

import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import { listBOQs } from "@/services/boq";
import { listDocuments, uploadDocument } from "@/services/documents";
import { DocumentViewerModal } from "@/components/DocumentViewerModal";
import { BOQ_STATUS_LABELS } from "@/types/boq";
import {
  BarChart3,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  FileStack,
  Plus,
  Upload,
} from "lucide-react";

type BOQWorkspaceTab = "overview" | "boqs" | "references";

const TABS: {
  key: BOQWorkspaceTab;
  label: string;
  icon: React.ElementType;
}[] = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "boqs", label: "BOQs", icon: ClipboardList },
  { key: "references", label: "References", icon: FileStack },
];

const TAB_TITLE: Record<
  BOQWorkspaceTab,
  { title: string; description: string; icon: React.ElementType }
> = {
  overview: {
    title: "BOQ Workspace",
    description: "Manage Bills of Quantities for this project",
    icon: BarChart3,
  },
  boqs: {
    title: "BOQs",
    description: "View and manage all structured BOQs",
    icon: ClipboardList,
  },
  references: {
    title: "Reference Documents",
    description: "Stored BOQ files that are not linked to cost tracking",
    icon: FileStack,
  },
};

function BOQWorkspaceTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: BOQWorkspaceTab;
  onTabChange: (tab: BOQWorkspaceTab) => void;
}) {
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

function StatusBadge({ status }: { status: keyof typeof BOQ_STATUS_LABELS }) {
  const className =
    status === "active"
      ? "bg-green-50 text-green-700"
      : status === "draft"
        ? "bg-steel-100 text-steel-600"
        : "bg-steel-100 text-steel-500";

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${className}`}>
      {BOQ_STATUS_LABELS[status]}
    </span>
  );
}

export function BOQDashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = Number(projectId);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<BOQWorkspaceTab>("overview");
  const { data: boqs, loading, error } = useFetch(() => listBOQs(pid), [pid]);

  const { data: allDocuments, reload: reloadDocuments } = useFetch(
    () => listDocuments({ project: pid }),
    [pid],
  );
  const referenceDocuments = useMemo(
    () => (allDocuments ?? []).filter((d) => d.category === "boq"),
    [allDocuments],
  );

  const [viewing, setViewing] = useState<{ url: string; name: string } | null>(
    null,
  );

  const referenceInputRef = useRef<HTMLInputElement>(null);
  const [uploadingReference, setUploadingReference] = useState(false);
  const [referenceError, setReferenceError] = useState("");

  async function handleReferenceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReferenceError("");
    setUploadingReference(true);
    try {
      await uploadDocument({
        name: file.name,
        category: "boq",
        project: pid,
        file,
      });
      reloadDocuments();
      setActiveTab("references");
    } catch (err: any) {
      setReferenceError(
        err?.response?.data?.detail || "Upload failed. Please try again.",
      );
    } finally {
      setUploadingReference(false);
      if (referenceInputRef.current) referenceInputRef.current.value = "";
    }
  }

  const stats = {
    total: boqs?.length || 0,
    draft: boqs?.filter((b) => b.status === "draft").length || 0,
    active: boqs?.filter((b) => b.status === "active").length || 0,
    totalAmount: boqs?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0,
  };

  const recentBOQs = boqs?.slice(0, 5) || [];
  const { title, description, icon: TitleIcon } = TAB_TITLE[activeTab];

  if (loading) return <div className="text-steel-500">Loading BOQs...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  const renderHeaderActions = () => (
    <div className="flex items-center gap-2 flex-wrap">
      {activeTab !== "references" && (
        <Link
          to={`/projects/${pid}/boq/import`}
          className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50"
        >
          <Upload size={16} /> Import BOQ
        </Link>
      )}
      <button
        onClick={() => referenceInputRef.current?.click()}
        disabled={uploadingReference}
        className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50 disabled:opacity-60"
      >
        <FileStack size={16} />
        {uploadingReference ? "Uploading..." : "Reference Only"}
      </button>
      <Link
        to={`/projects/${pid}/boq/new`}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600"
      >
        <Plus size={16} /> New BOQ
      </Link>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-steel-200/50 p-4">
          <p className="text-xs text-steel-400">Total BOQs</p>
          <p className="text-2xl font-semibold text-steel-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-steel-200/50 p-4">
          <p className="text-xs text-steel-400">Total Value</p>
          <p className="text-2xl font-semibold text-steel-900">
            KES {stats.totalAmount.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-steel-200/50 p-4">
          <p className="text-xs text-steel-400">Active</p>
          <p className="text-2xl font-semibold text-green-600">
            {stats.active}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-steel-200/50 p-4">
          <p className="text-xs text-steel-400">Draft</p>
          <p className="text-2xl font-semibold text-steel-600">{stats.draft}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          to={`/projects/${pid}/boq/new`}
          className="bg-white rounded-xl border border-steel-200/50 p-4 hover:shadow-sm transition-shadow flex items-center gap-3"
        >
          <FileSpreadsheet size={20} className="text-steel-400" />
          <div>
            <p className="text-sm font-medium text-steel-900">
              Create Manually
            </p>
            <p className="text-xs text-steel-500">Build from scratch</p>
          </div>
        </Link>

        <Link
          to={`/projects/${pid}/boq/import`}
          className="bg-white rounded-xl border border-steel-200/50 p-4 hover:shadow-sm transition-shadow flex items-center gap-3"
        >
          <Upload size={20} className="text-steel-400" />
          <div>
            <p className="text-sm font-medium text-steel-900">Import</p>
            <p className="text-xs text-steel-500">Excel, PDF, or AI</p>
          </div>
        </Link>

        <button
          onClick={() => referenceInputRef.current?.click()}
          disabled={uploadingReference}
          className="bg-white rounded-xl border border-steel-200/50 p-4 hover:shadow-sm transition-shadow flex items-center gap-3 text-left disabled:opacity-60"
        >
          <FileStack size={20} className="text-steel-400" />
          <div>
            <p className="text-sm font-medium text-steel-900">
              {uploadingReference ? "Uploading..." : "Reference Only"}
            </p>
            <p className="text-xs text-steel-500">
              Just store the file, no cost tracking
            </p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("boqs")}
          className="bg-white rounded-xl border border-steel-200/50 p-4 hover:shadow-sm transition-shadow flex items-center gap-3 text-left"
        >
          <ClipboardList size={20} className="text-steel-400" />
          <div>
            <p className="text-sm font-medium text-steel-900">All BOQs</p>
            <p className="text-xs text-steel-500">
              View all {stats.total} BOQs
            </p>
          </div>
        </button>
      </div>

      <BOQListCard
        title="Recent BOQs"
        boqs={recentBOQs}
        emptyText="No BOQs yet. Create one, import an existing file, or upload one as a reference document."
        onViewAll={() => setActiveTab("boqs")}
        onOpenBOQ={(boqId) => navigate(`/projects/${pid}/boq/${boqId}`)}
      />
    </div>
  );

  const renderBOQs = () => (
    <BOQListCard
      title="All BOQs"
      boqs={boqs ?? []}
      emptyText="No BOQs yet for this project."
      onOpenBOQ={(boqId) => navigate(`/projects/${pid}/boq/${boqId}`)}
    />
  );

  const renderReferences = () => (
    <div className="bg-white rounded-xl border border-steel-200/50">
      <div className="px-5 py-3 border-b border-steel-200/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-steel-900">
          Reference Documents
        </h3>
        <span className="text-xs text-steel-400">
          Stored only - not linked to cost tracking
        </span>
      </div>
      {referenceDocuments.length > 0 ? (
        <div className="divide-y">
          {referenceDocuments.map((doc) => (
            <div
              key={doc.id}
              className="px-5 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileStack size={16} className="text-steel-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-steel-900 truncate">
                    {doc.name}
                  </p>
                  <p className="text-xs text-steel-500">
                    {doc.uploaded_by_name && `${doc.uploaded_by_name} - `}
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {doc.latest_version && (
                <button
                  onClick={() =>
                    setViewing({
                      url: doc.latest_version!.file,
                      name: doc.name,
                    })
                  }
                  className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 shrink-0"
                >
                  <Eye size={14} />
                  View
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center">
          <FileStack size={32} className="text-steel-300 mx-auto mb-2" />
          <p className="text-sm text-steel-500">
            No reference BOQ documents uploaded yet.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <input
        ref={referenceInputRef}
        type="file"
        accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg"
        onChange={handleReferenceUpload}
        className="hidden"
      />

      <BOQWorkspaceTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-steel-900 flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-xl border border-orange-200/50">
                <TitleIcon size={24} className="text-orange-500" />
              </div>
              {title}
            </h1>
            <p className="text-sm text-steel-500 mt-1 sm:ml-13">
              {description}
            </p>
          </div>
          {renderHeaderActions()}
        </div>
      </div>

      {referenceError && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
          {referenceError}
        </div>
      )}

      {activeTab === "overview" && renderOverview()}
      {activeTab === "boqs" && renderBOQs()}
      {activeTab === "references" && renderReferences()}

      {viewing && (
        <DocumentViewerModal
          fileUrl={viewing.url}
          fileName={viewing.name}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

function BOQListCard({
  title,
  boqs,
  emptyText,
  onViewAll,
  onOpenBOQ,
}: {
  title: string;
  boqs: NonNullable<Awaited<ReturnType<typeof listBOQs>>>;
  emptyText: string;
  onViewAll?: () => void;
  onOpenBOQ: (boqId: number) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-steel-200/50">
      <div className="px-5 py-3 border-b border-steel-200/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-steel-900">{title}</h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs text-orange-600 hover:text-orange-700"
          >
            View all -
          </button>
        )}
      </div>
      {boqs.length > 0 ? (
        <div className="divide-y">
          {boqs.map((boq) => (
            <div
              key={boq.id}
              onClick={() => onOpenBOQ(boq.id)}
              className="px-5 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-steel-50/60 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-steel-900 truncate">
                  {boq.title}
                </p>
                <p className="text-xs text-steel-500">
                  {boq.item_count} item{boq.item_count === 1 ? "" : "s"} -{" "}
                  {boq.currency} {Number(boq.total_amount).toLocaleString()}
                  {boq.created_by_name && ` - by ${boq.created_by_name}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-steel-500">
                  {boq.health_label}
                </span>
                <StatusBadge status={boq.status} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center">
          <FileSpreadsheet size={32} className="text-steel-300 mx-auto mb-2" />
          <p className="text-sm text-steel-500">{emptyText}</p>
        </div>
      )}
    </div>
  );
}
