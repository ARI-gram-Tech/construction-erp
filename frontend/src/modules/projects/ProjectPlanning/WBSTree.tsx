// frontend/src/modules/projects/ProjectPlanning/WBSTree.tsx
import { forwardRef, useImperativeHandle, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronRight,
  ChevronDown,
  FolderTree,
  Plus,
  Trash2,
  FolderOpen,
} from "lucide-react";
import { createWBSNode, deleteWBSNode } from "@/services/planning";
import { ConfirmDeleteModal } from "./components/ConfirmDeleteModal";
import type { Activity, WBSNode } from "@/types/planning";

interface WBSTreeProps {
  projectId: number;
  nodes: WBSNode[];
  activities: Activity[];
  onChange: () => void;
}

export interface WBSTreeHandle {
  openAddSection: () => void;
}

interface TreeNode extends WBSNode {
  children: TreeNode[];
}

function buildTree(nodes: WBSNode[]): TreeNode[] {
  const map = new Map<number, TreeNode>();
  nodes.forEach((n) => map.set(n.id, { ...n, children: [] }));
  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.parent && map.has(node.parent)) {
      map.get(node.parent)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function rollup(
  node: TreeNode,
  activities: Activity[],
): { count: number; avgPercent: number | null } {
  const nodeIds = new Set<number>();
  function collect(n: TreeNode) {
    nodeIds.add(n.id);
    n.children.forEach(collect);
  }
  collect(node);

  const matched = activities.filter(
    (a) => a.wbs !== null && nodeIds.has(a.wbs),
  );
  if (matched.length === 0) return { count: 0, avgPercent: null };
  const avg = Math.round(
    matched.reduce((sum, a) => sum + a.percent_complete, 0) / matched.length,
  );
  return { count: matched.length, avgPercent: avg };
}

function TreeRow({
  node,
  depth,
  projectId,
  activities,
  onChange,
  onAddChild,
}: {
  node: TreeNode;
  depth: number;
  projectId: number;
  activities: Activity[];
  onChange: () => void;
  onAddChild: (parent: TreeNode) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const hasChildren = node.children.length > 0;
  const { count, avgPercent } = rollup(node, activities);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteWBSNode(projectId, node.id);
      setShowDeleteConfirm(false);
      onChange();
    } catch (err: any) {
      setDeleteError(
        err?.response?.data?.detail ||
          "Couldn't delete this section — it may still have activities linked.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-orange-50/50 group transition-colors duration-150"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`text-steel-400 hover:text-steel-600 transition-colors ${hasChildren ? "" : "invisible"}`}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {depth === 0 ? (
            <FolderOpen size={16} className="text-orange-400 shrink-0" />
          ) : (
            <FolderTree size={14} className="text-steel-400 shrink-0" />
          )}
          <span className="text-xs font-mono text-steel-400 bg-steel-50 px-2 py-0.5 rounded shrink-0">
            {node.code}
          </span>
          <span className="text-sm text-steel-800 truncate">{node.name}</span>
          {count > 0 && (
            <span className="text-xs text-steel-400 shrink-0">
              ({count} activit{count === 1 ? "y" : "ies"} · {avgPercent}%)
            </span>
          )}
        </div>
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
          <button
            onClick={() => onAddChild(node)}
            className="p-1 rounded-lg hover:bg-steel-100 text-steel-400 hover:text-steel-600 transition-colors"
            title="Add sub-item"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1 rounded-lg hover:bg-red-50 text-steel-400 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {expanded &&
        node.children.map((child) => (
          <TreeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            projectId={projectId}
            activities={activities}
            onChange={onChange}
            onAddChild={onAddChild}
          />
        ))}

      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        title="Move WBS section to Recycle Bin?"
        itemName={`${node.code} ${node.name}`}
        consequences={[
          "This section will be hidden from the active schedule.",
          "Project Managers can restore this item from the Recycle Bin within 30 days.",
          ...(hasChildren
            ? [
                `${node.children.length} nested sub-section(s) will also be moved`,
              ]
            : []),
        ]}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
        confirming={deleting}
      />
      {deleteError && showDeleteConfirm && (
        <p className="text-xs text-red-500 px-3">{deleteError}</p>
      )}
    </>
  );
}

export const WBSTree = forwardRef<WBSTreeHandle, WBSTreeProps>(function WBSTree(
  { projectId, nodes, activities, onChange },
  ref,
) {
  const tree = buildTree(nodes);
  const [showModal, setShowModal] = useState(false);
  const [parentFor, setParentFor] = useState<TreeNode | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function openAdd(parent: TreeNode | null) {
    setParentFor(parent);
    setCode("");
    setName("");
    setShowModal(true);
  }

  useImperativeHandle(ref, () => ({
    openAddSection: () => openAdd(null),
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setSubmitting(true);
    try {
      await createWBSNode(projectId, {
        code,
        name,
        parent: parentFor?.id ?? null,
      });
      setShowModal(false);
      onChange();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-steel-100">
        <h3 className="text-sm font-semibold text-steel-900 flex items-center gap-2">
          <div className="p-1.5 bg-orange-50 rounded-lg text-orange-500">
            <FolderTree size={16} />
          </div>
          Work Breakdown Structure
          <span className="text-xs text-steel-400 font-normal ml-1">
            ({nodes.length} items)
          </span>
        </h3>
      </div>

      <div className="p-2">
        {tree.length === 0 ? (
          <div className="py-8 text-center">
            <FolderTree size={32} className="text-steel-300 mx-auto mb-3" />
            <p className="text-sm text-steel-500">
              No WBS structure defined yet.
            </p>
            <p className="text-xs text-steel-400 mt-1">
              Start with a top-level section like "Foundations" or
              "Superstructure"
            </p>
            <button
              onClick={() => openAdd(null)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              <Plus size={14} />
              Create First Section
            </button>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-steel-100/50">
            {tree.map((node) => (
              <TreeRow
                key={node.id}
                node={node}
                depth={0}
                projectId={projectId}
                activities={activities}
                onChange={onChange}
                onAddChild={openAdd}
              />
            ))}
          </div>
        )}
      </div>

      {showModal &&
        createPortal(
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-steel-200/60 animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-50 rounded-xl">
                  <FolderTree size={20} className="text-orange-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-steel-900">
                    {parentFor ? `Add Sub-section` : "Add Top-Level Section"}
                  </h3>
                  {parentFor && (
                    <p className="text-xs text-steel-500">
                      Under "{parentFor.name}"
                    </p>
                  )}
                </div>
              </div>

              <p className="text-xs text-steel-500 mb-4 bg-steel-50 p-2 rounded-lg">
                {parentFor
                  ? `Code will be nested under ${parentFor.code} (e.g., ${parentFor.code}.1)`
                  : "Use sequential codes like 1, 2, 3..."}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-steel-600 block mb-1.5">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    placeholder="e.g. 2.1"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full border border-steel-200 rounded-lg px-3.5 py-2.5 text-sm bg-steel-50/50 hover:bg-white focus:bg-white transition-colors duration-200"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-steel-600 block mb-1.5">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    placeholder="e.g. Excavation"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-steel-200 rounded-lg px-3.5 py-2.5 text-sm bg-steel-50/50 hover:bg-white focus:bg-white transition-colors duration-200"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-steel-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-steel-200 text-steel-700 hover:bg-steel-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white transition-all duration-200 disabled:opacity-60 shadow-sm hover:shadow-md flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Section"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
});
