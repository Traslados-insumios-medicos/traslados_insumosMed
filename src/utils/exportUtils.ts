import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx-js-style";
import logoUrl from "../assets/logo.png";

/** Parsea un campo serializado con | y devuelve texto legible separado por coma o salto */
export function parseMultiField(
  value: string | null | undefined,
  separator = ", ",
): string {
  if (!value) return "—";
  return value
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean)
    .join(separator);
}

/** Igual que parseMultiField pero agrega sufijo a cada elemento (ej: "°C") */
export function parseMultiFieldSuffix(
  value: string | null | undefined,
  suffix: string,
  separator = ", ",
): string {
  if (!value) return "—";
  return value
    .split("|")
    .map((v) => `${v.trim()}${suffix}`)
    .filter((v) => v !== suffix)
    .join(separator);
}

export interface ExportRow {
  [key: string]: string | number | undefined;
}

export interface ExportHighlight {
  label: string;
  value: string | number;
}

export interface ExportExcelDetailSheet {
  sheetName: string;
  headers: string[];
  rows: (string | number | undefined)[][];
}

export interface ExportDetailSection {
  title: string;
  headers: string[];
  rows: (string | number | undefined)[][];
}

export interface ExportDetailCard {
  groupTitle?: string;
  title: string;
  subtitle?: string;
  fields: { label: string; value: string | number }[];
  imageUrls?: string[];
}

export interface ExportPdfOptions {
  showMainTable?: boolean;
  sourcePanel?: string; // ej: "panel administrativo", "portal cliente", "panel chofer"
}

async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Normaliza la orientación de una imagen horneando la rotación físicamente en canvas.
 *
 * Para imágenes nuevas: Cloudinary ya aplica angle:'exif' al subir, llegan orientadas.
 * Para imágenes antiguas con EXIF: el browser corrige al cargar <img>,
 * ctx.drawImage dibuja los píxeles ya orientados, y exportamos PNG sin EXIF.
 *
 * Exportar como PNG garantiza que jsPDF no reciba metadata de orientación que ignorar.
 */
async function normalizeImageOrientation(base64: string): Promise<string> {
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // naturalWidth/Height ya reflejan la orientación corregida por el browser
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(base64);
        return;
      }
      ctx.drawImage(img, 0, 0);
      // PNG no tiene campo EXIF de orientación — píxeles ya correctos
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(base64);
    // crossOrigin necesario para imágenes de Cloudinary (CORS)
    img.crossOrigin = "anonymous";
    img.src = base64;
  });
}

/** Versión exportada para uso en otros módulos (exportRuta.ts) */
export async function normalizeImageOrientationPublic(
  base64: string,
): Promise<string> {
  return normalizeImageOrientation(base64);
}

