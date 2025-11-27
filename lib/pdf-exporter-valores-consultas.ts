import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ValorConsultaObraSocial } from './types'
import { calcularNumeroLiquidacion } from './utils'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

interface PDFValoresConsultasOptions {
  valores: ValorConsultaObraSocial[]
  mes: number
  anio: number
  obrasSociales: string[]
  tiposConsulta: string[]
}

export function exportPDFValoresConsultas({
  valores,
  mes,
  anio,
  obrasSociales,
  tiposConsulta
}: PDFValoresConsultasOptions) {
  const doc = new jsPDF({
    orientation: 'landscape', // Horizontal para más espacio
    unit: 'mm',
    format: 'a4'
  })

  // Configuración de márgenes (según MEJORAS_PDF_FINAL.md)
  const marginLeft = 15
  const marginRight = 15
  const marginTop = 20
  const pageWidth = 297 // A4 landscape: 297mm x 210mm
  const pageHeight = 210
  const usableWidth = pageWidth - marginLeft - marginRight // 267mm

  let currentY = marginTop

  // Calcular número de liquidación
  const numeroLiquidacion = calcularNumeroLiquidacion(mes, anio)

  // ============================================
  // LOGO Y TEXTO (similar al layout de referencia)
  // ============================================
  
  // Logo Grow Labs (si existe)
  // doc.addImage('/logogrow.png', 'PNG', marginLeft, currentY, 18, 18)
  
  // Texto Grow Labs
  doc.setFontSize(11)
  doc.setTextColor(34, 197, 94) // Verde Grow Labs
  doc.setFont('helvetica', 'bold')
  doc.text('Grow Labs', marginLeft + 21, currentY + 7)
  
  doc.setFontSize(7.5)
  doc.setTextColor(100, 100, 100)
  doc.setFont('helvetica', 'normal')
  doc.text('Sistema de Liquidaciones de Guardias', marginLeft + 21, currentY + 12)

  // ============================================
  // CUADRO DE INFORMACIÓN (derecha)
  // ============================================
  const boxWidth = 90
  const boxX = pageWidth - marginRight - boxWidth // 192mm
  const boxStartY = currentY
  const rowHeight = 7.5
  const labelWidth = 42
  const valueWidth = boxWidth - labelWidth - 9 // 39mm

  // Fondo del cuadro
  doc.setFillColor(240, 240, 240)
  doc.setDrawColor(200, 200, 200)
  doc.roundedRect(boxX, boxStartY, boxWidth, rowHeight * 5, 2, 2, 'FD')

  // Contenido del cuadro
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

  // Obras Sociales
  doc.setFont('helvetica', 'bold')
  doc.text('Obras Sociales:', boxX + 4.5, boxY)
  doc.setFont('helvetica', 'normal')
  doc.text(String(obrasSociales.length), boxX + 4.5 + labelWidth, boxY)
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
  currentY = boxStartY + rowHeight * 5 + 8

  // Preparar datos para la tabla
  const tableData: any[][] = []
  
  obrasSociales.forEach(obraSocial => {
    const fila: any[] = [obraSocial]
    
    tiposConsulta.forEach(tipo => {
      const valor = valores.find(
        v => v.obra_social === obraSocial && v.tipo_consulta === tipo
      )
      
      if (valor) {
        // Formatear valor como moneda argentina
        const valorFormateado = new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(valor.valor)
        fila.push(valorFormateado)
      } else {
        fila.push('$ 0,00')
      }
    })
    
    tableData.push(fila)
  })

  // Headers de la tabla
  const headers = ['Obra Social', ...tiposConsulta]

  // Calcular anchos de columna (deben sumar usableWidth = 267mm)
  // Primera columna (Obra Social): más ancha
  const primeraColumna = 60
  const columnasRestantes = tiposConsulta.length
  const anchoRestante = usableWidth - primeraColumna
  const anchoPorColumna = Math.floor(anchoRestante / columnasRestantes)
  
  const columnWidths = [
    primeraColumna,
    ...Array(columnasRestantes).fill(anchoPorColumna)
  ]

  // Ajustar si hay diferencia por redondeo
  const sumaActual = columnWidths.reduce((a, b) => a + b, 0)
  if (sumaActual < usableWidth) {
    columnWidths[1] += usableWidth - sumaActual
  }

  // Generar tabla con autoTable
  autoTable(doc, {
    startY: currentY,
    head: [headers],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [34, 197, 94], // Verde Grow Labs
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [0, 0, 0],
      cellPadding: 2,
      halign: 'left'
    },
    columnStyles: {
      0: { 
        cellWidth: columnWidths[0],
        fontStyle: 'bold',
        halign: 'left'
      },
      // Estilos para columnas de valores (alinear a la derecha)
      ...Object.fromEntries(
        tiposConsulta.map((_, index) => [
          index + 1,
          {
            cellWidth: columnWidths[index + 1],
            halign: 'right',
            cellPadding: { right: 3 }
          }
        ])
      )
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
    rowPageBreak: 'avoid'
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
  const nombreArchivo = `Valores_Consultas_${MESES[mes - 1]}_${anio}.pdf`
  doc.save(nombreArchivo)
}

