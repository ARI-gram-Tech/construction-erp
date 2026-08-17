// /src/modules/tenders/components/TenderImportTab.tsx
import { useState } from "react";
import {
  uploadTenderImport,
  previewTenderImport,
  confirmTenderImport,
} from "@/services/tenders";
import {
  isTenderAIResponse,
  TENDER_IMPORT_TARGET_FIELDS,
} from "@/types/tender";
import type {
  TenderUploadResponse,
  TenderPreviewResponse,
  TenderAIRow,
} from "@/types/tender";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface TenderImportTabProps {
  tenderId: number;
  canEdit: boolean;
  onImported: () => void;
}

type Step = "upload" | "map" | "done";

export function TenderImportTab({
  tenderId,
  canEdit,
  onImported,
}: TenderImportTabProps) {
  const [step, setStep] = useState<Step>("upload");
  const [uploadRes, setUploadRes] = useState<TenderUploadResponse | null>(null);
  const [previewRes, setPreviewRes] = useState<TenderPreviewResponse | null>(
    null,
  );
  const [fields, setFields] = useState<Record<string, number | null>>({});
  const [aiRows, setAiRows] = useState<TenderAIRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    imported_count: number;
    skipped_count: number;
  } | null>(null);

  if (!canEdit) {
    return (
      <div className="bg-white rounded-xl border border-steel-200/50 p-8 text-center">
        <p className="text-sm text-steel-500">
          Only the assigned QS can import a BOQ into this tender.
        </p>
      </div>
    );
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const res = await uploadTenderImport(tenderId, file);
      setUploadRes(res);

      if (isTenderAIResponse(res)) {
        setAiRows(res.preview as TenderAIRow[]);
      } else {
        const grid = res;
        const initialFields: Record<string, number | null> = {};
        // Suggested mapping already lives in the session's column_mapping.
        const suggested = (res.session.column_mapping as any)?.fields ?? {};
        TENDER_IMPORT_TARGET_FIELDS.forEach((f) => {
          initialFields[f.key] = suggested[f.key] ?? null;
        });
        setFields(initialFields);
        void grid;
      }
      setStep("map");
      await runPreview(res);
    } catch {
      setError("Upload failed. Check the file format and try again.");
    } finally {
      setUploading(false);
    }
  }

  async function runPreview(uploadedSession = uploadRes) {
    if (!uploadedSession) return;
    setError(null);
    try {
      const isAI = isTenderAIResponse(uploadedSession);
      const payload = isAI ? { rows: aiRows } : { fields };
      const res = await previewTenderImport(
        tenderId,
        uploadedSession.session.id,
        payload,
      );
      setPreviewRes(res);
    } catch {
      setError("Preview failed.");
    }
  }

  async function handleConfirm(force = false) {
    if (!uploadRes) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await confirmTenderImport(
        tenderId,
        uploadRes.session.id,
        force,
      );
      setResult({
        imported_count: res.imported_count,
        skipped_count: res.skipped_count,
      });
      setStep("done");
      onImported();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(detail || "Import failed.");
    } finally {
      setConfirming(false);
    }
  }

  function reset() {
    setStep("upload");
    setUploadRes(null);
    setPreviewRes(null);
    setFields({});
    setAiRows([]);
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      {step === "upload" && (
        <div className="bg-white rounded-xl border-2 border-dashed border-steel-300 p-10 text-center">
          <Upload size={28} className="text-steel-300 mx-auto mb-3" />
          <p className="text-sm text-steel-600 mb-1">
            Upload an Excel/CSV BOQ, or a PDF/scanned tender document
          </p>
          <p className="text-xs text-steel-400 mb-4">
            Excel/CSV uses column mapping. PDF/images are read via AI
            extraction.
          </p>
          <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 cursor-pointer">
            {uploading ? "Uploading..." : "Choose File"}
            <input
              type="file"
              accept=".xlsx,.csv,.pdf,.png,.jpg,.jpeg,.webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
          </label>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>
      )}

      {step === "map" && uploadRes && (
        <div className="space-y-4">
          {!isTenderAIResponse(uploadRes) && (
            <div className="bg-white rounded-xl border border-steel-200/50 p-5">
              <h3 className="text-sm font-semibold text-steel-900 mb-3">
                Map Columns
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TENDER_IMPORT_TARGET_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className="text-xs text-steel-500 flex items-center gap-1">
                      {f.label}
                      {f.required && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={fields[f.key] ?? ""}
                      onChange={(e) => {
                        const next = {
                          ...fields,
                          [f.key]:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        };
                        setFields(next);
                      }}
                      className="w-full border border-steel-300 rounded-lg px-2 py-1.5 text-sm mt-1"
                    >
                      <option value="">— Ignore —</option>
                      {uploadRes.available_columns.map((col, idx) => (
                        <option key={idx} value={idx}>
                          {String(col)}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <button
                onClick={() => runPreview()}
                className="mt-4 px-3.5 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50"
              >
                Refresh Preview
              </button>
            </div>
          )}

          {isTenderAIResponse(uploadRes) && (
            <div className="bg-white rounded-xl border border-steel-200/50 p-5">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet size={16} className="text-orange-500" />
                <h3 className="text-sm font-semibold text-steel-900">
                  AI Extraction
                </h3>
                {uploadRes.overall_confidence != null && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    {uploadRes.overall_confidence}% confidence
                  </span>
                )}
              </div>
              {uploadRes.notes && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 mb-2">
                  {uploadRes.notes}
                </p>
              )}
              <p className="text-xs text-steel-500">
                Review the extracted rows below before importing. Rows with low
                confidence are worth double-checking against the source
                document.
              </p>
            </div>
          )}

          {previewRes && (
            <div className="bg-white rounded-xl border border-steel-200/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-steel-200/50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-steel-900">
                  Preview
                </h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 size={12} />
                    {previewRes.validation.valid_count} valid
                  </span>
                  {previewRes.validation.error_count > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertTriangle size={12} />
                      {previewRes.validation.error_count} errors
                    </span>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-steel-500 border-b border-steel-200/50 bg-steel-50/50">
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2">Unit</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2">Section</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-steel-100">
                    {previewRes.preview.slice(0, 20).map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-xs text-steel-500">
                          {String((row as any).item_code ?? "")}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {String((row as any).description ?? "")}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {String((row as any).unit ?? "")}
                        </td>
                        <td className="px-3 py-2 text-xs text-right">
                          {String((row as any).quantity ?? "")}
                        </td>
                        <td className="px-3 py-2 text-xs text-right">
                          {String((row as any).rate ?? "")}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {String((row as any).section ?? "")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewRes.validation.errors.length > 0 && (
                <div className="border-t border-steel-200/50 p-3 max-h-32 overflow-y-auto">
                  {previewRes.validation.errors.slice(0, 10).map((e, i) => (
                    <p key={i} className="text-xs text-red-600">
                      Row {e.row_number}: {e.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              className="px-3.5 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50"
            >
              Start Over
            </button>
            <button
              onClick={() => handleConfirm(false)}
              disabled={
                confirming ||
                !previewRes ||
                previewRes.validation.valid_count === 0
              }
              className="px-3.5 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {confirming ? "Importing..." : "Import Valid Rows"}
            </button>
            {previewRes && previewRes.validation.error_count > 0 && (
              <button
                onClick={() => handleConfirm(true)}
                disabled={confirming}
                className="px-3.5 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Import Anyway (skip errors)
              </button>
            )}
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="white rounded-xl border border-green-200 bg-green-50/40 p-8 text-center">
          <CheckCircle2 size={28} className="text-green-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-steel-900">
            Imported {result.imported_count} line item
            {result.imported_count === 1 ? "" : "s"}
          </p>
          {result.skipped_count > 0 && (
            <p className="text-xs text-steel-500 mt-1">
              {result.skipped_count} row{result.skipped_count === 1 ? "" : "s"}{" "}
              skipped
            </p>
          )}
          <button
            onClick={reset}
            className="mt-4 px-3.5 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}
