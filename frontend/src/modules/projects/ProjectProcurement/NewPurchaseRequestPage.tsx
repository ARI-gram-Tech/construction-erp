// /modules/projects/ProjectProcurement/NewPurchaseRequestPage.tsx
import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { createPurchaseRequest } from "@/services/purchaseRequests";
import type {
  PurchaseRequestPayload,
  PurchaseRequestItemPayload,
  PRPriority,
} from "@/types/purchaseRequest";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Check,
  FileText,
  Package,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";

const emptyItem: PurchaseRequestItemPayload = {
  description: "",
  quantity: 1,
  unit: "",
  estimated_unit_cost: null,
  notes: "",
};

const inputClass =
  "w-full border border-steel-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent";

const steps = [
  { id: 1, label: "General", icon: FileText },
  { id: 2, label: "Items", icon: Package },
  { id: 3, label: "Review", icon: ClipboardCheck },
];

export function NewPurchaseRequestPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);

  // Form state
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState<PRPriority>("normal");
  const [requiredDate, setRequiredDate] = useState("");
  const [items, setItems] = useState<PurchaseRequestItemPayload[]>([
    { ...emptyItem },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  function updateItem(
    index: number,
    field: keyof PurchaseRequestItemPayload,
    value: string | number | null,
  ) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { ...emptyItem }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const estimatedTotal = items.reduce(
    (sum, item) =>
      sum +
      (Number(item.estimated_unit_cost) || 0) * (Number(item.quantity) || 0),
    0,
  );

  const canProceed = () => {
    if (currentStep === 1) {
      return title.trim().length > 0;
    }
    if (currentStep === 2) {
      return items.some((i) => i.description.trim().length > 0);
    }
    return true;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const cleanItems = items.filter((i) => i.description.trim() !== "");
    if (cleanItems.length === 0) {
      setFormError("Add at least one line item.");
      return;
    }

    const payload: PurchaseRequestPayload = {
      title,
      reason,
      priority,
      required_date: requiredDate || null,
      items: cleanItems,
    };

    setSubmitting(true);
    try {
      const pr = await createPurchaseRequest(id, payload);
      navigate(`/projects/${id}/procurement/${pr.id}`);
    } catch (err: any) {
      setFormError(
        err?.response?.data?.title?.[0] ||
          err?.response?.data?.items?.[0] ||
          "Failed to create purchase request.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <Link
          to={`/projects/${id}/procurement`}
          className="inline-flex items-center gap-1.5 text-sm text-steel-500 hover:text-steel-700 mb-2"
        >
          <ArrowLeft size={14} />
          Back to Purchase Requests
        </Link>
        <h1 className="text-2xl font-semibold text-steel-900">
          New Purchase Request
        </h1>
        <p className="text-steel-500">
          Step {currentStep} of {steps.length}: {steps[currentStep - 1].label}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center flex-1">
            <div
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                ${
                  step.id === currentStep
                    ? "bg-orange-500 text-white"
                    : step.id < currentStep
                      ? "bg-green-50 text-green-700"
                      : "bg-steel-100 text-steel-400"
                }
              `}
            >
              {step.id < currentStep ? (
                <Check size={16} />
              ) : (
                <step.icon size={16} />
              )}
              {step.label}
            </div>
            {step.id < steps.length && (
              <div
                className={`
                  flex-1 h-0.5 mx-2
                  ${step.id < currentStep ? "bg-green-500" : "bg-steel-200"}
                `}
              />
            )}
          </div>
        ))}
      </div>

      {formError && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: General Information */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl border border-steel-200/50 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-steel-900">
              General Information
            </h2>

            <label className="block">
              <span className="block text-xs font-medium text-steel-600 mb-1">
                Title *
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
                placeholder="e.g. Cement for ground floor slab"
                required
                autoFocus
              />
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-steel-600 mb-1">
                Reason / linked activity
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={inputClass}
                rows={2}
                placeholder="Why is this needed, and for which activity?"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-xs font-medium text-steel-600 mb-1">
                  Priority
                </span>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PRPriority)}
                  className={inputClass}
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-steel-600 mb-1">
                  Required by
                </span>
                <input
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
          </div>
        )}

        {/* Step 2: Items */}
        {currentStep === 2 && (
          <div className="bg-white rounded-xl border border-steel-200/50 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-steel-900">
                Line Items
              </h2>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700"
              >
                <Plus size={14} />
                Add item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start border-b border-steel-100 pb-3 last:border-0 last:pb-0"
                >
                  <input
                    placeholder="Description *"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                    className={`${inputClass} sm:col-span-5`}
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", Number(e.target.value))
                    }
                    className={`${inputClass} sm:col-span-2`}
                  />
                  <input
                    placeholder="Unit"
                    value={item.unit}
                    onChange={(e) => updateItem(index, "unit", e.target.value)}
                    className={`${inputClass} sm:col-span-2`}
                  />
                  <input
                    type="number"
                    placeholder="Est. cost"
                    min="0"
                    step="0.01"
                    value={item.estimated_unit_cost ?? ""}
                    onChange={(e) =>
                      updateItem(
                        index,
                        "estimated_unit_cost",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                    className={`${inputClass} sm:col-span-2`}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="p-2 rounded hover:bg-red-50 text-red-500 disabled:opacity-30 disabled:hover:bg-transparent sm:col-span-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {estimatedTotal > 0 && (
              <div className="text-right text-sm text-steel-600 pt-2 border-t border-steel-100">
                Estimated total:{" "}
                <span className="font-semibold text-steel-900">
                  KES {estimatedTotal.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 3 && (
          <div className="bg-white rounded-xl border border-steel-200/50 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-steel-900">
              Review & Submit
            </h2>

            <div className="space-y-3 bg-steel-50 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span className="text-steel-500">Title</span>
                <span className="font-medium text-steel-900">{title}</span>
              </div>
              {reason && (
                <div className="flex justify-between text-sm">
                  <span className="text-steel-500">Reason</span>
                  <span className="font-medium text-steel-900">{reason}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-steel-500">Priority</span>
                <span
                  className={`font-medium ${
                    priority === "urgent" ? "text-red-600" : "text-steel-900"
                  }`}
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </span>
              </div>
              {requiredDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-steel-500">Required by</span>
                  <span className="font-medium text-steel-900">
                    {requiredDate}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-steel-200 pt-3">
                <span className="text-steel-500">Total Items</span>
                <span className="font-medium text-steel-900">
                  {items.filter((i) => i.description.trim()).length}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-steel-200 pt-3">
                <span className="text-steel-500">Estimated Total</span>
                <span className="font-semibold text-steel-900 text-lg">
                  KES {estimatedTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-amber-50 text-amber-700 text-sm p-3 rounded-lg flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p>
                This will be saved as a draft. You can submit it for approval
                after creation.
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => navigate(`/projects/${id}/procurement`)}
            className="px-4 py-2 text-sm rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}
            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save as Draft"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
