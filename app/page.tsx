import { AnalysisWorkspace } from "@/components/AnalysisWorkspace";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ answer?: string }>;
}) {
  const { answer } = await searchParams;
  return <AnalysisWorkspace initialAnswerId={answer} />;
}
