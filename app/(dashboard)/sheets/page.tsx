import { redirect } from "next/navigation";
import { listSheets, ensureDefaultSheet, loadSheet } from "@/app/actions/sheet";
import SheetsClient from "@/components/sheet/sheets-client";

export default async function ProgressSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  const tabs = await listSheets(); // now { id, name, projectId }[]

  if (tabs.length === 0) {
    // Transaction-safe: won't create a second sheet even if this render
    // fires more than once (dev double-render, race with a redirect, etc).
    const created = await ensureDefaultSheet();
    redirect(`/sheets?id=${created.id}`);
  }

  const activeId = id && tabs.some((t) => t.id === id) ? id : tabs[0].id;

  if (activeId !== id) {
    redirect(`/sheets?id=${activeId}`);
  }

  const sheet = await loadSheet(activeId);

  return (
    <SheetsClient
      tabs={tabs}
      sheetId={activeId}
      initialRows={sheet?.rows ?? []}
    />
  );
}
