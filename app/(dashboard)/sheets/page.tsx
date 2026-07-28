"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  listSheets,
  createSheet,
  renameSheet,
  deleteSheet,
  loadSheet,
} from "@/app/actions/sheet";
import type { RowData } from "@/components/sheet/sheet-table";

const SheetTable = dynamic(() => import("@/components/sheet/sheet-table"), {
  ssr: false,
});

type SheetTab = { id: string; name: string };

const ProgressSheetPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sheetId = searchParams.get("id") ?? "";

  const [tabs, setTabs] = useState<SheetTab[]>([]);
  const [rows, setRows] = useState<RowData[] | null>(null);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // Load the tab list once, and make sure the id in the URL is valid —
  // otherwise fall back to the first tab (or create one if none exist).
  useEffect(() => {
    (async () => {
      const list = await listSheets();

      if (list.length === 0) {
        const created = await createSheet("Sheet 1");
        router.replace(`/sheets?id=${created.id}`);
        return;
      }

      setTabs(list);

      if (!sheetId || !list.some((t) => t.id === sheetId)) {
        router.replace(`/sheets?id=${list[0].id}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whenever the active sheet id changes, load *only its rows*.
  // Columns are a fixed shape defined in SheetTable and are never
  // read from or written to per-sheet — every tab has the same columns.
  useEffect(() => {
    if (!sheetId) return;
    let cancelled = false;
    setRowsLoading(true);
    setRows(null);

    (async () => {
      try {
        const saved = await loadSheet(sheetId);
        if (cancelled) return;
        setRows(saved?.rows ?? []);
      } catch (err) {
        console.error("Failed to load sheet", err);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setRowsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sheetId]);

  const handleAddTab = async () => {
    const created = await createSheet(`Sheet ${tabs.length + 1}`);
    setTabs((prev) => [...prev, created]);
    router.push(`/sheets?id=${created.id}`);
  };

  const handleSelectTab = (id: string) => {
    if (id !== sheetId) router.push(`/sheets?id=${id}`);
  };

  const startRename = (tab: SheetTab) => {
    setEditingId(tab.id);
    setEditingValue(tab.name);
  };

  const commitRename = async (id: string) => {
    const name = editingValue.trim();
    setEditingId(null);
    if (!name) return;
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
    await renameSheet(id, name);
  };

  const handleDeleteTab = async (id: string) => {
    if (!window.confirm("Delete this sheet? This cannot be undone.")) return;

    const remaining = tabs.filter((t) => t.id !== id);
    await deleteSheet(id);

    if (remaining.length === 0) {
      const created = await createSheet("Sheet 1");
      setTabs([created]);
      router.replace(`/sheets?id=${created.id}`);
      return;
    }

    setTabs(remaining);
    if (id === sheetId) {
      router.replace(`/sheets?id=${remaining[0].id}`);
    }
  };

  return (
    <div className="flex flex-col h-svh">
      <div className="flex-1 min-h-0 p-2">
        {sheetId && !rowsLoading && rows !== null ? (
          // key forces a clean remount per sheet so no state/autosave
          // bleeds between tabs when switching.
          <SheetTable key={sheetId} sheetId={sheetId} initialRows={rows} />
        ) : (
          <div className="p-4 text-xs text-gray-400">Loading…</div>
        )}
      </div>

      <div className="flex items-center gap-1 border-t border-gray-200 bg-gray-50 px-2 py-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === sheetId;
          const isEditing = editingId === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              onDoubleClick={() => startRename(tab)}
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
                <span className="whitespace-nowrap">{tab.name}</span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTab(tab.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 leading-none"
                title="Delete sheet"
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
};

export default ProgressSheetPage;
