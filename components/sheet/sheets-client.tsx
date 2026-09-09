"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSheet, renameSheet, deleteSheet } from "@/app/actions/sheet";
import type { RowData } from "@/components/sheet/sheet-table";

const SheetTable = dynamic(() => import("@/components/sheet/sheet-table"), {
  ssr: false,
});

// projectId is present (non-null) when this sheet belongs to a project.
// Those sheets are auto-created ("FiAv-{project name}") and can't be
// renamed or deleted from here while the project still exists.
type SheetTab = { id: string; name: string; projectId: string | null };

export default function SheetsClient({
  tabs,
  sheetId,
  initialRows,
}: {
  tabs: SheetTab[];
  sheetId: string;
  initialRows: RowData[];
}) {
  const router = useRouter();

  const [localTabs, setLocalTabs] = useState(tabs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // useState(tabs) only seeds the initial value — it does NOT resync when
  // the `tabs` prop changes on a later render (e.g. after router.push to a
  // new ?id=, or router.refresh()). Without this, newly added/deleted
  // sheets only show up after a hard reload. Keep localTabs mirrored to
  // whatever the server actually sent down.
  useEffect(() => {
    setLocalTabs(tabs);
  }, [tabs]);

  const handleAddTab = async () => {
    const created = await createSheet(`Sheet ${localTabs.length + 1}`);
    // Optimistic: show the new tab immediately instead of waiting for the
    // navigation + server round trip to resolve.
    setLocalTabs((prev) => [...prev, created]);
    router.push(`/sheets?id=${created.id}`);
  };

  const handleSelectTab = (id: string) => {
    if (id !== sheetId) router.push(`/sheets?id=${id}`);
  };

  const startRename = (tab: SheetTab) => {
    // Project-backed sheets stay in sync with the project name; don't
    // let them be renamed independently here.
    if (tab.projectId) return;
    setEditingId(tab.id);
    setEditingValue(tab.name);
  };

  const commitRename = async (id: string) => {
    const name = editingValue.trim();
    setEditingId(null);
    if (!name) return;
    setLocalTabs((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
    await renameSheet(id, name);
    router.refresh();
  };

  const handleDeleteTab = async (tab: SheetTab) => {
    if (tab.projectId) {
      window.alert(
        "This sheet belongs to a project and can't be deleted while the project exists.",
      );
      return;
    }

    if (!window.confirm("Delete this sheet? This cannot be undone.")) return;

    await deleteSheet(tab.id);
    const remaining = localTabs.filter((t) => t.id !== tab.id);

    if (remaining.length === 0) {
      // Don't create the replacement sheet here. page.tsx already creates
      // one whenever listSheets() comes back empty — having both places
      // do it races and produces two empty sheets (client creates one,
      // then the server render sees a still-stale empty list and creates
      // a second). Just hand off to the server and let it decide.
      router.replace(`/sheets`);
      return;
    }

    if (tab.id === sheetId) {
      router.replace(`/sheets?id=${remaining[0].id}`);
    } else {
      setLocalTabs(remaining);
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col h-svh">
      <div className="flex-1 min-h-0 p-2">
        <SheetTable key={sheetId} sheetId={sheetId} initialRows={initialRows} />
      </div>

      <div className="flex items-center gap-1 border-t border-gray-200 bg-gray-50 px-2 py-1 overflow-x-auto">
        {localTabs.map((tab) => {
          const isActive = tab.id === sheetId;
          const isEditing = editingId === tab.id;
          const isProjectSheet = tab.projectId !== null;
          return (
            <div
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              onDoubleClick={() => startRename(tab)}
              title={
                isProjectSheet
                  ? "Linked to a project — renamed/deleted automatically"
                  : undefined
              }
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs cursor-pointer select-none border ${
                isActive
                  ? "bg-white border-gray-300 border-b-white -mb-px font-medium text-gray-900"
                  : "bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200"
              }`}
            >
              {isEditing ? (
                <input
                  autoFocus
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={() => commitRename(tab.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(tab.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-24 bg-white border border-gray-300 rounded px-1 text-xs outline-none"
                />
              ) : (
                <span className="whitespace-nowrap flex items-center gap-1">
                  {isProjectSheet && (
                    <span className="text-gray-400" aria-hidden>
                      🔒
                    </span>
                  )}
                  {tab.name}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTab(tab);
                }}
                disabled={isProjectSheet}
                className={`leading-none ${
                  isProjectSheet
                    ? "opacity-0 pointer-events-none"
                    : "opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
                }`}
                title={isProjectSheet ? undefined : "Delete sheet"}
              >
                ×
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={handleAddTab}
          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded"
          title="Add sheet"
        >
          +
        </button>
      </div>
    </div>
  );
}
