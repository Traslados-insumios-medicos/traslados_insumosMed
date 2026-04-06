import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export interface ExportRow {
  [key: string]: string | number | undefined
}

export function exportToExcel(rows: ExportRow[], filename: string, sheetName = 'Reporte') {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function exportToPDF(
  title: string,
  headers: string[],
  rows: (string | number | undefined)[][],
  filename: string,
) {
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text(title, 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 14, 22)

  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map((v) => v ?? '—')),
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  })

  doc.save(`${filename}.pdf`)
}
