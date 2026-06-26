import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, TIPOS_ATA } from '../lib/supabase'
import { useToast } from '../hooks/useToast'

export default function Historico() {
  const { obraId } = useParams()
  const navigate = useNavigate()
  const { showToast, ToastContainer } = useToast()

  const [obra, setObra]             = useState(null)
  const [obraMeta, setObraMeta]     = useState(null)
  const [atas, setAtas]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [verArquivadas, setVerArquivadas] = useState(false)

  const [modalArquivar, setModalArquivar] = useState(null)
  const [modalExcluir, setModalExcluir]   = useState(null)
  const [textoConfirm, setTextoConfirm]   = useState('')

  useEffect(() => { load() }, [obraId])

  async function load() {
    setLoading(true)
    const [{ data: o }, { data: m }, { data: a }] = await Promise.all([
      supabase.from('obras').select('*').eq('id', obraId).single(),
      supabase.from('cp_obras_meta').select('*').eq('obra_id', obraId).single(),
      supabase.from('cp_atas')
        .select('*, cp_grupos(id, cp_itens(id, status))')
        .eq('obra_id', obraId)
        .order('numero_reuniao', { ascending: false }),
    ])
    setObra(o)
    setObraMeta(m)
    setAtas(a || [])
    setLoading(false)
  }

  async function arquivarAta(ata) {
    await supabase.from('cp_atas').update({ arquivada: true }).eq('id', ata.id)
    showToast('Ata arquivada — pode ser restaurada a qualquer momento')
    setModalArquivar(null)
    load()
  }

  async function restaurarAta(ataId) {
    await supabase.from('cp_atas').update({ arquivada: false }).eq('id', ataId)
    showToast('Ata restaurada ✓')
    load()
  }

  async function excluirDefinitivo(ata) {
    const { data: grupos } = await supabase
      .from('cp_grupos').select('id').eq('ata_id', ata.id)
    if (grupos?.length) {
      await supabase.from('cp_itens').delete().in('grupo_id', grupos.map(g => g.id))
      await supabase.from('cp_grupos').delete().in('id', grupos.map(g => g.id))
    }
    await supabase.from('cp_atas').delete().eq('id', ata.id)
    showToast('Ata excluída permanentemente')
    setModalExcluir(null)
    setTextoConfirm('')
    load()
  }

  function calcStats(ata) {
    // cp_grupos retorna cp_itens como subchave
    const itens = ata.cp_grupos?.flatMap(g => g.cp_itens) || []
    return {
      total:      itens.length,
      concluidos: itens.filter(i => i.status === 'CONCLUIDO').length,
      atrasados:  itens.filter(i => i.status === 'ATRASADO').length,
      alertas:    itens.filter(i => i.status === 'ALERTA').length,
    }
  }

  const atasAtivas     = atas.filter(a => !a.arquivada)
  const atasArquivadas = atas.filter(a => a.arquivada)
  const atasFiltradas  = (verArquivadas ? atasArquivadas : atasAtivas)
    .filter(a => filtroTipo === 'todos' || a.tipo === filtroTipo)

  function labelConfirm(ata) {
    return `#${String(ata.numero_reuniao || 1).padStart(2, '0')}`
  }

  return (
    <div style={s.page}>
      <ToastContainer />

      <div style={s.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={s.btnBack} onClick={() => navigate('/obras')}>
            <i className="ti ti-arrow-left" />
          </button>
          <div>
            <h1 style={s.h1}>{obraMeta?.cliente || obra?.nome} — {obra?.nome}</h1>
            <p style={s.sub}>Histórico de reuniões</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['todos', 'kickoff', 'interno', 'externo'].map(t => (
            <button key={t}
              style={{ ...s.filterBtn, ...(filtroTipo === t ? s.filterBtnActive : {}) }}
              onClick={() => setFiltroTipo(t)}
            >
              {t === 'todos' ? 'Todos' : TIPOS_ATA[t]?.label}
            </button>
          ))}
        </div>
      </div>

      <div style={s.toggleRow}>
        <button
          style={{ ...s.toggleBtn, ...(!verArquivadas ? s.toggleBtnActive : {}) }}
          onClick={() => setVerArquivadas(false)}
        >
          Ativas ({atasAtivas.length})
        </button>
        <button
          style={{ ...s.toggleBtn, ...(verArquivadas ? s.toggleBtnActive : {}) }}
          onClick={() => setVerArquivadas(true)}
        >
          <i className="ti ti-archive" /> Arquivadas ({atasArquivadas.length})
        </button>
      </div>

      {verArquivadas && atasArquivadas.length > 0 && (
        <div style={s.archiveInfo}>
          <i className="ti ti-info-circle" style={{ color: '#92400e', flexShrink: 0 }} />
          Atas arquivadas não aparecem no dashboard nem nas pendências. Você pode restaurá-las ou excluí-las permanentemente.
        </div>
      )}

      {loading ? (
        <p style={{ padding: 24, color: '#6b7280' }}>Carregando...</p>
      ) : (
        <div style={s.lista}>
          {atasFiltradas.length === 0 ? (
            <div style={s.empty}>
              <i className="ti ti-calendar-off" style={{ fontSize: 40, color: '#d1d5db' }} />
              <p>{verArquivadas ? 'Nenhuma ata arquivada.' : 'Nenhuma ata encontrada.'}</p>
            </div>
          ) : atasFiltradas.map(ata => {
            const st  = calcStats(ata)
            const tipo = TIPOS_ATA[ata.tipo]
            const pct  = st.total ? Math.round(st.concluidos / st.total * 100) : 0

            return (
              <div key={ata.id} style={{ ...s.card, ...(ata.arquivada ? s.cardArquivada : {}) }}>
                <div
                  style={s.cardClickArea}
                  onClick={() => !ata.arquivada && navigate('/ata/' + obraId + '/' + ata.tipo + '?ata=' + ata.id)}
                >
                  <div style={s.cardLeft}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ ...s.tipoBadge, background: tipo?.color, color: tipo?.text }}>
                        <i className={`ti ${tipo?.icon}`} /> {tipo?.label}
                      </span>
                      <span style={s.numReuniao}>#{String(ata.numero_reuniao || 1).padStart(2, '0')}</span>
                      {ata.arquivada && (
                        <span style={s.archiveBadge}><i className="ti ti-archive" /> Arquivada</span>
                      )}
                    </div>
                    <div style={s.dataAta}>
                      {new Date(ata.data_reuniao + 'T12:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
                      })}
                    </div>
                    <div style={s.progressBar}>
                      <div style={{ ...s.progressFill, width: `${pct}%` }} />
                    </div>
                    <div style={s.progressLabel}>{st.concluidos}/{st.total} itens concluídos ({pct}%)</div>
                  </div>
                  <div style={s.cardStats}>
                    {st.atrasados > 0 && <span style={s.statChip('#fee2e2', '#991b1b')}>⚠ {st.atrasados}</span>}
                    {st.alertas   > 0 && <span style={s.statChip('#fef3c7', '#92400e')}>🔶 {st.alertas}</span>}
                    {!ata.arquivada && <i className="ti ti-chevron-right" style={{ color: '#d1d5db', fontSize: 18 }} />}
                  </div>
                </div>

                <div style={s.cardActions}>
                  {!ata.arquivada ? (
                    <button style={s.btnArquivar} onClick={() => setModalArquivar(ata)}>
                      <i className="ti ti-archive" /> Arquivar
                    </button>
                  ) : (
                    <>
                      <button style={s.btnRestaurar} onClick={() => restaurarAta(ata.id)}>
                        <i className="ti ti-archive-off" /> Restaurar
                      </button>
                      <button style={s.btnExcluir} onClick={() => { setModalExcluir(ata); setTextoConfirm('') }}>
                        <i className="ti ti-trash" /> Excluir permanentemente
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalArquivar && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>Arquivar ata?</span>
              <button style={s.btnClose} onClick={() => setModalArquivar(null)}><i className="ti ti-x" /></button>
            </div>
            <p style={s.modalDesc}>
              A ata <strong>#{String(modalArquivar.numero_reuniao || 1).padStart(2, '0')}</strong> de{' '}
              <strong>{new Date(modalArquivar.data_reuniao + 'T12:00:00').toLocaleDateString('pt-BR')}</strong> será arquivada.
              Ela vai sair do dashboard e das pendências, mas <strong>pode ser restaurada a qualquer momento</strong>.
            </p>
            <div style={s.modalFooter}>
              <button style={s.btnConfirmArquivar} onClick={() => arquivarAta(modalArquivar)}>
                <i className="ti ti-archive" /> Arquivar
              </button>
              <button style={s.btnCancelar} onClick={() => setModalArquivar(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modalExcluir && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <span style={{ ...s.modalTitle, color: '#dc2626' }}>⚠ Excluir permanentemente</span>
              <button style={s.btnClose} onClick={() => setModalExcluir(null)}><i className="ti ti-x" /></button>
            </div>
            <p style={s.modalDesc}>
              Esta ação é <strong>irreversível</strong>. Todos os grupos, itens e observações da ata{' '}
              <strong>{labelConfirm(modalExcluir)}</strong> serão apagados para sempre.
            </p>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
              Para confirmar, digite <strong>{labelConfirm(modalExcluir)}</strong> abaixo:
            </p>
            <input
              style={s.inputConfirm}
              value={textoConfirm}
              onChange={e => setTextoConfirm(e.target.value)}
              placeholder={labelConfirm(modalExcluir)}
              autoFocus
            />
            <div style={s.modalFooter}>
              <button
                style={{ ...s.btnExcluirConfirm, opacity: textoConfirm === labelConfirm(modalExcluir) ? 1 : 0.4 }}
                disabled={textoConfirm !== labelConfirm(modalExcluir)}
                onClick={() => excluirDefinitivo(modalExcluir)}
              >
                <i className="ti ti-trash" /> Excluir permanentemente
              </button>
              <button style={s.btnCancelar} onClick={() => setModalExcluir(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page:     { padding: 24, maxWidth: 860, margin: '0 auto' },
  topBar:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 16 },
  btnBack:  { background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 18, cursor: 'pointer', color: '#6b7280', display: 'flex' },
  h1:       { fontSize: 20, fontWeight: 800, color: '#2e2e2e' },
  sub:      { fontSize: 13, color: '#6b7280', marginTop: 2 },
  filterBtn:       { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: '#6b7280', cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  filterBtnActive: { background: '#2e2e2e', color: '#07D48A', borderColor: '#2e2e2e' },
  toggleRow:  { display: 'flex', gap: 8, marginBottom: 16 },
  toggleBtn:  { padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Inter, sans-serif' },
  toggleBtnActive: { background: '#2e2e2e', color: '#07D48A', borderColor: '#2e2e2e' },
  archiveInfo: { display: 'flex', gap: 10, background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 16, alignItems: 'flex-start', lineHeight: 1.5 },
  lista:    { display: 'flex', flexDirection: 'column', gap: 10 },
  empty:    { textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: '#6b7280' },
  card:     { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' },
  cardArquivada: { opacity: 0.7, borderColor: '#fcd34d', background: '#fffbeb' },
  cardClickArea: { display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', cursor: 'pointer' },
  cardLeft: { flex: 1 },
  tipoBadge:{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 },
  numReuniao: { fontSize: 12, fontWeight: 800, color: '#9ca3af', letterSpacing: '0.05em' },
  archiveBadge: { fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#92400e', borderRadius: 12, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 },
  dataAta:  { fontSize: 14, fontWeight: 600, color: '#2e2e2e', marginBottom: 8 },
  progressBar:  { height: 4, background: '#f3f4f6', borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', background: '#07D48A', borderRadius: 2 },
  progressLabel:{ fontSize: 11, color: '#6b7280' },
  cardStats:{ display: 'flex', alignItems: 'center', gap: 8 },
  statChip: (bg, color) => ({ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: bg, color }),
  cardActions: { borderTop: '1px solid #f3f4f6', display: 'flex', gap: 8, padding: '8px 16px', background: '#fafafa' },
  btnArquivar:  { background: 'none', border: '1px solid #e5e7eb', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Inter, sans-serif' },
  btnRestaurar: { background: 'none', border: '1px solid #86efac', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#166534', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Inter, sans-serif' },
  btnExcluir:   { background: 'none', border: '1px solid #fca5a5', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Inter, sans-serif' },
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal:    { background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 420 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle:  { fontSize: 16, fontWeight: 700 },
  btnClose: { background: 'none', border: 'none', fontSize: 20, color: '#6b7280', cursor: 'pointer' },
  modalDesc:   { fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 16 },
  inputConfirm:{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'Inter, sans-serif', outline: 'none', marginBottom: 16 },
  modalFooter: { display: 'flex', gap: 8 },
  btnConfirmArquivar: { flex: 1, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Inter, sans-serif' },
  btnExcluirConfirm:  { flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Inter, sans-serif' },
  btnCancelar:{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer', color: '#6b7280', fontFamily: 'Inter, sans-serif' },
}
