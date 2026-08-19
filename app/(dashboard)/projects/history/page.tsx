// app/history/page.tsx
import { getHistory } from "@/lib/dal"; // adjust to your actual path
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, CalendarDays } from "lucide-react";

function formatDate(date: Date | null) {
  if (!date) return "Present";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function getDuration(start: Date, end: Date | null) {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());
  const years = Math.floor(months / 12);
  const remMonths = months % 12;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years > 1 ? "s" : ""}`);
  if (remMonths > 0 || parts.length === 0)
    parts.push(`${remMonths} mo${remMonths !== 1 ? "s" : ""}`);
  return parts.join(" ");
}

// adjust these keys to match your actual Project status enum
const statusStyles: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 hover:bg-green-100",
  COMPLETED: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  ON_HOLD: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  CANCELLED: "bg-rose-100 text-rose-700 hover:bg-rose-100",
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Project deleted
      </Badge>
    );
  }
  return (
    <Badge
      className={
        statusStyles[status] ?? "bg-gray-100 text-gray-700 hover:bg-gray-100"
      }
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}

export default async function HistoryPage() {
  const history = await getHistory();

  if (history === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">
          Please sign in to view your project history.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-20 ">
      <div className="mb-8 ">
        <h1 className="text-2xl font-semibold tracking-tight">
          Project History
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {"A record of every project you've worked on."}
        </p>
      </div>

      {!history ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
            <Briefcase className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No project history yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.projectName}
                    </TableCell>
                    <TableCell>{item.roleOnProject}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(item.startDate)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.endDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getDuration(item.startDate, item.endDate)}
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge status={item.project?.status ?? null} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
