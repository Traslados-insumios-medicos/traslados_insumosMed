import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export interface ExportRow {
  [key: string]: string | number | undefined
}

export function exportToExcel(rows: ExportRow[], filename: string, sheetName = 'Reporte', filterInfo?: string[]) {
  const ws = XLSX.utils.json_to_sheet(rows)
  
  // Si hay información de filtros, agregarla al inicio
  if (filterInfo && filterInfo.length > 0) {
    // Insertar filas vacías y de filtros al inicio
    XLSX.utils.sheet_add_aoa(ws, [['FILTROS APLICADOS:']], { origin: 'A1' })
    filterInfo.forEach((filter, idx) => {
      XLSX.utils.sheet_add_aoa(ws, [[filter]], { origin: `A${idx + 2}` })
    })
    XLSX.utils.sheet_add_aoa(ws, [['']], { origin: `A${filterInfo.length + 2}` })
    
    // Ajustar el rango para incluir las nuevas filas
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    range.s.r = 0
    ws['!ref'] = XLSX.utils.encode_range(range)
  }
  
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function exportToPDF(
  title: string,
  headers: string[],
  rows: (string | number | undefined)[][],
  filename: string,
  filterInfo?: string[]
) {
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text(title, 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 14, 22)
  
  let startY = 28
  
  // Si hay información de filtros, agregarla
  if (filterInfo && filterInfo.length > 0) {
    doc.setFontSize(10)
    doc.setTextColor(60)
    doc.text('Filtros aplicados:', 14, startY)
    doc.setFontSize(8)
    doc.setTextColor(100)
    filterInfo.forEach((filter, idx) => {
      doc.text(`• ${filter}`, 14, startY + 5 + (idx * 4))
    })
    startY = startY + 5 + (filterInfo.length * 4) + 3
  }

  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map((v) => v ?? '—')),
    startY,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  })

  doc.save(`${filename}.pdf`)
}
