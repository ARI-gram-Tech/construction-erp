// /src/modules/tenders/components/TenderItemsTab.tsx
import { useMemo, useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import {
  listTenderItems,
  createTenderItem,
  updateTenderItem,
  deleteTenderItem,
  listTenderSections,
  createTenderSection,
} from "@/services/tenders";
import type { TenderBOQItem, TenderBOQItemPayload } from "@/types/tender";
import { Plus, Trash2, Pencil, Check, X, FolderPlus } from "lucide-react";

interface TenderItemsTabProps {
  tenderId: number;
  canEdit: boolean;
  onChanged: () => void;
}

const EMPTY_DRAFT: TenderBOQItemPayload = {
  description: "",
  unit: "",
  quantity: 0,
  rate: 0,
  section: null,
};

export function TenderItemsTab({
  tenderId,
  canEdit,
  onChanged,
}: TenderItemsTabProps) {
  const { data: items, reload: reloadItems } = useFetch(
    () => listTenderItems(tenderId),
    [tenderId],
  );
  const { data: sections, reload: reloadSections } = useFetch(
    () => listTenderSections(tenderId),
    [tenderId],
  );

  const [addingRow, setAddingRow] = useState(false);
  const [draft, setDraft] = useState<TenderBOQItemPayload>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<TenderBOQItemPayload>(EMPTY_DRAFT);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const sectionMap = useMemo(() => {
    const map = new Map<number, string>();
    sections?.forEach((s) => map.set(s.id, s.title));
    return map;
  }, [sections]);

  const total = useMemo(
    () => (items ?? []).reduce((sum, i) => sum + Number(i.amount), 0),
    [items],
  );

  function reloadAll() {
    reloadItems();
    onChanged();
  }

  async function handleAdd() {
    if (!draft.description.trim() || !draft.unit.trim()) return;
    setSaving(true);
    try {
      await createTenderItem(tenderId, draft);
      setDraft(EMPTY_DRAFT);
      setAddingRow(false);
      reloadAll();
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: TenderBOQItem) {
    setEditingId(item.id);
    setEditDraft({
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      rate: item.rate,
      item_code: item.item_code,
      section: item.section,
    });
  }

  async function handleSaveEdit(id: number) {
    setSaving(true);
    try {
      await updateTenderItem(tenderId, id, editDraft);
      setEditingId(null);
      reloadAll();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this line item?")) return;
    await deleteTenderItem(tenderId, id);
    reloadAll();
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-steel-200/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-steel-200/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-steel-900">
            Line Items ({items?.length ?? 0})
          </h3>
          {canEdit && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSectionModal(true)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-steel-300 text-steel-600 hover:bg-steel-50"
              >
                <FolderPlus size={14} />
                New Section
              </button>
              <button
                onClick={() => setAddingRow(true)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600"
              >
                <Plus size={14} />
                Add Item
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-steel-500 border-b border-steel-200/50 bg-steel-50/50">
                <th className="px-4 py-2.5 font-medium">Code</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 font-medium">Section</th>
                <th className="px-4 py-2.5 font-medium">Unit</th>
                <th className="px-4 py-2.5 font-medium text-right">Qty</th>
                <th className="px-4 py-2.5 font-medium text-right">Rate</th>
                <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                {canEdit && (
                  <th className="px-4 py-2.5 font-medium text-right">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-100">
              {items?.map((item) =>
                editingId === item.id ? (
                  <tr key={item.id} className="bg-orange-50/30">
                    <td className="px-4 py-2">
                      <input
                        value={editDraft.item_code ?? ""}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            item_code: e.target.value,
                          }))
                        }
                        className="w-20 border border-steel-300 rounded px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={editDraft.description}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            description: e.target.value,
                          }))
                        }
                        className="w-full border border-steel-300 rounded px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={editDraft.section ?? ""}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            section: e.target.value
                              ? Number(e.target.value)
                              : null,
                          }))
                        }
                        className="border border-steel-300 rounded px-2 py-1 text-xs"
                      >
                        <option value="">—</option>
                        {sections?.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={editDraft.unit}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, unit: e.target.value }))
                        }
                        className="w-16 border border-steel-300 rounded px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={editDraft.quantity}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            quantity: e.target.value,
                          }))
                        }
                        className="w-20 border border-steel-300 rounded px-2 py-1 text-xs text-right"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={editDraft.rate}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, rate: e.target.value }))
                        }
                        className="w-24 border border-steel-300 rounded px-2 py-1 text-xs text-right"
                      />
                    </td>
                    <td className="px-4 py-2 text-right text-steel-500 text-xs">
                      {(
                        Number(editDraft.quantity) * Number(editDraft.rate)
                      ).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          disabled={saving}
                          className="p-1.5 rounded hover:bg-green-50 text-green-600"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded hover:bg-steel-100 text-steel-400"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id} className="hover:bg-steel-50/60">
                    <td className="px-4 py-2.5 text-steel-500 font-mono text-xs">
                      {item.item_code || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-steel-900">
                      {item.description}
                    </td>
                    <td className="px-4 py-2.5 text-steel-500 text-xs">
                      {item.section
                        ? (sectionMap.get(item.section) ?? "—")
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-steel-500">{item.unit}</td>
                    <td className="px-4 py-2.5 text-right">
                      {Number(item.quantity).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {Number(item.rate).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {Number(item.amount).toLocaleString()}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEdit(item)}
                            className="p-1.5 rounded hover:bg-steel-100 text-steel-400 hover:text-steel-600"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-steel-400 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ),
              )}

              {addingRow && (
                <tr className="bg-orange-50/30">
                  <td className="px-4 py-2">
                    <input
                      placeholder="Code"
                      value={draft.item_code ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, item_code: e.target.value }))
                      }
                      className="w-20 border border-steel-300 rounded px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      placeholder="Description"
                      value={draft.description}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, description: e.target.value }))
                      }
                      className="w-full border border-steel-300 rounded px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={draft.section ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          section: e.target.value
                            ? Number(e.target.value)
                            : null,
                        }))
                      }
                      className="border border-steel-300 rounded px-2 py-1 text-xs"
                    >
                      <option value="">—</option>
                      {sections?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      placeholder="Unit"
                      value={draft.unit}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, unit: e.target.value }))
                      }
                      className="w-16 border border-steel-300 rounded px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      placeholder="0"
                      value={draft.quantity}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, quantity: e.target.value }))
                      }
                      className="w-20 border border-steel-300 rounded px-2 py-1 text-xs text-right"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      placeholder="0"
                      value={draft.rate}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, rate: e.target.value }))
                      }
                      className="w-24 border border-steel-300 rounded px-2 py-1 text-xs text-right"
                    />
                  </td>
                  <td className="px-4 py-2 text-right text-steel-500 text-xs">
                    {(
                      Number(draft.quantity) * Number(draft.rate)
                    ).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={handleAdd}
                        disabled={saving}
                        className="p-1.5 rounded hover:bg-green-50 text-green-600"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setAddingRow(false);
                          setDraft(EMPTY_DRAFT);
                        }}
                        className="p-1.5 rounded hover:bg-steel-100 text-steel-400"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {(!items || items.length === 0) && !addingRow && (
                <tr>
                  <td
                    colSpan={canEdit ? 8 : 7}
                    className="px-4 py-8 text-center text-steel-500 text-sm"
                  >
                    No line items yet.{" "}
                    {canEdit && "Add one manually or use the Import tab."}
                  </td>
                </tr>
              )}
            </tbody>
            {items && items.length > 0 && (
              <tfoot>
                <tr className="border-t border-steel-200/50 bg-steel-50/50 font-medium">
                  <td
                    colSpan={6}
                    className="px-4 py-3 text-right text-steel-600"
                  >
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-steel-900">
                    {total.toLocaleString()}
                  </td>
                  {canEdit && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {showSectionModal && (
        <NewSectionModal
          onClose={() => setShowSectionModal(false)}
          onCreate={async (title) => {
            await createTenderSection(tenderId, { title });
            reloadSections();
            setShowSectionModal(false);
          }}
        />
      )}
    </div>
  );
}

function NewSectionModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (title: string) => void;
}) {
  const [title, setTitle] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-steel-900">New Section</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Earthworks, Concrete, Finishes"
          className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50"
          >
            Cancel
          </button>
          <button
            onClick={() => title.trim() && onCreate(title.trim())}
            className="px-3.5 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
