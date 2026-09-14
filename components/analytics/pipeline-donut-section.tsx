import PipelineDonut from "@/components/analytics/donut";
import { getGlobalPipelineStats } from "@/app/actions/projects";

export default async function PipelineDonutSection() {
  const pipelineData = await getGlobalPipelineStats();
  const donutStats = pipelineData.success ? pipelineData.stats : [];
  const donutTotal = pipelineData.success ? pipelineData.total : 0;

  return <PipelineDonut data={donutStats} total={donutTotal} />;
}
