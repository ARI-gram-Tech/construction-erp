// frontend/src/modules/projects/ProjectProcurement/components/LPOSection.tsx
import { useRef, useState } from "react";
import {
  FileText,
  Send,
  Upload,
  CheckCircle2,
  Download,
  Building2,
} from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { listSuppliers } from "@/services/suppliers";
import {
  generateLPO,
  approveLPODigital,
  uploadSignedLPO,
  sendLPO,
  getLPOPdfUrl,
} from "@/services/lpo";
import type { LPO, LPOStatus, DeliveryLocation } from "@/types/lpo";
import type { PurchaseRequest } from "@/types/purchaseRequest";

interface LPOSectionProps {
  pr: PurchaseRequest;
  lpo: LPO | null;
  onChange: () => void;
}

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

const BOSS_ROLES = ["director", "company_admin"];
const PROCUREMENT_ROLES = [
  "procurement_manager",
  "procurement",
  "company_admin",
];

export function LPOSection({ pr, lpo, onChange }: LPOSectionProps) {
  const { data: me } = useCurrentUser();
  const { data: suppliers } = useFetch(() => listSuppliers());

  // --- Generate form state ---
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [vatApplicable, setVatApplicable] = useState(true);
  const [vatPercent, setVatPercent] = useState("16");

  // --- Send form state ---
  const [showSendForm, setShowSendForm] = useState(false);
  const [deliveryLocation, setDeliveryLocation] =
    useState<DeliveryLocation>("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBoss = me?.role && BOSS_ROLES.includes(me.role);
  const isProcurement = me?.role && PROCUREMENT_ROLES.includes(me.role);

  async function run(fn: () => Promise<unknown>) {
    setError("");
    setBusy(true);
    try {
      await fn();
      onChange();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "That action didn't go through.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId) return;
    await run(() =>
      generateLPO({
        purchase_request: pr.id,
        supplier: Number(supplierId),
        vat_applicable: vatApplicable,
        vat_percent: Number(vatPercent),
      }),
    );
    setShowGenerateForm(false);
  }

  async function handleUploadSigned(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !lpo) return;
    await run(() => uploadSignedLPO(lpo.id, file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!lpo || !deliveryLocation) return;
    await run(() =>
      sendLPO(lpo.id, deliveryLocation as "site" | "main_warehouse"),
    );
    setShowSendForm(false);
  }

  // No LPO yet — only show the generate option once the PR is fully approved.
  if (!lpo) {
    if (pr.status !== "approved") return null;
    if (!isProcurement) return null;

    return (
      <div className="bg-white rounded-xl border border-steel-200/50 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-steel-900 flex items-center gap-2">
          <FileText size={16} className="text-orange-500" />
          Local Purchase Order
        </h2>
        {!showGenerateForm ? (
          <button
            onClick={() => setShowGenerateForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600"
          >
            <FileText size={14} />
            Generate LPO
          </button>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-steel-600 block mb-1">
                Supplier
              </label>
              <select
                value={supplierId}
                onChange={(e) =>
                  setSupplierId(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                required
              >
                <option value="">Select a supplier...</option>
                {suppliers?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-steel-700">
                <input
                  type="checkbox"
                  checked={vatApplicable}
                  onChange={(e) => setVatApplicable(e.target.checked)}
                />
                VAT applicable
              </label>
              {vatApplicable && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={vatPercent}
                    onChange={(e) => setVatPercent(e.target.value)}
                    className="w-16 border border-steel-300 rounded-lg px-2 py-1 text-sm"
                  />
                  <span className="text-sm text-steel-500">%</span>
                </div>
              )}
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy || !supplierId}
                className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {busy ? "Generating..." : "Generate"}
              </button>
              <button
                type="button"
                onClick={() => setShowGenerateForm(false)}
                className="px-4 py-2 text-sm rounded-lg border border-steel-300 text-steel-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  // LPO exists — show its status + relevant actions.
  return (
    <div className="bg-white rounded-xl border border-steel-200/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-steel-900 flex items-center gap-2">
          <FileText size={16} className="text-orange-500" />
          {lpo.code}
        </h2>
        <span
          className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLES[lpo.status]}`}
        >
          {STATUS_LABELS[lpo.status]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-steel-500">Supplier</p>
          <p className="text-steel-900 flex items-center gap-1">
            <Building2 size={12} className="text-steel-400" />
            {lpo.supplier_name}
          </p>
        </div>
        <div>
          <p className="text-xs text-steel-500">Total</p>
          <p className="text-steel-900 font-medium">
            {Number(lpo.total).toLocaleString()}{" "}
            {lpo.vat_applicable ? "(incl. VAT)" : "(no VAT)"}
          </p>
        </div>
      </div>

      <a
        href={getLPOPdfUrl(lpo.id)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700"
      >
        <Download size={14} />
        Download PDF
      </a>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Awaiting signature: boss can approve digitally, procurement can upload a scanned copy */}
      {lpo.status === "awaiting_signature" && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-steel-100">
          {isBoss && (
            <button
              disabled={busy}
              onClick={() => run(() => approveLPODigital(lpo.id))}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              Approve Digitally
            </button>
          )}
          {isProcurement && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleUploadSigned}
                className="hidden"
              />
              <button
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50 disabled:opacity-50"
              >
                <Upload size={14} />
                Upload Signed Copy
              </button>
            </>
          )}
        </div>
      )}

      {/* Signed: procurement sends it */}
      {lpo.status === "signed" && isProcurement && (
        <div className="pt-2 border-t border-steel-100">
          {lpo.signature_mode && (
            <p className="text-xs text-steel-500 mb-2">
              {lpo.signature_mode === "digital"
                ? `Digitally approved by ${lpo.digitally_approved_by_name} on ${
                    lpo.digitally_approved_at
                      ? new Date(lpo.digitally_approved_at).toLocaleDateString()
                      : ""
                  }`
                : "Signed copy uploaded."}
            </p>
          )}
          {!showSendForm ? (
            <button
              onClick={() => setShowSendForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600"
            >
              <Send size={14} />
              Send to Supplier
            </button>
          ) : (
            <form onSubmit={handleSend} className="space-y-2">
              <label className="text-xs font-medium text-steel-600 block">
                Where will this be delivered?
              </label>
              <select
                value={deliveryLocation}
                onChange={(e) =>
                  setDeliveryLocation(e.target.value as DeliveryLocation)
                }
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                required
              >
                <option value="">Select delivery location...</option>
                <option value="site">Project Site</option>
                <option value="main_warehouse">Main Warehouse</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy || !deliveryLocation}
                  className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {busy ? "Sending..." : "Confirm & Send"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSendForm(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-steel-300 text-steel-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {lpo.status === "sent" && (
        <p className="text-xs text-steel-500 pt-2 border-t border-steel-100">
          Sent{" "}
          {lpo.sent_at && `on ${new Date(lpo.sent_at).toLocaleDateString()}`} —
          delivery expected at{" "}
          {lpo.delivery_location === "site"
            ? "the project site"
            : "the main warehouse"}
          .
        </p>
      )}
    </div>
  );
}
