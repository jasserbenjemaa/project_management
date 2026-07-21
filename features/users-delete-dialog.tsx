"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteUser } from "@/app/actions/users";
import type { UserRow } from "./users-columns";

interface DeleteUserDialogProps {
  // Dialog is open whenever this is non-null.
  user: UserRow | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteUserDialog({
  user,
  onOpenChange,
  onDeleted,
}: DeleteUserDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!user) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      onDeleted?.();
    });
  };

  return (
    <AlertDialog open={!!user} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {user?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the user and can&apos;t be undone. It will
            fail if they still have assignments, time entries, or direct reports
            — reassign those first.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p className="text-sm text-destructive px-6 -mt-2">{error}</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
