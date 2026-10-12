"use client";
import { toJpeg } from "html-to-image";

const PAGE_WIDTH = 842; // A4 landscape width in points; page 1 grows to fit the board
const MARGIN = 36;

/** Characters the built-in PDF fonts can't draw (outside Latin-1). */
const NON_LATIN1 = /[^\x00-\xff]/g;

async function screenshot(node: HTMLElement) {
  const image = await toJpeg(node, {
    // Match the page background (sage-100 / slate-950) for the current theme.
    backgroundColor: document.documentElement.classList.contains("dark") ? "#020617" : "#e1ebe4",
    filter: (n: Node) => !(n instanceof HTMLElement && n.dataset.screenshotIgnore !== undefined),
    pixelRatio: 2,
    quality: 0.92,
  });
  return { image, width: node.offsetWidth, height: node.offsetHeight };
}

/** "Sprint 42: retro?" -> "Sprint 42- retro-.pdf" (characters most file systems reject are replaced). */
export function pdfFileName(boardName: string) {
  const safe = boardName
    .replace(/[\\/:*?"<>|\x00-\x1f]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return `${safe || "board"}.pdf`;
}

/**
 * Download a PDF of the board: page 1 is a screenshot, the following pages hold the JSON export.
 * Built entirely in the browser.
 */
export async function downloadBoardPdf(node: HTMLElement, boardName: string, data: unknown) {
  const [{ jsPDF }, shot] = await Promise.all([import("jspdf"), screenshot(node)]);

  // Page 1: title + screenshot, sized so the whole board fits at full width.
  const imgWidth = PAGE_WIDTH - MARGIN * 2;
  const imgHeight = (shot.height / shot.width) * imgWidth;
  const headerHeight = 48;
  const pageHeight1 = MARGIN * 2 + headerHeight + imgHeight;
  const doc = new jsPDF({
    unit: "pt",
    format: [PAGE_WIDTH, pageHeight1],
    // jsPDF swaps custom dimensions to match the orientation, so it must agree with them.
    orientation: pageHeight1 > PAGE_WIDTH ? "portrait" : "landscape",
  });
  doc.setProperties({ title: boardName });
  doc.setFont("helvetica", "bold").setFontSize(16);
  doc.text(boardName.replace(NON_LATIN1, "?"), MARGIN, MARGIN + 12);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(100);
  doc.text(`Exported ${new Date().toLocaleString()}`, MARGIN, MARGIN + 28);
  doc.addImage(shot.image, "JPEG", MARGIN, MARGIN + headerHeight, imgWidth, imgHeight);

  // Following pages: the JSON, as text. Non-Latin-1 characters become \uXXXX escapes,
  // which keeps the JSON valid and readable with the built-in fonts.
  const json = JSON.stringify(data, null, 2).replace(
    NON_LATIN1,
    (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
  doc.addPage("a4", "portrait");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(0);
  doc.text("Board data (JSON)", MARGIN, MARGIN + 10);
  doc.setFont("courier", "normal").setFontSize(8);
  const lineHeight = 10;
  let y = MARGIN + 32;
  for (const line of doc.splitTextToSize(json, pageWidth - MARGIN * 2) as string[]) {
    if (y > pageHeight - MARGIN) {
      doc.addPage("a4", "portrait");
      y = MARGIN + 8;
    }
    doc.text(line, MARGIN, y);
    y += lineHeight;
  }

  doc.save(pdfFileName(boardName));
}
