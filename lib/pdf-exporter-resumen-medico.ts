import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ResumenPorMedico } from './ginecologia-resumenes'
import { calcularNumeroLiquidacion } from './utils'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

interface PDFResumenMedicoOptions {
  resumenes: ResumenPorMedico[]
  mes: number
  anio: number
  medicoNombre: string
}

export function exportPDFResumenPorMedico({
  resumenes,
  mes,
  anio,
  medicoNombre
}: PDFResumenMedicoOptions) {
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
  doc.setTextColor(34, 197, 94)
  doc.setFont('helvetica', 'bold')
  doc.text('Grow Labs', marginLeft, currentY)
  
  doc.setFontSize(7.5)
  doc.setTextColor(100, 100, 100)
  doc.setFont('helvetica', 'normal')
  doc.text('Sistema de Liquidaciones de Guardias', marginLeft, currentY + 5)

  // ============================================
  // TÍTULO DEL MÉDICO
  // ============================================
  currentY += 15
  doc.setFontSize(16)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(medicoNombre.toUpperCase(), marginLeft, currentY)

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
  // TABLA DE VALORES
  // ============================================
  currentY = boxStartY + rowHeight * 4 + 10

  // Preparar datos para la tabla
  const tableData = resumenes.map(r => [
    r.obra_social,
    String(r.cantidad),
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(r.valor_unitario),
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(r.total)
  ])

  // Agregar fila de totales
  const totalCantidad = resumenes.reduce((sum, r) => sum + r.cantidad, 0)
  const totalMonto = resumenes.reduce((sum, r) => sum + r.total, 0)
  tableData.push([
    'TOTAL',
    String(totalCantidad),
    '',
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(totalMonto)
  ])

  // Headers
  const headers = ['Obra social', 'Cantidad', 'Valor unitario', 'Total']

  // Anchos de columna
  const columnWidths = [70, 30, 40, 40] // Suma = 180mm

  // Generar tabla
  autoTable(doc, {
    startY: currentY,
    head: [headers],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [34, 197, 94],
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
      0: { cellWidth: columnWidths[0], fontStyle: 'bold' },
      1: { cellWidth: columnWidths[1], halign: 'right' },
      2: { cellWidth: columnWidths[2], halign: 'right' },
      3: { cellWidth: columnWidths[3], halign: 'right', fontStyle: 'bold' }
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
      if (data.row.index === tableData.length - 1) {
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
  const nombreArchivo = `Resumen_${medicoNombre.replace(/[^a-zA-Z0-9]/g, '_')}_${MESES[mes - 1]}_${anio}.pdf`
  doc.save(nombreArchivo)
}

