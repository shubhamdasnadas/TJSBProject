import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

export const TECHSEC_LOGO = "/images/logos/techsec-logo_name.svg";

/* ---------- SVG → PNG ---------- */
export const loadSvgAsPng = async (url: string) => {
  const svgText = await fetch(url).then(r => r.text());
  const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
  const svgUrl = URL.createObjectURL(svgBlob);

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width * 3;
      canvas.height = img.height * 3;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(svgUrl);
      resolve(canvas.toDataURL("image/png"));
    };
    img.src = svgUrl;
  });
};

/* ---------- PAGE BORDER ---------- */
export const drawPageBorder = (doc: jsPDF) => {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const m = 20;
  doc.setLineWidth(1.5);
  doc.rect(m, m, w - m * 2, h - m * 2);
};

/* ---------- WATERMARK (skip page 1) ---------- */
export const drawWatermark = (doc: jsPDF, png: string, pageNo: number) => {
  if (pageNo <= 1) return;
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  (doc as any).setGState(new (doc as any).GState({ opacity: 0.06 }));
  doc.addImage(png, "PNG", w / 2 - 110, h / 2 - 130, 220, 140);
  (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));
};

/* ---------- MAIN EXPORT ---------- */
export const exportHistoryPdf = async ({
  title,
  host,
  rows,
  chartEl,
}: {
  title: string;
  host: string;
  rows: { clock: number; value: any }[];
  chartEl?: HTMLDivElement | null;
}) => {
  const doc = new jsPDF("p", "pt", "a4");
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  const CONTENT = W - M * 2;

  const logo = await loadSvgAsPng(TECHSEC_LOGO);
  let pageNo = 1;

  /* ===== PAGE 1: COVER ===== */
  doc.addImage(logo, "PNG", W / 2 - 120, 70, 240, 150);
  doc.setFontSize(26).setFont("helvetica", "bold");
  doc.text("Techsec NMS – History Report", W / 2, 260, { align: "center" });

  doc.setFontSize(18);
  doc.text(`Host: ${host}`, W / 2, 320, { align: "center" });

  doc.setFontSize(14).setFont("helvetica", "normal");
  doc.text(`Item: ${title}`, W / 2, 360, { align: "center" });

  doc.setFontSize(12).setTextColor(90);
  doc.text(`Generated: ${new Date().toLocaleString()}`, W / 2, 410, { align: "center" });

  drawPageBorder(doc);

  /* ===== PAGE 2: CHART ===== */
  if (chartEl) {
    doc.addPage(); pageNo++;
    const canvas = await html2canvas(chartEl, { scale: 3, backgroundColor: "#fff" });
    doc.addImage(canvas.toDataURL("image/png"), "PNG", M, 100, CONTENT, 220);
    drawWatermark(doc, logo, pageNo);
    drawPageBorder(doc);
  }

  /* ===== PAGE 3+: TABLE ===== */
  doc.addPage(); pageNo++;
  autoTable(doc, {
    startY: 80,
    margin: { left: M, right: M },
    head: [["Time", "Value"]],
    body: rows.map(r => [
      new Date(r.clock * 1000).toLocaleString(),
      typeof r.value === "number" ? r.value.toFixed(2) : r.value ?? "—",
    ]),
    didDrawPage: () => {
      drawWatermark(doc, logo, pageNo);
      drawPageBorder(doc);
    },
  });

  doc.save(`techsec_history_${host}_${Date.now()}.pdf`);
};