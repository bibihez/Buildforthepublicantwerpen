import { notFound } from "next/navigation";
import { SourceDocumentViewer } from "@/components/SourceDocumentViewer";
import { getSource } from "@/lib/db";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function pageNumber(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export default async function SourceDocumentPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const source = await getSource(id);
  if (!source?.file_path) notFound();

  const pageFrom = pageNumber(first(query.from), 1);
  const pageTo = Math.max(pageFrom, pageNumber(first(query.to), pageFrom));

  return (
    <SourceDocumentViewer
      sourceId={source.id}
      title={source.title}
      pageFrom={pageFrom}
      pageTo={pageTo}
      quote={first(query.quote)}
    />
  );
}
