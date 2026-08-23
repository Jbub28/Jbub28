import { parseSignal4ReportText } from "@/lib/parsers/signal4-report";
import type { Signal4StateReport } from "@/lib/types/signal4-report";

/** Extract text from a PDF in the browser (works in Capacitor / PWA). */
export async function parseSignal4ReportPdf(
  file: File,
  userId: string
): Promise<Signal4StateReport> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
    );
  }

  return parseSignal4ReportText(pages.join("\n"), userId);
}
