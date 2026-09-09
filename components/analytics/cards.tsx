"use client";

import { Card } from "@/components/ui/card";
import {
  FlaskConical,
  Loader2,
  ClipboardCheck,
  CheckCircle2,
  Pencil,
  ListChecks,
  Truck,
  PackageCheck,
  Ban,
  Lock,
  type LucideIcon,
} from "lucide-react";

type Stage = {
  label: string;
  count: number;
  icon: LucideIcon;
  bg: string;
  fg: string;
};

const stages: Stage[] = [
  {
    label: "In progress",
    count: 42,
    icon: Loader2,
    bg: "#DCEBFF",
    fg: "#2563EB",
  },
  {
    label: "Ready for dry run",
    count: 15,
    icon: ClipboardCheck,
    bg: "#E4E1FF",
    fg: "#6D5DF2",
  },
  {
    label: "Dry run in progress",
    count: 9,
    icon: FlaskConical,
    bg: "#FCE7F6",
    fg: "#DB2777",
  },
  {
    label: "Ready for TC",
    count: 21,
    icon: ListChecks,
    bg: "#DFF7E9",
    fg: "#16A34A",
  },
  {
    label: "TC Done",
    count: 63,
    icon: CheckCircle2,
    bg: "#D8F5EE",
    fg: "#0D9488",
  },
  {
    label: "TC Correction",
    count: 6,
    icon: Pencil,
    bg: "#FFE9D6",
    fg: "#EA580C",
  },
  {
    label: "Ready for QC",
    count: 18,
    icon: ClipboardCheck,
    bg: "#FFF3C4",
    fg: "#CA8A04",
  },
  {
    label: "Ready for Delivery",
    count: 11,
    icon: Truck,
    bg: "#E1F3FF",
    fg: "#0284C7",
  },
  {
    label: "Delivered",
    count: 87,
    icon: PackageCheck,
    bg: "#DDF4DD",
    fg: "#22A559",
  },
  { label: "Out of scope", count: 4, icon: Ban, bg: "#F1E4FF", fg: "#9333EA" },
  { label: "Blocked", count: 3, icon: Lock, bg: "#FFE1E1", fg: "#DC2626" },
];

function StatusCard({ label, count, icon: Icon, bg, fg }: Stage) {
  return (
    <Card className="border-0 shadow-sm rounded-2xl p-5 bg-white flex flex-col gap-4 min-w-50">
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: bg }}
      >
        <Icon className="h-5 w-5" style={{ color: fg }} strokeWidth={2} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold tracking-tight">{count}</span>
      </div>
    </Card>
  );
}

export default function StatusOverview() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {stages.map((s) => (
        <StatusCard key={s.label} {...s} />
      ))}
    </div>
  );
}
