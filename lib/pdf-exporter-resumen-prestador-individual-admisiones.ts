import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { DetalleGuardia } from './types'
import { calcularNumeroLiquidacion } from './utils'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

interface PDFResumenPrestadorIndividualOptions {
  prestadorNombre: string
  detalles: DetalleGuardia[]
  mes: number
  anio: number
  cantidad: number
  valorUnitario: number
  total: number
}

export function exportPDFResumenPrestadorIndividual({
  prestadorNombre,
  detalles,
  mes,
  anio,
  cantidad,
  valorUnitario,
  total
}: PDFResumenPrestadorIndividualOptions) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const marginLeft = 15
  const marginRight = 15
  const marginTop = 20
  const pageWidth = 210
  const pageHeight = 297
  const usableWidth = pageWidth - marginLeft - marginRight

  let currentY = marginTop

  // Calcular número de liquidación
  const numeroLiquidacion = calcularNumeroLiquidacion(mes, anio)

  // ============================================
  // LOGO Y TEXTO
  // ============================================
  doc.setFontSize(11)
  doc.setTextColor(168, 85, 247) // Color púrpura para Admisiones
  doc.setFont('helvetica', 'bold')
  doc.text('Grow Labs', marginLeft, currentY)
  
  doc.setFontSize(7.5)
  doc.setTextColor(100, 100, 100)
  doc.setFont('helvetica', 'normal')
  doc.text('Sistema de Liquidaciones de Guardias', marginLeft, currentY + 5)

  // ============================================
  // TÍTULO DEL PRESTADOR
  // ============================================
  currentY += 15
  doc.setFontSize(16)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(prestadorNombre.toUpperCase(), marginLeft, currentY)

  // ============================================
  // CUADRO DE INFORMACIÓN
  // ============================================
  currentY += 10
  const boxWidth = 90
  const boxX = pageWidth - marginRight - boxWidth
  const boxStartY = currentY
  const rowHeight = 7.5
  const labelWidth = 42

  // Fondo del cuadro
  doc.setFillColor(240, 240, 240)
  doc.setDrawColor(200, 200, 200)
  doc.roundedRect(boxX, boxStartY, boxWidth, rowHeight * 4, 2, 2, 'FD')

  let boxY = boxStartY + rowHeight / 2

  // Mes
  doc.setFontSize(8.5)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('Mes:', boxX + 4.5, boxY)
  doc.setFont('helvetica', 'normal')
  doc.text(MESES[mes - 1], boxX + 4.5 + labelWidth, boxY)
  boxY += rowHeight

  // Año
  doc.setFont('helvetica', 'bold')
  doc.text('Año:', boxX + 4.5, boxY)
  doc.setFont('helvetica', 'normal')
  doc.text(String(anio), boxX + 4.5 + labelWidth, boxY)
  boxY += rowHeight

  // Número de Liquidación
  doc.setFont('helvetica', 'bold')
  doc.text('Liq:', boxX + 4.5, boxY)
  doc.setFont('helvetica', 'normal')
  doc.text(String(numeroLiquidacion), boxX + 4.5 + labelWidth, boxY)
  boxY += rowHeight

  // Fecha de generación
  doc.setFont('helvetica', 'bold')
  doc.text('Generado:', boxX + 4.5, boxY)
  doc.setFont('helvetica', 'normal')
  const fechaGen = new Date().toLocaleDateString('es-AR')
  doc.text(fechaGen, boxX + 4.5 + labelWidth, boxY)

  // ============================================
  // RESUMEN GENERAL
  // ============================================
  currentY = boxStartY + rowHeight * 4 + 10

  // Título del resumen
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen', marginLeft, currentY)

  currentY += 8

  // Tabla de resumen
  const resumenData = [
    [
      'Cantidad de admisiones',
      String(cantidad)
    ],
    [
      'Valor unitario',
      new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(valorUnitario)
    ],
    [
      'Total',
      new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(total)
    ]
  ]

  autoTable(doc, {
    startY: currentY,
    head: [['Concepto', 'Valor']],
    body: resumenData,
    theme: 'plain',
    headStyles: {
      fillColor: [168, 85, 247], // Color púrpura para Admisiones
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [0, 0, 0],
      cellPadding: 3,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 120, fontStyle: 'bold' },
      1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' }
    },
    styles: {
      lineColor: [220, 220, 220],
      lineWidth: 0.1
    },
    margin: { left: marginLeft, right: marginRight },
    tableWidth: usableWidth
  })

  // ============================================
  // TABLA DE DETALLE DE PACIENTES
  // ============================================
  currentY = (doc as any).lastAutoTable.finalY + 15

  // Título del detalle
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('Detalle de Pacientes Atendidos', marginLeft, currentY)

  currentY += 8

  // Función para formatear fecha
  function formatearFecha(fecha: string | null): string {
    if (!fecha) return '-'
    try {
      const date = new Date(fecha)
      return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return fecha
    }
  }

  // Preparar datos para la tabla de pacientes
  const pacientesData = detalles
    .sort((a, b) => {
      // Ordenar por fecha
      const fechaA = a.fecha ? new Date(a.fecha).getTime() : 0
      const fechaB = b.fecha ? new Date(b.fecha).getTime() : 0
      return fechaA - fechaB
    })
    .map(detalle => [
      formatearFecha(detalle.fecha),
      detalle.paciente || '-',
      new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(detalle.importe_calculado || detalle.monto_facturado || valorUnitario)
    ])

  // Agregar fila de totales
  pacientesData.push([
    'TOTAL',
    `${cantidad} admisiones`,
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(total)
  ])

  // Headers
  const headers = ['Fecha', 'Paciente', 'Valor']

  // Anchos de columna
  const columnWidths = [40, 100, 40] // Suma = 180mm

  // Generar tabla
  autoTable(doc, {
    startY: currentY,
    head: [headers],
    body: pacientesData,
    theme: 'striped',
    headStyles: {
      fillColor: [168, 85, 247], // Color púrpura para Admisiones
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0],
      cellPadding: 2,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: columnWidths[0] },
      1: { cellWidth: columnWidths[1] },
      2: { cellWidth: columnWidths[2], halign: 'right', fontStyle: 'bold' }
    },
    styles: {
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      valign: 'middle'
    },
    margin: { left: marginLeft, right: marginRight },
    tableWidth: usableWidth,
    showHead: 'everyPage',
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    didParseCell: (data: any) => {
      // Resaltar fila de totales
      if (data.row.index === pacientesData.length - 1) {
        data.cell.styles.fillColor = [240, 240, 240]
        data.cell.styles.fontStyle = 'bold'
      }
    }
  })

  // ============================================
  // FOOTER
  // ============================================
  const pageCount = (doc as any).getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.setFont('helvetica', 'italic')
    doc.text(
      `Página ${i} de ${pageCount} - Powered by Grow Labs 🌱`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }

  // ============================================
  // GUARDAR PDF
  // ============================================
  const nombreArchivo = `Resumen_${prestadorNombre.replace(/[^a-zA-Z0-9]/g, '_')}_${MESES[mes - 1]}_${anio}.pdf`
  doc.save(nombreArchivo)
}

