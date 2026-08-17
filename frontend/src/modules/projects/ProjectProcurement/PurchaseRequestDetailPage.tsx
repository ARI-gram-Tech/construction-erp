// modules/projects/ProjectProcurement/PurchaseRequestDetailPage.tsx
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  getPurchaseRequest,
  submitPurchaseRequest,
  cancelPurchaseRequest,
  approvePurchaseRequest,
  rejectPurchaseRequest,
} from "@/services/purchaseRequests";
import type { PRStatus } from "@/types/purchaseRequest";
import { ArrowLeft, Check, X, Send, Ban, Truck } from "lucide-react";
import { RecordDeliveryModal } from "./components/RecordDeliveryModal";
import { LPOSection } from "./components/LPOSection";
import { getLPOByPurchaseRequest } from "@/services/lpo";

const STATUS_STYLES: Record<PRStatus, string> = {
  draft: "bg-steel-100 text-steel-600",
  pending_tier1: "bg-amber-50 text-amber-700",
  pending_tier2: "bg-amber-50 text-amber-700",
  pending_tier3: "bg-amber-50 text-amber-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  cancelled: "bg-steel-100 text-steel-500",
};

const STATUS_LABELS: Record<PRStatus, string> = {
  draft: "Draft",
  pending_tier1: "Pending Project Manager Approval",
  pending_tier2: "Pending Procurement Manager Approval",
  pending_tier3: "Pending Director Approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-steel-500">{label}</p>
      <p className="text-sm text-steel-900 mt-0.5">{value || "—"}</p>
    </div>
  );
}

