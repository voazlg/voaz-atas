import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { STATUS } from './supabase'

export function gerarPDF(obra, ata, grupos, tipo) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  // ── PALETA ──
  const DARK  = [46, 46, 46]
  const GREEN = [7, 212, 138]
  const WHITE = [255, 255, 255]
  const GRAY  = [107, 114, 128]
  const LGRAY = [243, 244, 246]

  const STATUS_COLORS = {
    CONCLUIDO:     { bg: [209, 250, 229], text: [6,  95,  70] },
    EM_ANDAMENTO:  { bg: [219, 234, 254], text: [30, 64, 175] },
    ATRASADO:      { bg: [254, 226, 226], text: [153, 27, 27] },
    ALERTA:        { bg: [254, 243, 199], text: [146, 64, 14] },
    MONITORAMENTO: { bg: [237, 233, 254], text: [91,  33,182] },
  }

  // ── HEADER ──
  doc.setFillColor(...DARK)
  doc.rect(0, 0, W, 22, 'F')
  doc.setFillColor(...GREEN)
  doc.rect(0, 22, W, 2, 'F')

  // Logo VOAZ (texto)
  doc.setTextColor(...GREEN)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('VOAZ', 10, 14)

  doc.setTextColor(...WHITE)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Checkpoint ${tipo === 'interno' ? 'Interno' : 'Externo'} — ${obra.cliente} | ${obra.nome}`, 35, 10)

  const dataFmt = new Date(ata.data_reuniao + 'T12:00:00').toLocaleDateString('pt-BR')
  doc.setFontSize(8)
  doc.text(`Data: ${dataFmt}`, 35, 16)
  if (obra.local) doc.text(`Local: ${obra.local}`, 100, 16)

  let cursorY = 30

  // ── GRUPOS ──
  for (const grupo of grupos) {
    if (grupo.itens.length === 0) continue

    // Título do grupo
    doc.setFillColor(...DARK)
    doc.rect(10, cursorY, W - 20, 7, 'F')
    doc.setTextColor(...GREEN)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text(grupo.titulo.toUpperCase(), 13, cursorY + 4.8)

    cursorY += 7

    // Tabela
    const rows = grupo.itens.map(item => [
      item.assunto || '',
      item.data_item ? new Date(item.data_item + 'T12:00:00').toLocaleDateString('pt-BR') : '',
      item.data_limite ? new Date(item.data_limite + 'T12:00:00').toLocaleDateString('pt-BR') : '',
      item.responsavel || '',
      item.observacoes ? item.observacoes.split('\n').slice(-1)[0].substring(0, 80) : '',
      STATUS[item.status]?.label || item.status,
    ])

    autoTable(doc, {
      startY: cursorY,
      head: [['Assunto', 'Data item', 'Data limite', 'Responsável', 'Observações', 'Status']],
      body: rows,
      margin: { left: 10, right: 10 },
      styles: {
        fontSize: 7,
        font: 'helvetica',
        cellPadding: 2,
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fillColor: LGRAY,
        textColor: GRAY,
        fontStyle: 'bold',
        fontSize: 6.5,
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 28 },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 30, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.column.index === 5 && data.section === 'body') {
          const raw = grupo.itens[data.row.index]?.status
          const cfg = STATUS_COLORS[raw]
          if (cfg) {
            data.cell.styles.fillColor = cfg.bg
            data.cell.styles.textColor = cfg.text
            data.cell.styles.fontStyle = 'bold'
          }
        }
      },
      theme: 'grid',
    })

    cursorY = doc.lastAutoTable.finalY + 6

    // Nova página se necessário
    if (cursorY > 185) {
      doc.addPage()
      cursorY = 10
    }
  }

  // ── RODAPÉ ──
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFillColor(...LGRAY)
    doc.rect(0, doc.internal.pageSize.getHeight() - 8, W, 8, 'F')
    doc.setTextColor(...GRAY)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('VOAZ Engenharia | www.voaz.com.br | contato@voazengenharia.com.br', 10, doc.internal.pageSize.getHeight() - 2.5)
    doc.text(`Pág. ${i}/${pageCount}`, W - 10, doc.internal.pageSize.getHeight() - 2.5, { align: 'right' })
  }

  // ── DOWNLOAD ──
  const filename = `VOAZ-CP-${obra.cliente.replace(/\s/g, '_')}-${ata.data_reuniao}.pdf`
  doc.save(filename)
}
