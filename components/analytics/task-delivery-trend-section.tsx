import TaskDeliveryTrend from "@/components/analytics/task-delivery-trend";
import { getTaskDeliveryTrend } from "@/app/actions/stats";

export default async function TaskDeliveryTrendSection() {
  const data = await getTaskDeliveryTrend();
  return <TaskDeliveryTrend data={data} />;
}
