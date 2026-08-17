// src/modules/projects/ProjectBOQ/BOQImportPage.tsx

import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import { listBOQs } from "@/services/boq";
import { uploadDocument } from "@/services/documents";
import {
  uploadImportSession,
  previewImportSession,
  confirmImportSession,
} from "@/services/boqImport";
import type {
  ImportSession,
  GridPreviewRow,
  AIRow,
  ImportValidation,
  UploadResponse,
  PreviewResponse,
} from "@/types/boqImport";
import { isAIResponse, TARGET_FIELDS } from "@/types/boqImport";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Check,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

type RawRow = GridPreviewRow | AIRow;

// Normalizes whatever the backend sent (a flat dict per row, whether
// from a spreadsheet mapping or AI extraction) into a display-ready
// shape, matching row errors by 1-based row_number — the backend's
// validate_mapped_rows() enumerates from 1 over the same array this
// preview came from, so index+1 lines up directly.
interface DisplayRow {
  index: number; // 0-based, matches position in the raw rows array
  fields: RawRow;
  errors: string[];
  isValid: boolean;
}

function toDisplayRows(
  rawRows: RawRow[],
  validation: ImportValidation | null,
): DisplayRow[] {
  const errorsByRow = new Map<number, string[]>();
  validation?.errors.forEach((e) => {
    const list = errorsByRow.get(e.row_number) ?? [];
    list.push(e.reason);
    errorsByRow.set(e.row_number, list);
  });

  return rawRows.map((fields, index) => {
    const errors = errorsByRow.get(index + 1) ?? [];
    return { index, fields, errors, isValid: errors.length === 0 };
  });
}

const cellInputClass =
  "w-full border border-transparent hover:border-steel-200 focus:border-orange-400 rounded px-1 py-0.5 text-sm bg-transparent focus:bg-white";

