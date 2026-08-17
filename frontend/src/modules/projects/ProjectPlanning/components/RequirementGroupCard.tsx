// frontend/src/modules/projects/ProjectPlanning/components/RequirementGroupCard.tsx
import { useState } from "react";
import {
  Package,
  Users,
  Truck,
  Hammer,
  HardHat,
  Briefcase,
  UserPlus,
  Calendar,
  CheckCircle2,
  XCircle,
  Ban,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  updateRequirementGroup,
  markRequirementGroupNotRequired,
  reopenRequirementGroup,
  approveRequirementGroup,
  requestRequirementGroupChanges,
} from "@/services/planning";
import { listMyCompanyUsers } from "@/services/users";
import { useFetch } from "@/hooks/useFetch";
import type { RequirementGroup, RequirementGroupType } from "@/types/planning";

interface RequirementGroupCardProps {
  projectId: number;
  activityId: number;
  group: RequirementGroup;
  canManage: boolean; // PM / company manager — assign, mark not required, approve, request changes
  canReview: boolean; // PM / QS / company manager — approve, request changes (subset of canManage)
  onUpdate: () => void;
  children?: React.ReactNode; // the item list for this group, supplied by the parent

  // --- New: header fraction badge + single top-right "+" add button ---
  // approvedCount/totalCount drive the "{approved}/{total}" badge next to
  // the title. Either can be omitted (e.g. Materials doesn't report counts
  // back yet) and the badge falls back to group.item_count.
  approvedCount?: number;
  totalCount?: number;
  // Called when the "+" button is clicked. The parent wires this to the
  // specific item list's openAdd() so there's exactly one add entry point
  // instead of the old scattered "Add X" buttons.
  onAddClick?: () => void;
  canAddItems?: boolean;
}

const GROUP_ICON: Record<RequirementGroupType, React.ElementType> = {
  materials: Package,
  labour: Users,
  plant_equipment: Truck,
  tools: Hammer,
  ppe_safety: HardHat,
  services: Briefcase,
};

const STATUS_COLOR: Record<RequirementGroup["status"], string> = {
  not_required: "bg-steel-100 text-steel-500",
  pending_assignment: "bg-steel-100 text-steel-600",
  assigned: "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700",
  submitted: "bg-amber-50 text-amber-700",
  changes_requested: "bg-red-50 text-red-700",
  approved: "bg-green-50 text-green-700",
};

