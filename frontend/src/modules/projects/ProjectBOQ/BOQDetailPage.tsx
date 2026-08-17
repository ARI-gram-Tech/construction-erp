// src/modules/projects/ProjectBOQ/BOQDetailPage.tsx

import { useState, useMemo, Fragment } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import {
  getBOQ,
  listSections,
  listItems,
  listUnits,
  listRevisions,
  createSection,
  createItem,
  updateItem,
  deleteItem,
  duplicateBOQ,
  createRevision,
} from "@/services/boq";
import { listActivities } from "@/services/planning";
import type { BOQSection, BOQItem, BOQItemPayload } from "@/types/boq";
import { BOQ_STATUS_LABELS } from "@/types/boq";
import { BOQReferenceView } from "./BOQReferenceView";
import { Trash2 } from "lucide-react";
import { BOQLayout } from "./components/BOQLayout";
import type { BOQTab } from "./components/BOQNav";

const inputClass =
  "w-full border border-steel-300 rounded-lg px-2 py-1.5 text-sm";
const cellInputClass =
  "w-full border border-transparent hover:border-steel-200 focus:border-orange-400 rounded px-2 py-1 text-sm bg-transparent focus:bg-white transition-colors";

function buildSectionOptions(
  sections: BOQSection[],
): { id: number; label: string }[] {
  const byParent = new Map<number | null, BOQSection[]>();
  for (const s of sections) {
    const list = byParent.get(s.parent) ?? [];
    list.push(s);
    byParent.set(s.parent, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  }

  const result: { id: number; label: string }[] = [];
  function walk(parentId: number | null, depth: number) {
    for (const s of byParent.get(parentId) ?? []) {
      result.push({
        id: s.id,
        label: `${"— ".repeat(depth)}${s.code ? `${s.code} ` : ""}${s.title}`,
      });
      walk(s.id, depth + 1);
    }
  }
  walk(null, 0);
  return result;
}

export function BOQDetailPage() {
  const { projectId, boqId } = useParams<{
    projectId: string;
    boqId: string;
  }>();
  const pid = Number(projectId);
  const bid = Number(boqId);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<BOQTab>("overview");

  const {
    data: boq,
    loading: boqLoading,
    error: boqError,
    reload: reloadBOQ,
  } = useFetch(() => getBOQ(pid, bid), [pid, bid]);

  const { data: activities } = useFetch(() => listActivities(pid), [pid]);

  const { data: sections, reload: reloadSections } = useFetch(
    () => listSections(pid, bid),
    [pid, bid],
  );

  const { data: items, reload: reloadItems } = useFetch(
    () => listItems(pid, bid),
    [pid, bid],
  );

  const { data: revisions, reload: reloadRevisions } = useFetch(
    () => listRevisions(pid, bid),
    [pid, bid],
  );

  const { data: units } = useFetch(() => listUnits(), []);

  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  // Section form
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionCode, setNewSectionCode] = useState("");
  const [newSectionParent, setNewSectionParent] = useState<string>("");

  // Item form
  const emptyItemForm: BOQItemPayload = {
    item_code: "",
    description: "",
    unit: 0,
    quantity: 0,
    rate: 0,
    section: null,
  };
  const [showItemForm, setShowItemForm] = useState(false);
  const [newItem, setNewItem] = useState<BOQItemPayload>(emptyItemForm);

  const sectionOptions = useMemo(
    () => (sections ? buildSectionOptions(sections) : []),
    [sections],
  );
  const sectionNameById = useMemo(() => {
    const map = new Map<number, string>();
    sections?.forEach((s) => map.set(s.id, s.title));
    return map;
  }, [sections]);

  async function runAction(fn: () => Promise<unknown>) {
    setActionError("");
    setBusy(true);
    try {
      await fn();
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  // --- Section handlers ---
  async function handleAddSection(e: React.FormEvent) {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;
    await runAction(async () => {
      await createSection(pid, bid, {
        title: newSectionTitle,
        code: newSectionCode || undefined,
        parent: newSectionParent ? Number(newSectionParent) : null,
      });
      setNewSectionTitle("");
      setNewSectionCode("");
      setNewSectionParent("");
      setShowSectionForm(false);
      reloadSections();
    });
  }

  // --- Item handlers ---
  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.description.trim() || !newItem.unit) {
      setActionError("Description and unit are required.");
      return;
    }
    await runAction(async () => {
      await createItem(pid, bid, newItem);
      setNewItem(emptyItemForm);
      setShowItemForm(false);
      reloadItems();
      reloadBOQ();
    });
  }

  async function handleItemFieldChange(
    itemId: number,
    field: keyof BOQItemPayload,
    value: string | number | null,
  ) {
    await runAction(async () => {
      await updateItem(pid, bid, itemId, {
        [field]: value,
      } as Partial<BOQItemPayload>);
      reloadItems();
      if (field === "quantity" || field === "rate") reloadBOQ();
    });
  }

  async function handleDeleteItem(itemId: number) {
    if (!confirm("Remove this item?")) return;
    await runAction(async () => {
      await deleteItem(pid, bid, itemId);
      reloadItems();
      reloadBOQ();
    });
  }

  async function handleDuplicate() {
    await runAction(async () => {
      const clone = await duplicateBOQ(pid, bid);
      navigate(`/projects/${pid}/boq/${clone.id}`);
    });
  }

  async function handleNewRevision() {
    const reason = prompt("Reason for this revision (optional):") ?? "";
    await runAction(async () => {
      await createRevision(pid, bid, reason);
      reloadRevisions();
      reloadBOQ();
    });
  }

  if (boqLoading) return <div className="text-steel-500">Loading BOQ...</div>;
  if (boqError) return <div className="text-red-600">{boqError}</div>;
  if (!boq) return null;

  // Reference-only BOQs have no sections/items to speak of — render
  // the stored file in-app instead of the editor tabs. Everything
  // else (duplicate, back nav) still applies, so it's handled by the
  // shared handlers above rather than duplicated in the sub-component.
  if (boq.integration_mode === "reference") {
    return (
      <BOQReferenceView
        boq={boq}
        pid={pid}
        onDuplicate={handleDuplicate}
        busy={busy}
      />
    );
  }

  const groupedItems = new Map<number | null, BOQItem[]>();
  (items ?? []).forEach((item) => {
    const key = item.section;
    const list = groupedItems.get(key) ?? [];
    list.push(item);
    groupedItems.set(key, list);
  });

  const groupOrder: (number | null)[] = [
    ...(sections ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s) => s.id),
    null,
  ];

  // --- Tab content ---
  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-xl border border-steel-200/50 p-5 space-y-1">
        <p className="text-xs text-steel-400">Total Amount</p>
        <p className="text-2xl font-semibold text-steel-900">
          {boq.currency} {Number(boq.total_amount).toLocaleString()}
        </p>
      </div>
      <div className="bg-white rounded-xl border border-steel-200/50 p-5 space-y-1">
        <p className="text-xs text-steel-400">Items</p>
        <p className="text-2xl font-semibold text-steel-900">
          {boq.item_count}
        </p>
      </div>
      <div className="bg-white rounded-xl border border-steel-200/50 p-5 space-y-1">
        <p className="text-xs text-steel-400">Status</p>
        <p className="text-2xl font-semibold text-steel-900">
          {BOQ_STATUS_LABELS[boq.status]}
        </p>
        <p className="text-xs text-steel-500">{boq.health_label}</p>
      </div>
      <div className="bg-white rounded-xl border border-steel-200/50 p-5 space-y-1">
        <p className="text-xs text-steel-400">Source</p>
        <p className="text-sm font-medium text-steel-700 capitalize">
          {boq.source.replace("_", " ")}
        </p>
      </div>
      <div className="bg-white rounded-xl border border-steel-200/50 p-5 space-y-1">
        <p className="text-xs text-steel-400">Link Mode</p>
        <p className="text-sm font-medium text-steel-700 capitalize">
          {boq.link_mode.replace("_", " ")}
        </p>
      </div>
      <div className="bg-white rounded-xl border border-steel-200/50 p-5 space-y-1">
        <p className="text-xs text-steel-400">Integration</p>
        <p className="text-sm font-medium text-steel-700 capitalize">
          {boq.integration_mode.replace("_", " ")}
        </p>
      </div>
    </div>
  );

  const renderSections = () => (
    <div className="space-y-3">
      {showSectionForm && (
        <form
          onSubmit={handleAddSection}
          className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end bg-steel-50/60 rounded-lg p-3"
        >
          <div className="sm:col-span-2">
            <span className="block text-xs text-steel-500 mb-1">Code</span>
            <input
              value={newSectionCode}
              onChange={(e) => setNewSectionCode(e.target.value)}
              className={inputClass}
              placeholder="e.g. A"
            />
          </div>
          <div className="sm:col-span-4">
            <span className="block text-xs text-steel-500 mb-1">Title *</span>
            <input
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              className={inputClass}
              placeholder="e.g. Earthworks"
              required
            />
          </div>
          <div className="sm:col-span-4">
            <span className="block text-xs text-steel-500 mb-1">Parent</span>
            <select
              value={newSectionParent}
              onChange={(e) => setNewSectionParent(e.target.value)}
              className={inputClass}
            >
              <option value="">— top level —</option>
              {sectionOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full px-3 py-1.5 text-sm rounded-lg bg-orange-500 text-white"
            >
              Add
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-steel-200/50 divide-y">
        {sections && sections.length > 0 ? (
          sections
            .sort((a, b) => a.order - b.order)
            .map((s) => (
              <div
                key={s.id}
                className="px-4 py-3 flex items-center justify-between hover:bg-steel-50/40"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-steel-400 bg-steel-100 px-2 py-0.5 rounded">
                    {s.code || "—"}
                  </span>
                  <span className="text-sm text-steel-900">{s.title}</span>
                  {s.parent && (
                    <span className="text-xs text-steel-400">
                      → {sectionNameById.get(s.parent) || "—"}
                    </span>
                  )}
                </div>
                <span className="text-xs text-steel-400">Order: {s.order}</span>
              </div>
            ))
        ) : (
          <p className="text-sm text-steel-500 p-4 text-center">
            No sections yet.
          </p>
        )}
      </div>
    </div>
  );

  const renderItems = () => (
    <div className="space-y-4">
      {showItemForm && (
        <form
          onSubmit={handleAddItem}
          className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end bg-steel-50/60 rounded-lg p-3"
        >
          <input
            placeholder="Code"
            value={newItem.item_code}
            onChange={(e) =>
              setNewItem((prev) => ({ ...prev, item_code: e.target.value }))
            }
            className={`${inputClass} sm:col-span-1`}
          />
          <input
            placeholder="Description *"
            value={newItem.description}
            onChange={(e) =>
              setNewItem((prev) => ({ ...prev, description: e.target.value }))
            }
            className={`${inputClass} sm:col-span-4`}
          />
          <select
            value={newItem.unit || ""}
            onChange={(e) =>
              setNewItem((prev) => ({ ...prev, unit: Number(e.target.value) }))
            }
            className={`${inputClass} sm:col-span-1`}
          >
            <option value="">Unit *</option>
            {units?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.code}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.0001"
            placeholder="Qty"
            value={newItem.quantity || ""}
            onChange={(e) =>
              setNewItem((prev) => ({
                ...prev,
                quantity: Number(e.target.value),
              }))
            }
            className={`${inputClass} sm:col-span-2`}
          />
          <input
            type="number"
            step="0.0001"
            placeholder="Rate"
            value={newItem.rate || ""}
            onChange={(e) =>
              setNewItem((prev) => ({ ...prev, rate: Number(e.target.value) }))
            }
            className={`${inputClass} sm:col-span-2`}
          />
          <select
            value={newItem.section ?? ""}
            onChange={(e) =>
              setNewItem((prev) => ({
                ...prev,
                section: e.target.value ? Number(e.target.value) : null,
              }))
            }
            className={`${inputClass} sm:col-span-1`}
          >
            <option value="">No section</option>
            {sectionOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="sm:col-span-1 px-3 py-1.5 text-sm rounded-lg bg-orange-500 text-white"
          >
            Add
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-steel-200/50 overflow-hidden">
        {items && items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-steel-50">
                <tr className="text-left text-xs text-steel-500 border-b border-steel-200/50">
                  <th className="px-3 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Unit</th>
                  <th className="px-3 py-2 font-medium text-right">Qty</th>
                  <th className="px-3 py-2 font-medium text-right">Rate</th>
                  <th className="px-3 py-2 font-medium text-right">Amount</th>
                  <th className="px-3 py-2 font-medium">Section</th>
                  <th className="px-3 py-2 font-medium">Linked Activity</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100">
                {groupOrder.map((groupKey) => {
                  const groupItems = groupedItems.get(groupKey);
                  if (!groupItems || groupItems.length === 0) return null;
                  const groupLabel =
                    groupKey === null
                      ? "Unsectioned"
                      : (sectionNameById.get(groupKey) ?? "—");
                  return (
                    <Fragment key={`group-${groupKey ?? "none"}`}>
                      <tr className="bg-steel-50/60">
                        <td
                          colSpan={8}
                          className="px-3 py-1.5 text-xs font-semibold text-steel-600 uppercase tracking-wide"
                        >
                          {groupLabel}
                        </td>
                      </tr>
                      {groupItems.map((item) => (
                        <tr key={item.id} className="hover:bg-steel-50/40">
                          <td className="px-3 py-1">
                            <input
                              defaultValue={item.item_code}
                              onBlur={(e) =>
                                e.target.value !== item.item_code &&
                                handleItemFieldChange(
                                  item.id,
                                  "item_code",
                                  e.target.value,
                                )
                              }
                              className={`${cellInputClass} w-20`}
                            />
                          </td>
                          <td className="px-3 py-1 min-w-50">
                            <input
                              defaultValue={item.description}
                              onBlur={(e) =>
                                e.target.value !== item.description &&
                                handleItemFieldChange(
                                  item.id,
                                  "description",
                                  e.target.value,
                                )
                              }
                              className={cellInputClass}
                            />
                          </td>
                          <td className="px-3 py-1 text-steel-500 text-xs">
                            {item.unit_code}
                          </td>
                          <td className="px-3 py-1">
                            <input
                              type="number"
                              step="0.0001"
                              defaultValue={item.quantity}
                              onBlur={(e) =>
                                Number(e.target.value) !==
                                  Number(item.quantity) &&
                                handleItemFieldChange(
                                  item.id,
                                  "quantity",
                                  Number(e.target.value),
                                )
                              }
                              className={`${cellInputClass} w-24 text-right`}
                            />
                          </td>
                          <td className="px-3 py-1">
                            <input
                              type="number"
                              step="0.0001"
                              defaultValue={item.rate}
                              onBlur={(e) =>
                                Number(e.target.value) !== Number(item.rate) &&
                                handleItemFieldChange(
                                  item.id,
                                  "rate",
                                  Number(e.target.value),
                                )
                              }
                              className={`${cellInputClass} w-28 text-right`}
                            />
                          </td>
                          <td className="px-3 py-1 text-steel-900 font-medium text-right">
                            {Number(item.amount).toLocaleString()}
                          </td>
                          <td className="px-3 py-1">
                            <select
                              defaultValue={item.section ?? ""}
                              onChange={(e) =>
                                handleItemFieldChange(
                                  item.id,
                                  "section",
                                  e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                )
                              }
                              className={`${cellInputClass} w-32`}
                            >
                              <option value="">No section</option>
                              {sectionOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-1">
                            <select
                              defaultValue={item.activity ?? ""}
                              onChange={(e) =>
                                handleItemFieldChange(
                                  item.id,
                                  "activity",
                                  e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                )
                              }
                              className={`${cellInputClass} w-36`}
                            >
                              <option value="">Not linked</option>
                              {activities?.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.code ? `${a.code} — ${a.name}` : a.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-1">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 rounded hover:bg-red-50 text-red-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-steel-500 text-center py-6">
            No items yet.
          </p>
        )}
      </div>
    </div>
  );

  const renderRevisions = () => (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-steel-200/50 divide-y">
        {revisions && revisions.length > 0 ? (
          revisions.map((rev) => (
            <div
              key={rev.id}
              className={`px-4 py-3 flex items-center justify-between ${rev.is_current ? "bg-orange-50/40" : ""}`}
            >
              <div>
                <p className="text-sm font-medium text-steel-900">
                  Revision #{rev.revision_number}
                  {rev.is_current && (
                    <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </p>
                {rev.reason && (
                  <p className="text-xs text-steel-500">{rev.reason}</p>
                )}
              </div>
              <div className="text-right text-xs text-steel-500">
                {rev.created_by_name && <p>{rev.created_by_name}</p>}
                <p>{new Date(rev.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-steel-500 p-4 text-center">
            No revisions yet.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      <BOQLayout
        boq={boq}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddSection={() => setShowSectionForm(true)}
        onAddItem={() => setShowItemForm(true)}
        onNewRevision={handleNewRevision}
        onDuplicate={handleDuplicate}
        onImport={() => navigate(`/projects/${pid}/boq/${bid}/import`)}
        busy={busy}
      >
        {actionError && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">
            {actionError}
          </div>
        )}
        <div className="min-h-96">
          {activeTab === "overview" && renderOverview()}
          {activeTab === "sections" && renderSections()}
          {activeTab === "items" && renderItems()}
          {activeTab === "revisions" && renderRevisions()}
        </div>
      </BOQLayout>
    </div>
  );
}
