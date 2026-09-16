"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowSquareOut, WarningCircle } from "@phosphor-icons/react";
import type { PDFDocumentProxy, TextLayer as PdfTextLayer } from "unpdf/pdfjs";
import { findQuoteTextRange } from "@/lib/source-highlight";

type Props = {
  sourceId: string;
  title: string;
  pageFrom: number;
  pageTo: number;
  quote: string;
};

type ViewerStatus = "loading" | "found" | "not-on-page" | "not-found" | "error";

export function SourceDocumentViewer({ sourceId, title, pageFrom, pageTo, quote }: Props) {
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const highlightsRef = useRef<HTMLDivElement>(null);
  const [pageNumber, setPageNumber] = useState(pageFrom);
  const [locatedPage, setLocatedPage] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [readyVersion, setReadyVersion] = useState(0);
  const [status, setStatus] = useState<ViewerStatus>("loading");
  const [message, setMessage] = useState("Locating the exact quote in the source document…");

  useEffect(() => {
    let cancelled = false;
    let loadingTask: ReturnType<(typeof import("unpdf/pdfjs"))["getDocument"]> | null = null;

    const load = async () => {
      setStatus("loading");
      setMessage("Locating the exact quote in the source document…");
      try {
        const { getDocument } = await import("unpdf/pdfjs");
        loadingTask = getDocument({ url: `/files/${encodeURIComponent(sourceId)}` });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setTotalPages(pdf.numPages);

        const first = Math.min(Math.max(1, pageFrom), pdf.numPages);
        const last = Math.min(Math.max(first, pageTo), pdf.numPages);
        let matchPage: number | null = null;

        if (quote.trim()) {
          for (let current = first; current <= last; current += 1) {
            const page = await pdf.getPage(current);
            const content = await page.getTextContent();
            const items = content.items.flatMap((item) => "str" in item ? [item.str] : []);
            if (findQuoteTextRange(items, quote)) {
              matchPage = current;
              break;
            }
          }
        }

        if (cancelled) return;
        setLocatedPage(matchPage);
        setPageNumber(matchPage ?? first);
        setStatus(matchPage ? "loading" : "not-found");
        setMessage(matchPage
          ? "Rendering the cited page…"
          : "The cited page is open, but the exact quote could not be located in its text layer.");
        setReadyVersion((version) => version + 1);
      } catch (error) {
        if (cancelled) return;
        console.error("Source document viewer failed to load", error);
        setStatus("error");
        setMessage("The source document could not be rendered. Open the full PDF instead.");
      }
    };

    void load();
    return () => {
      cancelled = true;
      pdfRef.current = null;
      void loadingTask?.destroy();
    };
  }, [pageFrom, pageTo, quote, sourceId]);

  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    const textContainer = textLayerRef.current;
    const highlightContainer = highlightsRef.current;
    if (!pdf || !canvas || !frame || !textContainer || !highlightContainer || !readyVersion) return;

    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null = null;
    let textLayer: PdfTextLayer | null = null;

    const render = async () => {
      try {
        const { TextLayer } = await import("unpdf/pdfjs");
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.35 });
        const outputScale = window.devicePixelRatio || 1;

        frame.style.width = `${viewport.width}px`;
        frame.style.height = `${viewport.height}px`;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        textContainer.replaceChildren();
        highlightContainer.replaceChildren();

        const renderViewport = page.getViewport({ scale: 1.35 * outputScale });
        renderTask = page.render({ canvas, viewport: renderViewport });
        const textContent = await page.getTextContent();
        textLayer = new TextLayer({ textContentSource: textContent, container: textContainer, viewport });
        await Promise.all([renderTask.promise, textLayer.render()]);
        if (cancelled) return;

        const match = findQuoteTextRange(textLayer.textContentItemsStr, quote);
        if (!match || pageNumber !== locatedPage) {
          setStatus(locatedPage ? "not-on-page" : "not-found");
          setMessage(locatedPage
            ? `The citation is highlighted on page ${locatedPage}.`
            : "The cited page is open, but the exact quote could not be located in its text layer.");
          return;
        }

        const startDiv = textLayer.textDivs[match.startItem];
        const endDiv = textLayer.textDivs[match.endItem];
        const startNode = startDiv?.firstChild;
        const endNode = endDiv?.firstChild;
        if (!startNode || !endNode) throw new Error("The quote text layer could not be mapped.");

        const range = document.createRange();
        range.setStart(startNode, Math.min(match.startOffset, startNode.textContent?.length ?? 0));
        range.setEnd(endNode, Math.min(match.endOffset, endNode.textContent?.length ?? 0));
        const frameRect = frame.getBoundingClientRect();
        for (const rect of Array.from(range.getClientRects())) {
          if (!rect.width || !rect.height) continue;
          const marker = document.createElement("span");
          marker.className = "source-quote-highlight";
          marker.style.left = `${rect.left - frameRect.left}px`;
          marker.style.top = `${rect.top - frameRect.top}px`;
          marker.style.width = `${rect.width}px`;
          marker.style.height = `${rect.height}px`;
          highlightContainer.append(marker);
        }

        setStatus("found");
        setMessage(`Exact quote highlighted on page ${pageNumber}.`);
        frame.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (error) {
        if (cancelled || (error instanceof Error && error.name === "RenderingCancelledException")) return;
        console.error("Source document page failed to render", error);
        setStatus("error");
        setMessage("The cited page could not be rendered. Open the full PDF instead.");
      }
    };

    void render();
    return () => {
      cancelled = true;
      renderTask?.cancel();
      textLayer?.cancel();
    };
  }, [locatedPage, pageNumber, quote, readyVersion]);

  return (
    <main className="source-viewer-page" data-highlight-status={status}>
      <header className="source-viewer-header">
        <div>
          <p className="eyebrow">Official source</p>
          <h1>{title}</h1>
          <p>{message}</p>
        </div>
        <a className="button button-secondary" href={`/files/${encodeURIComponent(sourceId)}#page=${pageNumber}`} target="_blank" rel="noreferrer">
          Open full PDF <ArrowSquareOut aria-label="opens in a new tab" />
        </a>
      </header>

      <section className="source-viewer-citation" aria-labelledby="source-citation-heading">
        <div>
          <p className="quote-label" id="source-citation-heading">Exact cited passage</p>
          <blockquote>{quote || "No quote was provided for highlighting."}</blockquote>
        </div>
        {status === "not-found" || status === "error" ? <WarningCircle aria-hidden="true" weight="fill" /> : null}
      </section>

      <nav className="source-page-controls" aria-label="PDF page controls">
        <button type="button" className="button button-secondary" disabled={pageNumber <= 1 || status === "loading"} onClick={() => setPageNumber((page) => page - 1)}>
          <ArrowLeft aria-hidden="true" /> Previous page
        </button>
        <span>Page {pageNumber}{totalPages ? ` of ${totalPages}` : ""}</span>
        {locatedPage && pageNumber !== locatedPage ? (
          <button type="button" className="button button-quiet" onClick={() => setPageNumber(locatedPage)}>
            Return to highlighted quote
          </button>
        ) : null}
        <button type="button" className="button button-secondary" disabled={!totalPages || pageNumber >= totalPages || status === "loading"} onClick={() => setPageNumber((page) => page + 1)}>
          Next page <ArrowRight aria-hidden="true" />
        </button>
      </nav>

      <div className="source-document-scroll" role="region" aria-label={`PDF page ${pageNumber}`} tabIndex={0}>
        <div className="source-document-frame" ref={frameRef}>
          <canvas ref={canvasRef} />
          <div className="source-highlight-layer" ref={highlightsRef} aria-hidden="true" />
          <div className="source-text-layer textLayer" ref={textLayerRef} />
        </div>
      </div>
    </main>
  );
}