export function BOQImportPage() {
  const { projectId, boqId } = useParams<{
    projectId: string;
    boqId?: string;
  }>();
  const pid = Number(projectId);
  const presetBOQId = boqId ? Number(boqId) : null;
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "imported">("upload");
  const [error, setError] = useState("");
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);

  const [session, setSession] = useState<ImportSession | null>(null);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [validation, setValidation] = useState<ImportValidation | null>(null);
  const [availableColumns, setAvailableColumns] = useState<
    (string | number | null)[]
  >([]);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [fieldMapping, setFieldMapping] = useState<
    Record<string, number | null>
  >({});

  const [selectedBOQ, setSelectedBOQ] = useState<string>(
    presetBOQId ? String(presetBOQId) : "",
  );
  const [newBOQTitle, setNewBOQTitle] = useState("");
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);

  const { data: boqs } = useFetch(() => listBOQs(pid), [pid]);

  const isAI = session?.import_mode === "ai_import";
  const displayRows = useMemo(
    () => toDisplayRows(rawRows, validation),
    [rawRows, validation],
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  }

  async function handleUpload() {
    if (!file) return;
    setError("");
    setAiUnavailable(false);
    setUploading(true);
    try {
      const res: UploadResponse = await uploadImportSession(pid, file);
      setSession(res.session);

      if (isAIResponse(res)) {
        setRawRows(res.preview);
        setValidation({
          valid_count: res.preview.length,
          error_count: 0,
          errors: [],
        });
      } else {
        setAvailableColumns(res.available_columns);
        setHeaderRowIndex(res.header_row_index);
        // Fields come back pre-mapped as column indices from the
        // backend's guess_header_row/suggest_mapping — read them off
        // the created session rather than re-guessing client-side.
        const fields =
          (res.session.column_mapping?.fields as Record<
            string,
            number | null
          >) ?? {};
        setFieldMapping(fields);
        setRawRows(res.preview);
        setValidation(null); // not validated yet — user hasn't confirmed mapping
      }
      setStep("preview");
    } catch (err: any) {
      // 502 specifically means the AI service itself failed (billing,
      // rate limit, connection) — not a bad file. In that case, offer a
      // direct way out instead of leaving the person stuck: they can
      // still store the exact file they just picked as a reference
      // document with one click, no need to re-select it.
      if (err?.response?.status === 502) {
        setAiUnavailable(true);
      }
      setError(
        err?.response?.data?.detail || "Upload failed. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleUploadAsReference() {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      await uploadDocument({
        name: file.name,
        category: "boq",
        project: pid,
        file,
      });
      navigate(`/projects/${pid}/boq`);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || "Upload failed. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleRefreshPreview() {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      let res: PreviewResponse;
      if (isAI) {
        res = await previewImportSession(pid, session.id, {
          rows: rawRows as AIRow[],
        });
      } else {
        res = await previewImportSession(pid, session.id, {
          header_row_index: headerRowIndex,
          fields: fieldMapping,
        });
        setAvailableColumns(res.available_columns ?? availableColumns);
      }
      setSession(res.session);
      setRawRows(res.preview as RawRow[]);
      setValidation(res.validation);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Preview failed.");
    } finally {
      setBusy(false);
    }
  }

  function updateAIRow(index: number, field: keyof AIRow, value: string) {
    setRawRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]:
                field === "quantity" || field === "rate"
                  ? value === ""
                    ? null
                    : Number(value)
                  : value,
            }
          : row,
      ),
    );
  }

  async function handleConfirm() {
    if (!session) return;
    setError("");

    if (!selectedBOQ && !newBOQTitle.trim()) {
      setError("Select an existing BOQ or enter a title for a new one.");
      return;
    }

    // Only ask about skipping rows if there's actually something to skip —
    // don't interrupt a clean import with a pointless confirmation.
    let force = false;
    if (validation && validation.error_count > 0) {
      const proceed = confirm(
        `${validation.error_count} row(s) failed validation. Skip them and import the rest?`,
      );
      if (!proceed) return;
      force = true;
    }

    setBusy(true);
    try {
      const payload = selectedBOQ
        ? { boq_id: Number(selectedBOQ), force }
        : { boq_title: newBOQTitle, force };

      const result = await confirmImportSession(pid, session.id, payload);
      setImportResult({
        imported: result.imported_count,
        skipped: result.skipped_count,
      });
      setStep("imported");
      setTimeout(() => navigate(`/projects/${pid}/boq/${result.boq.id}`), 2000);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          `${err?.response?.data?.errors?.length ?? 0} row(s) failed validation.`,
      );
    } finally {
      setBusy(false);
    }
  }

  const confidence =
    session?.confidence_score != null ? Number(session.confidence_score) : null;

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-steel-200/50 p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto bg-orange-50 rounded-full flex items-center justify-center mb-4">
            <Upload size={24} className="text-orange-500" />
          </div>
          <h3 className="text-lg font-medium text-steel-900 mb-2">
            Upload BOQ File
          </h3>
          <p className="text-sm text-steel-500 mb-6">
            Excel (.xlsx) or CSV gets column mapping. PDF or a photo/scan (PNG,
            JPG) gets read by AI — either way, nothing imports until you review
            it.
          </p>

          <div
            className="border-2 border-dashed border-steel-300 rounded-lg p-8 hover:border-orange-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv,.pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet size={20} className="text-steel-400" />
                <span className="text-sm text-steel-700">{file.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div>
                <FileSpreadsheet
                  size={32}
                  className="text-steel-300 mx-auto mb-2"
                />
                <p className="text-sm text-steel-600">
                  Drop your file here, or click to browse
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="mt-6 px-6 py-2.5 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : "Upload & Preview"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          {aiUnavailable && file && (
            <div className="flex items-center gap-2 pt-1 border-t border-red-200/60">
              <span className="text-red-600/80">
                You can still store this exact file for reference —
              </span>
              <button
                onClick={handleUploadAsReference}
                disabled={uploading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-red-300 text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Store as reference instead
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-steel-900">
            Preview & Review
          </h2>
          <p className="text-sm text-steel-500">
            {isAI
              ? `AI extracted ${rawRows.length} rows`
              : `${rawRows.length} rows found`}
            {validation && ` · ${validation.valid_count} valid`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {confidence !== null && (
            <span
              className={`text-sm px-3 py-1 rounded-full ${
                confidence >= 80
                  ? "bg-green-50 text-green-700"
                  : confidence >= 60
                    ? "bg-yellow-50 text-yellow-700"
                    : "bg-red-50 text-red-700"
              }`}
            >
              AI confidence: {confidence.toFixed(0)}%
            </span>
          )}
          {validation && validation.error_count > 0 && (
            <span className="text-sm text-red-600">
              ⚠️ {validation.error_count} row(s) need attention
            </span>
          )}
        </div>
      </div>

      {isAI && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">AI-extracted data — review carefully</p>
            <p className="text-xs mt-1">
              Confidence is the model's own estimate, not a guarantee — click
              any cell to correct it, then re-run validation below.
            </p>
          </div>
        </div>
      )}

      {!isAI && availableColumns.length > 0 && (
        <div className="bg-white rounded-xl border border-steel-200/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-steel-900">Map Columns</h4>
            <label className="flex items-center gap-2 text-xs text-steel-500">
              Header row
              <input
                type="number"
                min={0}
                value={headerRowIndex}
                onChange={(e) => setHeaderRowIndex(Number(e.target.value))}
                className="w-14 border border-steel-300 rounded px-1.5 py-1 text-sm"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TARGET_FIELDS.map(({ key, label, required }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-steel-500 w-20 truncate">
                  {label}
                  {required && <span className="text-red-500">*</span>}
                </span>
                <select
                  value={fieldMapping[key] ?? ""}
                  onChange={(e) =>
                    setFieldMapping((prev) => ({
                      ...prev,
                      [key]:
                        e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  className="flex-1 border border-steel-200 rounded px-2 py-1 text-sm"
                >
                  <option value="">— skip —</option>
                  {availableColumns.map((col, idx) => (
                    <option key={idx} value={idx}>
                      {String(col)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button
            onClick={handleRefreshPreview}
            disabled={busy}
            className="px-4 py-1.5 text-sm rounded bg-steel-100 hover:bg-steel-200 disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={`inline mr-1 ${busy ? "animate-spin" : ""}`}
            />
            Refresh Preview
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-steel-200/50 overflow-hidden">
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-steel-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs text-steel-500">
                  #
                </th>
                <th className="px-3 py-2 text-left text-xs text-steel-500">
                  Code
                </th>
                <th className="px-3 py-2 text-left text-xs text-steel-500">
                  Description
                </th>
                <th className="px-3 py-2 text-left text-xs text-steel-500">
                  Unit
                </th>
                <th className="px-3 py-2 text-left text-xs text-steel-500">
                  Qty
                </th>
                <th className="px-3 py-2 text-left text-xs text-steel-500">
                  Rate
                </th>
                <th className="px-3 py-2 text-left text-xs text-steel-500">
                  Amount
                </th>
                <th className="px-3 py-2 text-left text-xs text-steel-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row) => {
                const f = row.fields as Record<string, any>;
                const qty = Number(f.quantity);
                const rate = Number(f.rate);
                const amount =
                  !Number.isNaN(qty) && !Number.isNaN(rate)
                    ? (qty * rate).toLocaleString()
                    : "—";

                return (
                  <tr
                    key={row.index}
                    title={row.errors.join("; ")}
                    className={`border-t border-steel-100 hover:bg-steel-50/50 ${
                      !row.isValid && validation ? "bg-red-50/50" : ""
                    }`}
                  >
                    <td className="px-3 py-2 text-xs text-steel-400">
                      {row.index + 1}
                    </td>
                    <td className="px-3 py-2">
                      {isAI ? (
                        <input
                          defaultValue={f.item_code || ""}
                          onBlur={(e) =>
                            updateAIRow(row.index, "item_code", e.target.value)
                          }
                          className={cellInputClass}
                        />
                      ) : (
                        <span className="text-steel-700">
                          {f.item_code || "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 max-w-xs">
                      {isAI ? (
                        <input
                          defaultValue={f.description || ""}
                          onBlur={(e) =>
                            updateAIRow(
                              row.index,
                              "description",
                              e.target.value,
                            )
                          }
                          className={cellInputClass}
                        />
                      ) : (
                        <span className="text-steel-700">
                          {f.description || "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isAI ? (
                        <input
                          defaultValue={f.unit || ""}
                          onBlur={(e) =>
                            updateAIRow(row.index, "unit", e.target.value)
                          }
                          className={`${cellInputClass} w-16`}
                        />
                      ) : (
                        <span className="text-steel-700">{f.unit || "—"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isAI ? (
                        <input
                          type="number"
                          defaultValue={f.quantity ?? ""}
                          onBlur={(e) =>
                            updateAIRow(row.index, "quantity", e.target.value)
                          }
                          className={`${cellInputClass} w-20`}
                        />
                      ) : (
                        <span className="text-steel-700">
                          {f.quantity ?? "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isAI ? (
                        <input
                          type="number"
                          defaultValue={f.rate ?? ""}
                          onBlur={(e) =>
                            updateAIRow(row.index, "rate", e.target.value)
                          }
                          className={`${cellInputClass} w-24`}
                        />
                      ) : (
                        <span className="text-steel-700">{f.rate ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium text-steel-900">
                      {amount}
                    </td>
                    <td className="px-3 py-2">
                      {!validation ? (
                        <span className="text-xs text-steel-400">—</span>
                      ) : row.isValid ? (
                        <Check size={14} className="text-green-500" />
                      ) : (
                        <X size={14} className="text-red-500" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {validation && validation.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-red-700 mb-1">
            Validation Errors
          </h4>
          <div className="max-h-32 overflow-y-auto">
            {validation.errors.slice(0, 20).map((err, idx) => (
              <p key={idx} className="text-xs text-red-600">
                Row {err.row_number}: {err.reason}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-steel-200/50 p-4 space-y-3">
        <h4 className="text-sm font-medium text-steel-900">
          Import Destination
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-steel-500 mb-1">
              Existing BOQ
            </label>
            <select
              value={selectedBOQ}
              onChange={(e) => setSelectedBOQ(e.target.value)}
              className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">— Create new —</option>
              {boqs?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-steel-500 mb-1">
              Or new BOQ title
            </label>
            <input
              value={newBOQTitle}
              onChange={(e) => setNewBOQTitle(e.target.value)}
              placeholder="e.g. Imported BOQ — March 2026"
              className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
              disabled={!!selectedBOQ}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => {
            setStep("upload");
            setSession(null);
            setValidation(null);
            setRawRows([]);
          }}
          className="px-4 py-2 text-sm rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50"
        >
          Back
        </button>
        <div className="flex items-center gap-2">
          {isAI && (
            <button
              onClick={handleRefreshPreview}
              disabled={busy}
              className="px-4 py-2 text-sm rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50 disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={`inline mr-1 ${busy ? "animate-spin" : ""}`}
              />
              Re-validate
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="px-6 py-2.5 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "Importing..." : `Import ${rawRows.length} Rows`}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  );

  const renderImportedStep = () => (
    <div className="bg-white rounded-xl border border-steel-200/50 p-12 text-center">
      <div className="w-16 h-16 mx-auto bg-green-50 rounded-full flex items-center justify-center mb-4">
        <Check size={24} className="text-green-500" />
      </div>
      <h3 className="text-xl font-semibold text-steel-900 mb-2">
        Import Successful!
      </h3>
      <p className="text-steel-500">
        {importResult?.imported ?? 0} rows imported
        {importResult && importResult.skipped > 0
          ? `, ${importResult.skipped} skipped`
          : ""}
      </p>
      <p className="text-sm text-steel-400 mt-1">Redirecting to BOQ...</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          to={
            presetBOQId
              ? `/projects/${pid}/boq/${presetBOQId}`
              : `/projects/${pid}/boq`
          }
          className="p-2 rounded-lg hover:bg-steel-100 text-steel-500"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-steel-900">
            {presetBOQId ? "Import into this BOQ" : "Import BOQ"}
          </h1>
          <p className="text-steel-500">Upload, review, and import BOQ data</p>
        </div>
      </div>

      {step === "upload" && renderUploadStep()}
      {step === "preview" && renderPreviewStep()}
      {step === "imported" && renderImportedStep()}
    </div>
  );
}
