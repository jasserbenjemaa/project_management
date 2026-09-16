import { redirect } from "next/navigation";
import {
  listItsSheetsForCurrentUser,
  ensureDefaultItsSheet,
  createItsSheet,
} from "@/app/actions/its-sheet";
import { loadSheet, renameSheet, deleteSheet } from "@/app/actions/sheet";
import SheetsClient from "@/components/sheet/sheets-client";
import { ITS_DEFAULT_COLUMNS } from "@/components/sheet/its-columns";

export default async function ItsSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  const tabs = await listItsSheetsForCurrentUser();

  if (tabs.length === 0) {
    // Transaction-safe: guarantees an ITS sheet exists system-wide
    // without ever creating a duplicate (dev double-render, race with a
    // redirect, etc). See ensureDefaultSheet in app/actions/sheet.ts.
    const created = await ensureDefaultItsSheet();

    // Every project now gets an ITS sheet alongside its Progress sheet
    // (see createSheetsForProject in app/actions/sheet.ts), so this
    // branch is a real case, not just defensive: a user with no project
    // assignments has no visible ITS sheet either.
    if (created.projectId === null) {
      redirect(`/its?id=${created.id}`);
    }

    return (
      <div className="p-8 text-muted-foreground">
        You don&apos;t have any assigned projects yet. Ask your unit manager to
        add you to a project.
      </div>
    );
  }

  const activeId = id && tabs.some((t) => t.id === id) ? id : tabs[0].id;

  if (activeId !== id) {
    redirect(`/its?id=${activeId}`);
  }

  const sheet = await loadSheet(activeId);

  return (
    <SheetsClient
      tabs={tabs}
      sheetId={activeId}
      initialRows={sheet?.rows ?? []}
      defaultColumns={ITS_DEFAULT_COLUMNS}
      newTabNamePrefix="ITS"
      createSheetAction={createItsSheet}
      renameSheetAction={renameSheet}
      deleteSheetAction={deleteSheet}
      basePath="/its"
    />
  );
}