export function RequirementGroupCard({
  projectId,
  activityId,
  group,
  canManage,
  canReview,
  onUpdate,
  children,
  approvedCount,
  totalCount,
  onAddClick,
  canAddItems,
}: RequirementGroupCardProps) {
  const [assigning, setAssigning] = useState(false);
  const [editingDates, setEditingDates] = useState(false);
  const [showChangesForm, setShowChangesForm] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // "More information" is collapsed by default — responsible/dates/mark-
  // not-required now live here instead of always being on screen.
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [requiredOnSite, setRequiredOnSite] = useState(
    group.required_on_site ?? "",
  );
  const [procurementDeadline, setProcurementDeadline] = useState(
    group.procurement_deadline ?? "",
  );
  const [alertDaysBefore, setAlertDaysBefore] = useState(
    group.alert_days_before?.toString() ?? "",
  );
  const { data: employees } = useFetch(() => listMyCompanyUsers(), []);

  const Icon = GROUP_ICON[group.group_type];
  const isNotRequired = group.status === "not_required";
  const displayTotal = totalCount ?? group.item_count;

  async function run(fn: () => Promise<RequirementGroup>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      onUpdate();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "That action didn't go through.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAssign() {
    if (!selectedUserId) return;
    await run(() =>
      updateRequirementGroup(projectId, activityId, group.id, {
        responsible: Number(selectedUserId),
      }),
    );
    setAssigning(false);
    setSelectedUserId("");
  }

  async function handleSaveDates() {
    await run(() =>
      updateRequirementGroup(projectId, activityId, group.id, {
        required_on_site: requiredOnSite || null,
        procurement_deadline: procurementDeadline || null,
        alert_days_before: alertDaysBefore ? Number(alertDaysBefore) : null,
      }),
    );
    setEditingDates(false);
  }

  async function handleMarkNotRequired() {
    await run(() =>
      markRequirementGroupNotRequired(projectId, activityId, group.id),
    );
  }

  async function handleReopen() {
    await run(() => reopenRequirementGroup(projectId, activityId, group.id));
  }

  async function handleApprove() {
    await run(() => approveRequirementGroup(projectId, activityId, group.id));
  }

  async function handleRequestChanges() {
    if (!note.trim()) return;
    await run(() =>
      requestRequirementGroupChanges(
        projectId,
        activityId,
        group.id,
        note.trim(),
      ),
    );
    setNote("");
    setShowChangesForm(false);
  }

  return (
    <div className="bg-white border border-steel-200/60 rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-500 shrink-0">
              <Icon size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-steel-900 truncate">
                  {group.group_type_display}
                </p>
                {!isNotRequired && (
                  <span className="text-xs font-medium text-steel-500 bg-steel-100 px-1.5 py-0.5 rounded shrink-0">
                    {approvedCount ?? "—"}/{displayTotal}
                  </span>
                )}
              </div>
              <p className="text-xs text-steel-400">
                {isNotRequired
                  ? "Not applicable to this activity"
                  : `${group.item_count} item${group.item_count !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-xs px-2.5 py-1 rounded-full ${STATUS_COLOR[group.status]}`}
            >
              {group.status_display}
            </span>
            {/* Single add entry point for this group — replaces the old
                per-list "Add X" button. Parent decides whether this
                group's item list actually supports it (Materials has its
                own catalog-picker flow and may not wire onAddClick). */}
            {!isNotRequired && canAddItems && onAddClick && (
              <button
                onClick={onAddClick}
                className="p-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                title={`Add ${group.group_type_display}`}
              >
                <Plus size={15} />
              </button>
            )}
          </div>
        </div>

        {!isNotRequired && (
          <>
            {group.review_note && group.status === "changes_requested" && (
              <p className="mt-3 text-xs text-red-700 bg-red-50 p-2 rounded-lg">
                {group.review_note}
              </p>
            )}

            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

            {/* Review actions — only when items are all submitted. Kept
                visible (not tucked under "More information") since
                approving/requesting changes is a primary action for
                reviewers, not background metadata. */}
            {canReview && group.status === "submitted" && !showChangesForm && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleApprove}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-green-600 text-white rounded-lg py-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 size={13} />
                  Approve Group
                </button>
                <button
                  onClick={() => setShowChangesForm(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg py-1.5 hover:bg-red-50"
                >
                  <XCircle size={13} />
                  Request Changes
                </button>
              </div>
            )}

            {showChangesForm && (
              <div className="mt-3 space-y-1.5">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What needs to change?"
                  className="w-full border border-steel-200 rounded-lg px-3 py-1.5 text-sm"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleRequestChanges}
                    disabled={busy || !note.trim()}
                    className="flex-1 text-xs font-medium bg-red-600 text-white rounded-lg py-1.5 disabled:opacity-50"
                  >
                    Send
                  </button>
                  <button
                    onClick={() => setShowChangesForm(false)}
                    className="flex-1 text-xs font-medium border border-steel-200 rounded-lg py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* "More information" — responsible person, on-site/procurement
                dates, and mark-as-not-required now live behind this
                toggle instead of always being rendered. */}
            <button
              onClick={() => setShowMoreInfo((v) => !v)}
              className="mt-3 flex items-center gap-1 text-xs font-medium text-steel-500 hover:text-steel-700"
            >
              {showMoreInfo ? (
                <ChevronUp size={13} />
              ) : (
                <ChevronDown size={13} />
              )}
              More information
            </button>

            {showMoreInfo && (
              <div className="mt-2 pt-3 border-t border-steel-100 space-y-3">
                {/* Responsible */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-steel-500">
                    <span className="text-steel-400">Responsible: </span>
                    {group.responsible_name || "Not assigned"}
                  </p>
                  {canManage && !assigning && (
                    <button
                      onClick={() => setAssigning(true)}
                      className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700"
                    >
                      <UserPlus size={12} />
                      {group.responsible_name ? "Reassign" : "Assign"}
                    </button>
                  )}
                </div>

                {assigning && (
                  <div className="flex flex-col gap-2">
                    <select
                      value={selectedUserId}
                      onChange={(e) =>
                        setSelectedUserId(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      className="w-full border border-steel-200 rounded-lg px-3 py-1.5 text-sm bg-white"
                    >
                      <option value="">Select a person...</option>
                      {employees?.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAssign}
                        disabled={!selectedUserId || busy}
                        className="flex-1 text-xs font-medium bg-orange-500 text-white rounded-lg py-1.5 disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setAssigning(false)}
                        className="flex-1 text-xs font-medium border border-steel-200 rounded-lg py-1.5 text-steel-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-steel-500 flex items-center gap-1">
                    <Calendar size={12} className="text-steel-400" />
                    {group.required_on_site
                      ? `Needed on site: ${new Date(group.required_on_site).toLocaleDateString()}`
                      : "No on-site date set"}
                    {group.procurement_deadline &&
                      ` · Procure by: ${new Date(group.procurement_deadline).toLocaleDateString()}`}
                  </p>
                  {canManage && !editingDates && (
                    <button
                      onClick={() => setEditingDates(true)}
                      className="text-xs font-medium text-orange-600 hover:text-orange-700 shrink-0"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {group.required_on_site && (
                  <p className="text-xs text-steel-400">
                    Storekeeper gets alerted {group.alert_days_before ?? 2} day
                    {(group.alert_days_before ?? 2) !== 1 ? "s" : ""} before —
                    {group.alert_sent_at ? " already sent" : " not sent yet"}
                  </p>
                )}

                {editingDates && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-steel-500 block mb-1">
                        Required on site
                      </label>
                      <input
                        type="date"
                        value={requiredOnSite}
                        onChange={(e) => setRequiredOnSite(e.target.value)}
                        className="w-full border border-steel-200 rounded-lg px-2 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-steel-500 block mb-1">
                        Procure by
                      </label>
                      <input
                        type="date"
                        value={procurementDeadline}
                        onChange={(e) => setProcurementDeadline(e.target.value)}
                        className="w-full border border-steel-200 rounded-lg px-2 py-1.5 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-steel-500 block mb-1">
                        Alert storekeeper how many days before?
                      </label>
                      <input
                        type="number"
                        min={0}
                        placeholder="Leave blank for 2 days"
                        value={alertDaysBefore}
                        onChange={(e) => setAlertDaysBefore(e.target.value)}
                        className="w-full border border-steel-200 rounded-lg px-2 py-1.5 text-xs"
                      />
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <button
                        onClick={handleSaveDates}
                        disabled={busy}
                        className="flex-1 text-xs font-medium bg-orange-500 text-white rounded-lg py-1.5 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingDates(false)}
                        className="flex-1 text-xs font-medium border border-steel-200 rounded-lg py-1.5 text-steel-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {canManage && (
                  <button
                    onClick={handleMarkNotRequired}
                    disabled={busy}
                    className="flex items-center gap-1.5 text-xs text-steel-400 hover:text-steel-600"
                  >
                    <Ban size={12} />
                    Mark as not required for this activity
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {isNotRequired && canManage && (
          <button
            onClick={handleReopen}
            disabled={busy}
            className="mt-2 text-xs font-medium text-orange-600 hover:text-orange-700 disabled:opacity-50"
          >
            This group is actually needed →
          </button>
        )}
      </div>

      {!isNotRequired && (
        <div className="border-t border-steel-100 bg-steel-50/40 p-4">
          {children}
        </div>
      )}
    </div>
  );
}
