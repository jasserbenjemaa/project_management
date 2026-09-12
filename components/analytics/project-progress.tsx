"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type ProjectProgress = {
  name: string;
  value: number;
};

const projects: ProjectProgress[] = [
  { name: "Atlas Migration", value: 92 },
  { name: "Nova CRM", value: 78 },
  { name: "Helios Billing", value: 65 },
];

export default function ProjectProgress() {
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
        {projects.map((p) => (
          <div key={p.name} className="flex flex-col gap-1.5">
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