export function imageFormatFromBase64(base64: string): "PNG" | "JPEG" | "WEBP" {
  if (base64.startsWith("data:image/png")) return "PNG";
  if (base64.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

let logoBase64Cache: string | null = null;
async function getLogoBase64(): Promise<string | null> {
  if (logoBase64Cache) return logoBase64Cache;
  try {
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    logoBase64Cache = base64;
    return base64;
  } catch {
    return null;
  }
}

let whiteLogoCache: string | null = null;
async function getWhiteLogoBase64(): Promise<string | null> {
  if (whiteLogoCache) return whiteLogoCache;
  const base = await getLogoBase64();
  if (!base) return null;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = base;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return base;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";
    whiteLogoCache = canvas.toDataURL("image/png");
    return whiteLogoCache;
  } catch {
    return base;
  }
}

export function exportToExcel(
  rows: ExportRow[],
  filename: string,
  sheetName = "Reporte",
  filterInfo?: string[],
  detailSheets?: ExportExcelDetailSheet[],
) {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : ["Sin datos"];
  const effectiveFilters =
    filterInfo && filterInfo.length > 0
      ? filterInfo
      : ["Sin filtros especificos (reporte general)"];
  const title = `INFORME ${sheetName.toUpperCase()}`;
  const generatedAt = `Generado: ${new Date().toLocaleString("es-ES")}`;

  const aoa: Array<Array<string | number>> = [];
  aoa.push([title]);
  aoa.push([generatedAt]);
  aoa.push(["LOGISTRANS S.A."]);
  aoa.push([]);
  aoa.push(["FILTROS APLICADOS"]);
  effectiveFilters.forEach((filter) => aoa.push([`• ${filter}`]));
  aoa.push([]);
  aoa.push(headers);
  rows.forEach((row) => {
    aoa.push(headers.map((h) => row[h] ?? "—"));
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Combinar celdas para encabezado visual
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(headers.length - 1, 0) } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(headers.length - 1, 0) } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: Math.max(headers.length - 1, 0) } },
  ];

  // Auto-ajustar ancho de columnas en base al contenido
  const dataStartRow = 7 + effectiveFilters.length;
  const colWidths = headers.map((header, colIdx) => {
    let maxLen = String(header).length;
    for (let r = dataStartRow; r < aoa.length; r++) {
      const val = aoa[r]?.[colIdx];
      const len = String(val ?? "").length;
      if (len > maxLen) maxLen = len;
    }
    return { wch: Math.min(Math.max(maxLen + 2, 14), 48) };
  });
  ws["!cols"] = colWidths;

  // Autofiltro para la tabla de datos
  const headerRowIdx = 7 + effectiveFilters.length;
  const lastRowIdx = Math.max(headerRowIdx, aoa.length - 1);
  const lastColName = XLSX.utils.encode_col(Math.max(headers.length - 1, 0));
  ws["!autofilter"] = {
    ref: `A${headerRowIdx + 1}:${lastColName}${lastRowIdx + 1}`,
  };

  // Columna de mapa: dejar como URL de texto (IMAGE() corrompe archivos en Excel no-365)

  // Estilos de encabezado (xlsx-js-style)
  const titleCell = ws["A1"];
  if (titleCell) {
    titleCell.s = {
      font: { bold: true, sz: 16, color: { rgb: "1E3A8A" } },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }
  const subCell = ws["A2"];
  if (subCell) {
    subCell.s = {
      font: { sz: 11, color: { rgb: "334155" } },
    };
  }
  const companyCell = ws["A3"];
  if (companyCell) {
    companyCell.s = {
      font: { bold: true, sz: 11, color: { rgb: "0F172A" } },
    };
  }
  const filtersTitleCell = ws["A5"];
  if (filtersTitleCell) {
    filtersTitleCell.s = {
      font: { bold: true, sz: 11, color: { rgb: "0F172A" } },
      fill: { patternType: "solid", fgColor: { rgb: "DBEAFE" } },
    };
  }
  for (let c = 0; c < headers.length; c++) {
    const cellRef = `${XLSX.utils.encode_col(c)}${headerRowIdx + 1}`;
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "1D4ED8" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  if (detailSheets && detailSheets.length > 0) {
    detailSheets.forEach((sheet) => {
      const detailAoa: Array<Array<string | number>> = [];
      detailAoa.push([`DETALLE - ${sheet.sheetName.toUpperCase()}`]);
      detailAoa.push([`Generado: ${new Date().toLocaleString("es-ES")}`]);
      detailAoa.push([]);
      detailAoa.push(sheet.headers);
      sheet.rows.forEach((r) =>
        detailAoa.push(sheet.headers.map((_, idx) => r[idx] ?? "—")),
      );

      const detailWs = XLSX.utils.aoa_to_sheet(detailAoa);
      detailWs["!merges"] = [
        {
          s: { r: 0, c: 0 },
          e: { r: 0, c: Math.max(sheet.headers.length - 1, 0) },
        },
      ];
      detailWs["!cols"] = sheet.headers.map((h, colIdx) => {
        let maxLen = String(h).length;
        for (let r = 4; r < detailAoa.length; r++) {
          const len = String(detailAoa[r]?.[colIdx] ?? "").length;
          if (len > maxLen) maxLen = len;
        }
        return { wch: Math.min(Math.max(maxLen + 2, 14), 55) };
      });
      const detailLastCol = XLSX.utils.encode_col(
        Math.max(sheet.headers.length - 1, 0),
      );
      detailWs["!autofilter"] = {
        ref: `A4:${detailLastCol}${Math.max(4, detailAoa.length)}`,
      };

      // Columna de mapa en hoja de detalle: dejar como URL de texto

      const dTitle = detailWs["A1"];
      if (dTitle) {
        dTitle.s = {
          font: { bold: true, sz: 14, color: { rgb: "0F172A" } },
          fill: { patternType: "solid", fgColor: { rgb: "D1FAE5" } },
        };
      }
      for (let c = 0; c < sheet.headers.length; c++) {
        const hRef = `${XLSX.utils.encode_col(c)}4`;
        if (detailWs[hRef]) {
          detailWs[hRef].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { patternType: "solid", fgColor: { rgb: "0F766E" } },
            alignment: { horizontal: "center", vertical: "center" },
          };
        }
      }
      XLSX.utils.book_append_sheet(wb, detailWs, sheet.sheetName.slice(0, 31));
    });
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function exportToPDF(
  title: string,
  headers: string[],
  rows: (string | number | undefined)[][],
  filename: string,
  filterInfo?: string[],
  highlights?: ExportHighlight[],
  detailSection?: ExportDetailSection,
  detailCards?: ExportDetailCard[],
  options?: ExportPdfOptions,
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const headerLogoBase64 = await getWhiteLogoBase64();
  const panelOrigen = options?.sourcePanel ?? "panel administrativo";

  // Header visual del informe
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(title, 14, 12);
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleString("es-ES")}`, 14, 19);
  doc.setFontSize(9);
  doc.text(
    `LOGISTRANS S.A. - Informe corporativo generado desde ${panelOrigen}`,
    14,
    24,
  );
  if (headerLogoBase64) {
    const logoSize = 18;
    doc.addImage(
      headerLogoBase64,
      imageFormatFromBase64(headerLogoBase64),
      pageWidth - logoSize - 12,
      4.5,
      logoSize,
      logoSize,
    );
  }

  doc.setTextColor(30, 41, 59);
  let startY = 36;

  const defaultHighlights: ExportHighlight[] = [
    { label: "Registros", value: rows.length },
    { label: "Columnas", value: headers.length },
  ];
  const cards =
    highlights && highlights.length > 0 ? highlights : defaultHighlights;

  // Tarjetas de resumen
  const cardWidth = 42;
  const cardHeight = 16;
  const gap = 4;
  cards.slice(0, 4).forEach((card, idx) => {
    const x = 14 + idx * (cardWidth + gap);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(card.label, x + 2, startY + 5);
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(String(card.value), x + 2, startY + 12);
  });
  startY += cardHeight + 8;

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    "Lectura rapida: cada fila representa un registro. En las tablas de detalle, cada numero de guia incluye su cliente correspondiente.",
    14,
    startY,
  );
  startY += 5;

  // Siempre mostrar filtros aplicados (o reporte general)
  const effectiveFilters =
    filterInfo && filterInfo.length > 0
      ? filterInfo
      : ["Sin filtros especificos (reporte general)"];
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Filtros aplicados para este reporte:", 14, startY);
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  effectiveFilters.forEach((filter, idx) => {
    doc.text(`• ${filter}`, 14, startY + 5 + idx * 4);
  });
  startY = startY + 5 + effectiveFilters.length * 4 + 5;

  const showMainTable = options?.showMainTable ?? true;
  if (showMainTable) {
    autoTable(doc, {
      head: [headers],
      body: rows.map((r) => r.map((v) => v ?? "—")),
      startY,
      theme: "grid",
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        overflow: "linebreak",
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 10, right: 10, top: 10, bottom: 16 },
      didDrawPage: (data) => {
        const pageNumber = data.pageNumber;
        const pages = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(
          `Pagina ${pageNumber} de ${pages}`,
          pageWidth - 35,
          doc.internal.pageSize.getHeight() - 6,
        );
      },
    });
  }

  if (detailSection && detailSection.rows.length > 0) {
    const finalY =
      ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable
        ?.finalY ?? startY) + 10;
    if (finalY > doc.internal.pageSize.getHeight() - 30) doc.addPage();
    const detailStartY = Math.min(
      finalY,
      doc.internal.pageSize.getHeight() - 24,
    );
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(detailSection.title, 14, detailStartY);

    autoTable(doc, {
      head: [detailSection.headers],
      body: detailSection.rows.map((r) => r.map((v) => v ?? "—")),
      startY: detailStartY + 4,
      theme: "grid",
      styles: {
        fontSize: 7,
        cellPadding: 1.8,
        overflow: "linebreak",
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [15, 118, 110],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 10, right: 10, top: 10, bottom: 16 },
      didDrawPage: (data) => {
        const pageNumber = data.pageNumber;
        const pages = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(
          `Pagina ${pageNumber} de ${pages}`,
          pageWidth - 35,
          doc.internal.pageSize.getHeight() - 6,
        );
      },
    });
  }

  if (detailCards && detailCards.length > 0) {
    let y =
      ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable
        ?.finalY ?? startY) + 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 12;
    const gap = 8;
    const cardWidth = pageWidth - marginX * 2;
    let currentGroup = "";

    // Función para calcular altura dinámica de la tarjeta según sus fields
    const calcCardHeight = (card: ExportDetailCard): number => {
      const hasMap = /mapbox\.com\/styles\/v1\//.test(
        card.imageUrls?.[0] ?? "",
      );
      // Mapa ocupa 80px + 4px margen derecho + 4px separación = 88px desde el borde derecho
      const mapReservedWidth = hasMap ? 88 : 0;
      const valueX = marginX + 33;
      const valueRightLimit = marginX + cardWidth - mapReservedWidth - 4;
      const valueWrapWidth = Math.max(26, valueRightLimit - valueX);
      let totalFieldHeight = 21; // header + subtitle
      card.fields.slice(0, 6).forEach((field) => {
        const rawValue = String(field.value || "—");
        const wrapped = doc.splitTextToSize(rawValue, valueWrapWidth);
        totalFieldHeight += wrapped.length > 1 ? wrapped.length * 5 + 2 : 7;
      });
      // Si hay mapa, la columna derecha necesita al menos 68px (título 18px + imagen 44px + margen 6px)
      const mapMinHeight = hasMap ? 68 : 0;
      // +14 para el texto de fotos al final de los campos
      const fieldsHeight = totalFieldHeight + 14;
      return Math.max(80, Math.max(fieldsHeight, mapMinHeight + 21));
    };

    if (y + 12 > pageHeight - 16) {
      doc.addPage();
      y = 16;
    }

    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("Detalle de guias en formato de lectura", marginX, y);
    y += 6;

    for (let idx = 0; idx < detailCards.length; idx++) {
      const card = detailCards[idx];
      const cardHeight = calcCardHeight(card);
      if (card.groupTitle && card.groupTitle !== currentGroup) {
        if (y + 16 > pageHeight - 16) {
          doc.addPage();
          y = 16;
        }
        doc.setFillColor(226, 232, 240);
        doc.roundedRect(marginX, y, cardWidth, 12, 2, 2, "F");
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(card.groupTitle, marginX + 2, y + 7.5);
        y += 16;
        currentGroup = card.groupTitle;
      }

      if (y + cardHeight > pageHeight - 16) {
        doc.addPage();
        y = 16;
      }

      const x = marginX;
      doc.setFillColor(250, 251, 253);
      doc.setDrawColor(186, 200, 219);
      doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, "FD");

      doc.setFillColor(15, 118, 110);
      doc.roundedRect(x, y, cardWidth, 10, 3, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10.5);
      doc.text(card.title, x + 2, y + 6.5);

      if (card.subtitle) {
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(8);
        doc.text(card.subtitle, x + 2, y + 15);
      }

      const rawImageUrls = card.imageUrls ?? [];
      const firstUrl = rawImageUrls[0] ?? "";
      const hasMap = /mapbox\.com\/styles\/v1\//.test(firstUrl);
      const mapUrl = hasMap ? firstUrl : "";
      const evidenceUrls = hasMap ? rawImageUrls.slice(1) : rawImageUrls;
      // Mapa ocupa 80px + 4px margen derecho + 4px separación = 88px desde el borde derecho
      const mapReservedWidth = hasMap ? 88 : 0;
      const valueX = x + 33;
      const valueRightLimit = x + cardWidth - mapReservedWidth - 4;
      const valueWrapWidth = Math.max(26, valueRightLimit - valueX);

      let fieldY = y + 21;
      card.fields.slice(0, 6).forEach((field) => {
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(8);
        doc.text(`${field.label}:`, x + 2, fieldY);
        doc.setTextColor(15, 23, 42);
        const rawValue = String(field.value || "—");
        const labelLower = field.label.toLowerCase();
        let valueText: string;
        if (labelLower.includes("temperatura")) {
          valueText = parseMultiFieldSuffix(
            rawValue === "—" ? null : rawValue,
            "°C",
          );
        } else if (labelLower.includes("recibido")) {
          valueText = parseMultiField(rawValue === "—" ? null : rawValue, ", ");
        } else {
          valueText = rawValue;
        }
        const wrapped = doc.splitTextToSize(valueText, valueWrapWidth);
        // Mostrar todas las líneas sin recortar
        const visibleLines = wrapped.length ? wrapped : ["—"];
        doc.text(visibleLines, valueX, fieldY);
        fieldY += visibleLines.length > 1 ? visibleLines.length * 5 + 2 : 7;
      });

      // Mapa de la guia: columna derecha, alineado al tope de los campos
      if (hasMap) {
        const mapWidth = 80;
        const mapHeight = 44;
        // Posicionar el mapa en la esquina derecha de la tarjeta con margen
        const mapX = x + cardWidth - mapWidth - 4;
        const mapY = y + 18; // debajo del header de la tarjeta
        try {
          const mapBase64 = await urlToBase64(mapUrl);
          const mapFormat = imageFormatFromBase64(mapBase64);
          doc.setFontSize(7);
          doc.setTextColor(71, 85, 105);
          doc.text("Ubicacion", mapX + mapWidth / 2, mapY - 2, {
            align: "center",
          });
          doc.addImage(mapBase64, mapFormat, mapX, mapY, mapWidth, mapHeight);
        } catch {
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text("Mapa no disponible", mapX + mapWidth / 2, mapY + 10, {
            align: "center",
          });
        }
      }

      // Texto de fotos: siempre debajo del último campo (fieldY), nunca encima
      const fotosLabelY = Math.max(fieldY + 2, y + cardHeight - 12);
      if (evidenceUrls.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(
          `Fotos de evidencia (${evidenceUrls.length}): ver paginas siguientes`,
          x + 2,
          fotosLabelY,
        );

        for (let i = 0; i < evidenceUrls.length; i++) {
          doc.addPage();
          const pw = doc.internal.pageSize.getWidth();
          const ph = doc.internal.pageSize.getHeight();
          doc.setFillColor(37, 99, 235);
          doc.rect(0, 0, pw, 18, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(10);
          doc.text(
            `${card.title} — Foto ${i + 1} de ${evidenceUrls.length}`,
            10,
            11,
          );
          try {
            const imgBase64Raw = await urlToBase64(evidenceUrls[i]);
            const imgBase64 = await normalizeImageOrientation(imgBase64Raw);
            const format = imageFormatFromBase64(imgBase64);
            const imgMargin = 10;
            doc.addImage(
              imgBase64,
              format,
              imgMargin,
              22,
              pw - imgMargin * 2,
              ph - 32,
            );
          } catch {
            doc.setFontSize(10);
            doc.setTextColor(148, 163, 184);
            doc.text("Imagen no disponible", pw / 2, ph / 2, {
              align: "center",
            });
          }
        }

        // Después de páginas de fotos full-screen, nueva página para la siguiente tarjeta
        doc.addPage();
        y = 16;
        continue;
      } else {
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text("Fotos de evidencia: sin fotos", x + 2, fotosLabelY);
      }

      y += cardHeight + gap;
    }
  }

  // Marca de agua + pie de pagina
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Pagina ${page} de ${totalPages}`, pageWidth - 35, pageHeight - 6);
  }

  doc.save(`${filename}.pdf`);
}
