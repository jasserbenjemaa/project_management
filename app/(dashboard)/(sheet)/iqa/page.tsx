import { redirect } from "next/navigation";
import {
  listIqaSheetsForCurrentUser,
  ensureDefaultIqaSheet,
  createIqaSheet,
} from "@/app/actions/iqa-sheet";
import { loadSheet, renameSheet, deleteSheet } from "@/app/actions/sheet";
import SheetsClient from "@/components/sheet/sheets-client";
import { IQA_DEFAULT_COLUMNS } from "@/components/sheet/iqa-columns";

export default async function IqaSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  const tabs = await listIqaSheetsForCurrentUser();

  if (tabs.length === 0) {
    // Transaction-safe: guarantees an IQA sheet exists system-wide
    // without ever creating a duplicate. See ensureDefaultSheet in
    // app/actions/sheet.ts.
    const created = await ensureDefaultIqaSheet();

    // Every project now gets an IQA sheet alongside its Progress and ITS
    // sheets (see createSheetsForProject in app/actions/sheet.ts), so
    // this branch is a real case: a user with no project assignments
    // has no visible IQA sheet either.
    if (created.projectId === null) {
      redirect(`/iqa?id=${created.id}`);
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
    redirect(`/iqa?id=${activeId}`);
  }

  const sheet = await loadSheet(activeId);

  return (
    <SheetsClient
      tabs={tabs}
      sheetId={activeId}
      initialRows={sheet?.rows ?? []}
      defaultColumns={IQA_DEFAULT_COLUMNS}
      newTabNamePrefix="IQA"
      createSheetAction={createIqaSheet}
      renameSheetAction={renameSheet}
      deleteSheetAction={deleteSheet}
      basePath="/iqa"
    />
  );
}
