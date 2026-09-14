import ConsultantsTable from "@/components/analytics/table";
import {
  getConsultantsOverview,
  getEngagementManagersOverview,
} from "@/app/actions/stats";

export default async function TeamSection() {
  const [consultants, managers] = await Promise.all([
    getConsultantsOverview(),
    getEngagementManagersOverview(),
  ]);

  return <ConsultantsTable consultants={consultants} managers={managers} />;
}
