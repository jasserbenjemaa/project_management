"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getActiveProjectProgress } from "@/app/actions/projects";

type ProjectProgress = {
  id: string;
  name: string;
  value: number;
};

function RowSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="h-4 w-32 animate-pulse rounded bg-muted" />
        <span className="h-4 w-8 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
    </div>
  );
}

export default function ProjectProgress() {
  const [projects, setProjects] = React.useState<ProjectProgress[] | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    getActiveProjectProgress()
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setProjects(result.projects);
        } else {
          setError(result.error);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load project progress.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="h-full rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Project progress
        </CardTitle>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Completion across active projects
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!error && !projects && (
          <>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        )}
        {!error && projects && projects.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No active projects with tasks yet.
          </p>
        )}
        {!error &&
          projects &&
          projects.map((p) => (
            <div key={p.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="text-muted-foreground">{p.value}%</span>
              </div>
              <Progress value={p.value} className="h-2" />
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