export function PurchaseRequestDetailPage() {
  const { projectId, requestId } = useParams<{
    projectId: string;
    requestId: string;
  }>();
  const pid = Number(projectId);
  const rid = Number(requestId);

  const {
    data: pr,
    loading,
    error,
    reload,
  } = useFetch(() => getPurchaseRequest(pid, rid), [pid, rid]);
  const { data: me } = useCurrentUser();
  const { data: lpo, reload: reloadLPO } = useFetch(
    () => getLPOByPurchaseRequest(rid),
    [rid, pr?.status],
  );

  const [comment, setComment] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  async function runAction(fn: () => Promise<unknown>) {
    setActionError("");
    setBusy(true);
    try {
      await fn();
      setComment("");
      reload();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.detail || "That action couldn't be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-steel-500">Loading request...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!pr) return null;

  const isRequester = me?.id === pr.requested_by;
  const isCompanyAdmin = me?.role === "company_admin";
  // Client-side hints only — the backend is the real authority and will
  // reject the action if the user isn't actually eligible (e.g. not the
  // PM assigned to this specific project).
  const canActTier1 =
    (me?.role === "project_manager" || isCompanyAdmin) &&
    pr.status === "pending_tier1";
  const canActTier2 =
    (me?.role === "procurement_manager" || isCompanyAdmin) &&
    pr.status === "pending_tier2";
  const canActTier3 =
    (me?.role === "director" || isCompanyAdmin) &&
    pr.status === "pending_tier3";
  const canSubmit = (isRequester || isCompanyAdmin) && pr.status === "draft";
  const canCancel =
    (isRequester || isCompanyAdmin) &&
    ["draft", "pending_tier1", "pending_tier2", "pending_tier3"].includes(
      pr.status,
    );
  // Client-side hint only, same as the tier checks above — the backend's
  // can_record_delivery is the real gate. record_delivery only accepts
  // status='approved', so the button is pointless to show otherwise.
  const canRecordDelivery =
    (me?.role === "procurement_manager" ||
      me?.role === "procurement" ||
      isCompanyAdmin) &&
    pr.status === "approved";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          to={`/projects/${pid}/procurement`}
          className="inline-flex items-center gap-1.5 text-sm text-steel-500 hover:text-steel-700 mb-2"
        >
          <ArrowLeft size={14} />
          Back to Purchase Requests
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-steel-500 font-mono">{pr.code}</p>
            <h1 className="text-2xl font-semibold text-steel-900">
              {pr.title}
            </h1>
            <p className="text-steel-500 text-sm">
              Requested by {pr.requested_by_name || "—"}
              {pr.priority === "urgent" && (
                <span className="text-red-600 font-medium"> · Urgent</span>
              )}
            </p>
          </div>
          <span
            className={`text-xs px-3 py-1.5 rounded-full font-medium ${STATUS_STYLES[pr.status]}`}
          >
            {STATUS_LABELS[pr.status]}
          </span>
        </div>
      </div>

      {actionError && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
          {actionError}
        </div>
      )}

      <div className="bg-white rounded-xl border border-steel-200/50 p-5 grid grid-cols-2 gap-4">
        <InfoRow label="Required by" value={pr.required_date} />
        <InfoRow
          label="Estimated total"
          value={
            Number(pr.estimated_total) > 0
              ? Number(pr.estimated_total).toLocaleString()
              : null
          }
        />
        <div className="col-span-2">
          <InfoRow label="Reason" value={pr.reason} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-steel-200/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-steel-500 border-b border-steel-200/50">
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Unit</th>
              <th className="px-4 py-3 font-medium">Est. Unit Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100">
            {pr.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-steel-900">
                  {item.description}
                  {item.notes && (
                    <span className="block text-xs text-steel-400">
                      {item.notes}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-steel-600">{item.quantity}</td>
                <td className="px-4 py-3 text-steel-600">{item.unit || "—"}</td>
                <td className="px-4 py-3 text-steel-600">
                  {item.estimated_unit_cost != null
                    ? Number(item.estimated_unit_cost).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LPOSection pr={pr} lpo={lpo ?? null} onChange={reloadLPO} />

      {(pr.tier1_decision || pr.tier2_decision || pr.tier3_decision) && (
        <div className="bg-white rounded-xl border border-steel-200/50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-steel-900">
            Approval Trail
          </h2>
          {pr.tier1_decision && (
            <div className="text-sm">
              <span className="font-medium text-steel-900">
                Tier 1 ({pr.tier1_approver_name}):
              </span>{" "}
              <span
                className={
                  pr.tier1_decision === "approved"
                    ? "text-green-700"
                    : "text-red-700"
                }
              >
                {pr.tier1_decision}
              </span>
              {pr.tier1_comment && (
                <p className="text-steel-500 text-xs mt-1">
                  "{pr.tier1_comment}"
                </p>
              )}
            </div>
          )}
          {pr.tier2_decision && (
            <div className="text-sm">
              <span className="font-medium text-steel-900">
                Tier 2 ({pr.tier2_approver_name}):
              </span>{" "}
              <span
                className={
                  pr.tier2_decision === "approved"
                    ? "text-green-700"
                    : "text-red-700"
                }
              >
                {pr.tier2_decision}
              </span>
              {pr.tier2_comment && (
                <p className="text-steel-500 text-xs mt-1">
                  "{pr.tier2_comment}"
                </p>
              )}
            </div>
          )}
          {pr.tier3_decision && (
            <div className="text-sm">
              <span className="font-medium text-steel-900">
                Tier 3 — Director ({pr.tier3_approver_name}):
              </span>{" "}
              <span
                className={
                  pr.tier3_decision === "approved"
                    ? "text-green-700"
                    : "text-red-700"
                }
              >
                {pr.tier3_decision}
              </span>
              {pr.tier3_comment && (
                <p className="text-steel-500 text-xs mt-1">
                  "{pr.tier3_comment}"
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {(canActTier1 ||
        canActTier2 ||
        canActTier3 ||
        canSubmit ||
        canCancel) && (
        <div className="bg-white rounded-xl border border-steel-200/50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-steel-900">Actions</h2>

          {(canActTier1 || canActTier2 || canActTier3) && (
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional comment for your decision..."
              className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
              rows={2}
            />
          )}

          <div className="flex flex-wrap gap-2">
            {canSubmit && (
              <button
                disabled={busy}
                onClick={() => runAction(() => submitPurchaseRequest(pid, rid))}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
              >
                <Send size={14} />
                Submit for Approval
              </button>
            )}
            {(canActTier1 || canActTier2 || canActTier3) && (
              <>
                <button
                  disabled={busy}
                  onClick={() =>
                    runAction(() => approvePurchaseRequest(pid, rid, comment))
                  }
                  className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <Check size={14} />
                  Approve
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    runAction(() => rejectPurchaseRequest(pid, rid, comment))
                  }
                  className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <X size={14} />
                  Reject
                </button>
              </>
            )}
            {canCancel && (
              <button
                disabled={busy}
                onClick={() => {
                  if (confirm("Cancel this purchase request?")) {
                    runAction(() => cancelPurchaseRequest(pid, rid));
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50 disabled:opacity-50"
              >
                <Ban size={14} />
                Cancel Request
              </button>
            )}
            {canRecordDelivery && (
              <button
                onClick={() => setShowDeliveryModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                <Truck size={14} />
                Record Delivery
              </button>
            )}
          </div>
        </div>
      )}

      <RecordDeliveryModal
        isOpen={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        onSuccess={reload}
        projectId={pid}
        pr={pr}
      />
    </div>
  );
}
