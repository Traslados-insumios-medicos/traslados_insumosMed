import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Helper para convertir imagen URL a base64
async function urlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error convirtiendo imagen a base64:', error)
    throw error
  }
}

interface RutaExport {
  id: string
  fecha: string
  estado: string
  chofer: { nombre: string; cedula: string }
  stops: Array<{
    orden: number
    direccion: string
    cliente: { nombre: string }
    guias: Array<{
      numeroGuia: string
      descripcion: string
      estado: string
      receptorNombre?: string | null
      temperatura?: string | null
      horaLlegada?: string | null
      horaSalida?: string | null
      observaciones?: string | null
      fotos?: Array<{ urlPreview: string }>
    }>
  }>
  guias: Array<{
    numeroGuia: string
    descripcion: string
    estado: string
    receptorNombre?: string | null
    temperatura?: string | null
    horaLlegada?: string | null
    horaSalida?: string | null
    observaciones?: string | null
    fotos?: Array<{ urlPreview: string }>
  }>
  fotos?: Array<{ urlPreview: string; tipo: string }>
}

export function exportarRutaExcel(ruta: RutaExport) {
  const wb = XLSX.utils.book_new()

  // Hoja 1: Resumen
  const entregadas = ruta.guias.filter(g => g.estado === 'ENTREGADO').length
  const incidencias = ruta.guias.filter(g => g.estado === 'INCIDENCIA').length
  const pendientes = ruta.guias.filter(g => g.estado === 'PENDIENTE').length

  const resumen = [
    ['REPORTE DE RUTA'],
    [],
    ['ID Ruta', ruta.id],
    ['Fecha', new Date(ruta.fecha).toLocaleDateString('es-ES')],
    ['Chofer', ruta.chofer.nombre],
    ['Cédula Chofer', ruta.chofer.cedula],
    ['Estado Ruta', ruta.estado],
    [],
    ['RESUMEN DE GUÍAS'],
    ['Total Guías', ruta.guias.length],
    ['Entregadas', entregadas],
    ['Incidencias', incidencias],
    ['Pendientes', pendientes],
  ]

  const wsResumen = XLSX.utils.aoa_to_sheet(resumen)
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

  // Hoja 2: Detalle de Guías
  const guiasData = ruta.stops.flatMap(stop =>
    stop.guias.map(g => ({
      'Parada': `#${stop.orden}`,
      'Cliente': stop.cliente.nombre,
      'Dirección': stop.direccion,
      'Número Guía': g.numeroGuia,
      'Descripción': g.descripcion,
      'Estado': g.estado,
      'Recibido por': g.receptorNombre || '-',
      'Temperatura (°C)': g.temperatura || '-',
      'Hora Llegada': g.horaLlegada || '-',
      'Hora Salida': g.horaSalida || '-',
      'Observaciones': g.observaciones || '-',
      'Fotos': g.fotos?.length || 0,
    }))
  )

  const wsGuias = XLSX.utils.json_to_sheet(guiasData)
  XLSX.utils.book_append_sheet(wb, wsGuias, 'Detalle Guías')

  // Hoja 3: Incidencias (si hay)
  if (incidencias > 0) {
    const incidenciasData = ruta.stops.flatMap(stop =>
      stop.guias
        .filter(g => g.estado === 'INCIDENCIA')
        .map(g => {
          // Extraer tipo de incidencia del receptorNombre
          const tipoIncidencia = g.receptorNombre?.startsWith('INCIDENCIA:')
            ? g.receptorNombre.replace('INCIDENCIA: ', '')
            : 'No especificado'
          
          return {
            'Parada': `#${stop.orden}`,
            'Cliente': stop.cliente.nombre,
            'Número Guía': g.numeroGuia,
            'Tipo Incidencia': tipoIncidencia,
            'Temperatura (°C)': g.temperatura || '-',
            'Hora Llegada': g.horaLlegada || '-',
            'Hora Salida': g.horaSalida || '-',
            'Observaciones': g.observaciones || '-',
          }
        })
    )

    const wsIncidencias = XLSX.utils.json_to_sheet(incidenciasData)
    XLSX.utils.book_append_sheet(wb, wsIncidencias, 'Incidencias')
  }

  // Hoja 4: URLs de Fotos
  const fotosData: Array<{
    'Tipo': string
    'Guía': string
    'Parada': string
    'Cliente': string
    'URL': string
  }> = []

  // Fotos de guías
  ruta.stops.forEach(stop => {
    stop.guias.forEach(g => {
      if (g.fotos && g.fotos.length > 0) {
        g.fotos.forEach((foto) => {
          fotosData.push({
            'Tipo': 'Entrega',
            'Guía': g.numeroGuia,
            'Parada': `#${stop.orden}`,
            'Cliente': stop.cliente.nombre,
            'URL': foto.urlPreview,
          })
        })
      }
    })
  })

  // Fotos de hoja de ruta
  const fotosHojaRuta = ruta.fotos?.filter(f => f.tipo === 'HOJA_RUTA') || []
  fotosHojaRuta.forEach((foto) => {
    fotosData.push({
      'Tipo': 'Hoja de Ruta',
      'Guía': '-',
      'Parada': '-',
      'Cliente': '-',
      'URL': foto.urlPreview,
    })
  })

  if (fotosData.length > 0) {
    const wsFotos = XLSX.utils.json_to_sheet(fotosData)
    XLSX.utils.book_append_sheet(wb, wsFotos, 'URLs de Fotos')
  }

  // Descargar archivo
  const fileName = `Ruta_${ruta.id.slice(-6)}_${new Date(ruta.fecha).toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
}

export async function exportarRutaPDF(ruta: RutaExport) {
  console.log('📄 Iniciando exportación PDF de ruta:', ruta.id)
  console.log('📦 Datos de ruta:', {
    totalStops: ruta.stops.length,
    totalGuias: ruta.guias.length,
    totalFotosRuta: ruta.fotos?.length || 0,
  })
  
  const doc = new jsPDF()
  
  const entregadas = ruta.guias.filter(g => g.estado === 'ENTREGADO').length
  const incidencias = ruta.guias.filter(g => g.estado === 'INCIDENCIA').length
  const pendientes = ruta.guias.filter(g => g.estado === 'PENDIENTE').length

  // Función para agregar marca de agua en cada página
  const agregarMarcaDeAgua = (pageNum: number) => {
    doc.setPage(pageNum)
    doc.setGState({ opacity: 0.1 })
    doc.setFontSize(50)
    doc.setTextColor(150, 150, 150)
    doc.text('LOGISTRANS S.A.', doc.internal.pageSize.width / 2, doc.internal.pageSize.height / 2, {
      align: 'center',
      angle: 45
    })
    doc.setGState({ opacity: 1 })
    doc.setTextColor(0, 0, 0)
  }

  // Título
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('REPORTE DE RUTA', 14, 20)

  // Logo/Empresa
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('LOGISTRANS S.A.', 14, 28)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('SERVICIO DE TRANSPORTE', 14, 32)

  // Información general
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`ID Ruta: ${ruta.id}`, 14, 42)
  doc.text(`Fecha: ${new Date(ruta.fecha).toLocaleDateString('es-ES')}`, 14, 49)
  doc.text(`Chofer: ${ruta.chofer.nombre} (${ruta.chofer.cedula})`, 14, 56)
  doc.text(`Estado: ${ruta.estado}`, 14, 63)

  // Resumen
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen de Guías', 14, 75)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total: ${ruta.guias.length} | Entregadas: ${entregadas} | Incidencias: ${incidencias} | Pendientes: ${pendientes}`, 14, 82)

  // Marca de agua en primera página
  agregarMarcaDeAgua(1)

  // Tabla resumen de guías
  const guiasResumen = ruta.stops.flatMap(stop =>
    stop.guias.map(g => [
      `#${stop.orden}`,
      stop.cliente.nombre,
      g.numeroGuia,
      g.estado,
    ])
  )

  autoTable(doc, {
    startY: 90,
    head: [['Parada', 'Cliente', 'Número Guía', 'Estado']],
    body: guiasResumen,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 70 },
      2: { cellWidth: 50 },
      3: { cellWidth: 40 },
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        agregarMarcaDeAgua(data.pageNumber)
      }
    }
  })

  let currentY = (doc as any).lastAutoTable.finalY || 90

  // DETALLE COMPLETO DE CADA GUÍA
  doc.addPage()
  agregarMarcaDeAgua(doc.getNumberOfPages())
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('DETALLE COMPLETO DE GUÍAS', 14, 20)
  
  currentY = 30

  console.log(`📋 Procesando ${ruta.stops.length} paradas con guías`)

  for (const stop of ruta.stops) {
    console.log(`  📍 Parada #${stop.orden}: ${stop.guias.length} guías`)
    
    for (const guia of stop.guias) {
      console.log(`    📦 Guía ${guia.numeroGuia}:`, {
        estado: guia.estado,
        receptor: guia.receptorNombre,
        temp: guia.temperatura,
        llegada: guia.horaLlegada,
        salida: guia.horaSalida,
        obs: guia.observaciones,
        fotos: guia.fotos?.length || 0
      })
      
      // Verificar si necesitamos nueva página
      if (currentY > doc.internal.pageSize.height - 80) {
        doc.addPage()
        agregarMarcaDeAgua(doc.getNumberOfPages())
        currentY = 20
      }

      // Encabezado de la guía con fondo azul
      doc.setFillColor(41, 128, 185)
      doc.rect(14, currentY, 182, 8, 'F')
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(`GUÍA ${guia.numeroGuia} - Parada #${stop.orden}`, 16, currentY + 5.5)
      doc.setTextColor(0, 0, 0)
      
      currentY += 12

      // Información básica de la guía
      doc.setFontSize(9)
      
      // Cliente
      doc.setFont('helvetica', 'bold')
      doc.text('Cliente:', 16, currentY)
      doc.setFont('helvetica', 'normal')
      const clienteLines = doc.splitTextToSize(stop.cliente.nombre, 140)
      doc.text(clienteLines, 50, currentY)
      currentY += Math.max(clienteLines.length * 5, 5)

      // Dirección
      doc.setFont('helvetica', 'bold')
      doc.text('Dirección:', 16, currentY)
      doc.setFont('helvetica', 'normal')
      const direccionLines = doc.splitTextToSize(stop.direccion, 140)
      doc.text(direccionLines, 50, currentY)
      currentY += Math.max(direccionLines.length * 5, 5)

      // Descripción
      doc.setFont('helvetica', 'bold')
      doc.text('Descripción:', 16, currentY)
      doc.setFont('helvetica', 'normal')
      const descripcionLines = doc.splitTextToSize(guia.descripcion, 140)
      doc.text(descripcionLines, 50, currentY)
      currentY += Math.max(descripcionLines.length * 5, 5)

      // Estado con color
      doc.setFont('helvetica', 'bold')
      doc.text('Estado:', 16, currentY)
      if (guia.estado === 'ENTREGADO') {
        doc.setTextColor(22, 163, 74)
      } else if (guia.estado === 'INCIDENCIA') {
        doc.setTextColor(245, 158, 11)
      } else {
        doc.setTextColor(100, 116, 139)
      }
      doc.setFont('helvetica', 'bold')
      doc.text(guia.estado, 50, currentY)
      doc.setTextColor(0, 0, 0)
      currentY += 7

      // Sección de datos de entrega
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setFillColor(240, 240, 240)
      doc.rect(14, currentY, 182, 6, 'F')
      doc.text('DATOS DE ENTREGA', 16, currentY + 4)
      currentY += 9

      // Recibido por
      doc.setFont('helvetica', 'bold')
      doc.text('Recibido por:', 18, currentY)
      doc.setFont('helvetica', 'normal')
      const receptor = guia.receptorNombre || 'No registrado'
      const receptorLines = doc.splitTextToSize(receptor, 130)
      doc.text(receptorLines, 55, currentY)
      currentY += Math.max(receptorLines.length * 5, 5)

      // Temperatura
      doc.setFont('helvetica', 'bold')
      doc.text('Temperatura:', 18, currentY)
      doc.setFont('helvetica', 'normal')
      doc.text(guia.temperatura ? `${guia.temperatura}°C` : 'No registrada', 55, currentY)
      currentY += 5

      // Hora de llegada
      doc.setFont('helvetica', 'bold')
      doc.text('Hora Llegada:', 18, currentY)
      doc.setFont('helvetica', 'normal')
      doc.text(guia.horaLlegada || 'No registrada', 55, currentY)
      currentY += 5

      // Hora de salida
      doc.setFont('helvetica', 'bold')
      doc.text('Hora Salida:', 18, currentY)
      doc.setFont('helvetica', 'normal')
      doc.text(guia.horaSalida || 'No registrada', 55, currentY)
      currentY += 7

      // Observaciones
      if (guia.observaciones && guia.observaciones.trim()) {
        doc.setFont('helvetica', 'bold')
        doc.setFillColor(255, 250, 240)
        doc.rect(14, currentY, 182, 6, 'F')
        doc.text('OBSERVACIONES', 16, currentY + 4)
        currentY += 9
        
        doc.setFont('helvetica', 'normal')
        const obsLines = doc.splitTextToSize(guia.observaciones, 170)
        doc.text(obsLines, 18, currentY)
        currentY += obsLines.length * 5 + 3
      }

      // Fotos de la guía
      if (guia.fotos && guia.fotos.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFillColor(240, 255, 240)
        doc.rect(14, currentY, 182, 6, 'F')
        doc.text(`FOTOS DE ENTREGA (${guia.fotos.length})`, 16, currentY + 4)
        currentY += 9

        for (let i = 0; i < guia.fotos.length; i++) {
          const foto = guia.fotos[i]
          
          // Verificar si necesitamos nueva página para la foto
          if (currentY + 50 > doc.internal.pageSize.height - 20) {
            doc.addPage()
            agregarMarcaDeAgua(doc.getNumberOfPages())
            currentY = 20
          }

          try {
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.text(`Foto ${i + 1} de ${guia.fotos.length}`, 18, currentY)
            currentY += 3
            
            const imgBase64 = await urlToBase64(foto.urlPreview)
            doc.addImage(imgBase64, 'JPEG', 18, currentY, 60, 45)
            currentY += 48
          } catch (error) {
            console.error('❌ Error al cargar imagen:', error)
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(220, 38, 38)
            doc.text('Error al cargar imagen', 18, currentY)
            doc.setTextColor(0, 0, 0)
            currentY += 5
          }
        }
      } else {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text('Sin fotos de entrega', 18, currentY)
        doc.setTextColor(0, 0, 0)
        currentY += 5
      }

      // Línea separadora entre guías
      currentY += 3
      doc.setDrawColor(200, 200, 200)
      doc.line(14, currentY, 196, currentY)
      currentY += 8
    }
  }

  console.log('✅ Detalle de guías completado')

  // SECCIÓN DE INCIDENCIAS (resumen)
  if (incidencias > 0) {
    doc.addPage()
    agregarMarcaDeAgua(doc.getNumberOfPages())
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('RESUMEN DE INCIDENCIAS', 14, 20)

    currentY = 30

    const incidenciasData = ruta.stops.flatMap(stop =>
      stop.guias
        .filter(g => g.estado === 'INCIDENCIA')
        .map(g => {
          const tipoIncidencia = g.receptorNombre?.startsWith('INCIDENCIA:')
            ? g.receptorNombre.replace('INCIDENCIA: ', '')
            : 'No especificado'
          
          return [
            `#${stop.orden}`,
            stop.cliente.nombre,
            g.numeroGuia,
            tipoIncidencia,
            g.observaciones || '-',
          ]
        })
    )

    autoTable(doc, {
      startY: currentY,
      head: [['Parada', 'Cliente', 'Guía', 'Tipo', 'Observaciones']],
      body: incidenciasData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [230, 126, 34], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 50 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 42 },
      },
      didDrawPage: (data) => {
        agregarMarcaDeAgua(data.pageNumber)
      }
    })

    currentY = (doc as any).lastAutoTable.finalY || currentY
  }

  // HOJA DE RUTA FINALIZADA
  const fotosHojaRuta = ruta.fotos?.filter(f => f.tipo === 'HOJA_RUTA') || []
  if (fotosHojaRuta.length > 0) {
    doc.addPage()
    agregarMarcaDeAgua(doc.getNumberOfPages())
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('HOJA DE RUTA FINALIZADA', 14, 20)

    let yPos = 30
    const imgWidth = 170
    const imgHeight = 120

    for (let i = 0; i < fotosHojaRuta.length; i++) {
      const foto = fotosHojaRuta[i]
      
      if (yPos + imgHeight + 15 > doc.internal.pageSize.height - 20) {
        doc.addPage()
        agregarMarcaDeAgua(doc.getNumberOfPages())
        yPos = 20
      }

      try {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(`Documento ${i + 1} de ${fotosHojaRuta.length}`, 14, yPos)
        yPos += 5
        
        const imgBase64 = await urlToBase64(foto.urlPreview)
        doc.addImage(imgBase64, 'JPEG', 14, yPos, imgWidth, imgHeight)
        
        yPos += imgHeight + 15
      } catch (error) {
        console.error('Error al cargar imagen de hoja de ruta:', error)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text('Error al cargar imagen', 14, yPos)
        yPos += 20
      }
    }
  }

  // Pie de página en todas las páginas
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Página ${i} de ${pageCount} - Generado el ${new Date().toLocaleString('es-ES')}`,
      14,
      doc.internal.pageSize.height - 10
    )
  }

  // Descargar archivo
  const fileName = `Ruta_${ruta.id.slice(-6)}_${new Date(ruta.fecha).toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}
