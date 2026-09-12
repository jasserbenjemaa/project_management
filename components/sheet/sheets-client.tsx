"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createSheet, renameSheet, deleteSheet } from "@/app/actions/sheet";
import type { RowData } from "@/components/sheet/sheet-table";

const SheetTable = dynamic(() => import("@/components/sheet/sheet-table"), {
  ssr: false,
});

// projectId is present (non-null) when this sheet belongs to a project.
// Those sheets are auto-created ("FiAv-{project name}") and can't be
// renamed or deleted from here while the project still exists.
type SheetTab = { id: string; name: string; projectId: string | null };

const VISIBLE_TAB_COUNT = 4;

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

  const activeProjectId =
    localTabs.find((t) => t.id === sheetId)?.projectId ?? null;

  // Only show VISIBLE_TAB_COUNT tabs directly; the rest live behind the
  // "More" search menu. If the active sheet isn't among the first N, swap
  // it in for the last slot so the current tab is always visible/highlighted.
  const { visibleTabs, overflowTabs } = useMemo(() => {
    const first = localTabs.slice(0, VISIBLE_TAB_COUNT);
    const rest = localTabs.slice(VISIBLE_TAB_COUNT);

    const activeInFirst = first.some((t) => t.id === sheetId);
    if (activeInFirst || first.length < VISIBLE_TAB_COUNT) {
      return { visibleTabs: first, overflowTabs: rest };
    }

    const activeInRest = rest.find((t) => t.id === sheetId);
    if (!activeInRest) {
      return { visibleTabs: first, overflowTabs: rest };
    }

    // Swap the active tab into the last visible slot, push the bumped
    // tab back into the overflow list (kept in original relative order).
    const bumped = first[first.length - 1];
    const swappedFirst = [...first.slice(0, -1), activeInRest];
    const swappedRest = rest
      .filter((t) => t.id !== activeInRest.id)
      .flatMap((t) => (t.id === bumped.id ? [] : [t]));
    // Re-insert bumped tab where activeInRest was, roughly — simplest is
    // just prepending it so it's easy to find again in the menu.
    return {
      visibleTabs: swappedFirst,
      overflowTabs: [bumped, ...swappedRest],
    };
  }, [localTabs, sheetId]);

  // --- "More" menu: searchable dropdown for overflow tabs ---
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [moreSearch, setMoreSearch] = useState("");
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const moreSearchInputRef = useRef<HTMLInputElement | null>(null);

  const filteredOverflowTabs = useMemo(() => {
    const q = moreSearch.trim().toLowerCase();
    if (!q) return overflowTabs;
    return overflowTabs.filter((t) => t.name.toLowerCase().includes(q));
  }, [overflowTabs, moreSearch]);

  useEffect(() => {
    if (!moreMenuOpen) return;
    moreSearchInputRef.current?.focus();

    const onDocMouseDown = (e: MouseEvent) => {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target as Node)
      ) {
        setMoreMenuOpen(false);
      }
    };
    const onDocKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [moreMenuOpen]);

  useEffect(() => {
    if (!moreMenuOpen) setMoreSearch("");
  }, [moreMenuOpen]);

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

  const selectFromMoreMenu = (id: string) => {
    setMoreMenuOpen(false);
    handleSelectTab(id);
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
        <SheetTable
          key={sheetId}
          sheetId={sheetId}
          projectId={activeProjectId}
          initialRows={initialRows}
        />
      </div>

      <div className="flex items-center gap-1 border-t border-gray-200 bg-gray-50 px-2 py-1">
        {visibleTabs.map((tab) => {
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
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs cursor-pointer select-none border shrink-0 ${
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

        {overflowTabs.length > 0 && (
          <div className="relative shrink-0" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setMoreMenuOpen((prev) => !prev)}
              className={`px-2 py-1.5 text-xs rounded-t-md border shrink-0 ${
                moreMenuOpen
                  ? "bg-white border-gray-300 border-b-white -mb-px text-gray-900"
                  : "bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200"
              }`}
              title="More sheets"
            >
              More ({overflowTabs.length}) ▾
            </button>

            {moreMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: 0,
                  marginBottom: 4,
                  zIndex: 50,
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  width: 240,
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>
                  <input
                    ref={moreSearchInputRef}
                    value={moreSearch}
                    onChange={(e) => setMoreSearch(e.target.value)}
                    placeholder="Search sheets…"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "6px 8px",
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      fontSize: 12,
                      outline: "none",
                    }}
                  />
                </div>
                <div style={{ maxHeight: 240, overflowY: "auto" }}>
                  {filteredOverflowTabs.length === 0 && (
                    <div
                      style={{
                        padding: "8px 10px",
                        fontSize: 12,
                        color: "#9ca3af",
                      }}
                    >
                      No matching sheets
                    </div>
                  )}
                  {filteredOverflowTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => selectFromMoreMenu(tab.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 10px",
                        border: "none",
                        background:
                          tab.id === sheetId ? "#eef2ff" : "transparent",
                        color: "#111827",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      {tab.projectId !== null && (
                        <span className="text-gray-400" aria-hidden>
                          🔒
                        </span>
                      )}
                      {tab.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleAddTab}
          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded shrink-0"
          title="Add sheet"
        >
          +
        </button>
      </div>
    </div>
  );
}
