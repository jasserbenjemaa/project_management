import { redirect } from "next/navigation";
import {
  listSheetsForCurrentUser,
  ensureDefaultSheet,
  loadSheet,
} from "@/app/actions/sheet";
import SheetsClient from "@/components/sheet/sheets-client";

export default async function ProgressSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  const tabs = await listSheetsForCurrentUser();

  if (tabs.length === 0) {
    // Transaction-safe: guarantees a sheet exists system-wide without
    // ever creating a duplicate (dev double-render, race with a
    // redirect, etc).
    const created = await ensureDefaultSheet();

    // ensureDefaultSheet looks at ALL sheets, not just ones visible to
    // this user. If what it found/created is a project-linked sheet,
    // this user may not actually be allowed to see it — don't redirect
    // them into it.
    if (created.projectId === null) {
      redirect(`/sheets?id=${created.id}`);
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
