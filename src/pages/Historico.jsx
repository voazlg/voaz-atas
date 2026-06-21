import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { TIPOS_ATA } from '../lib/supabase'

export default function Historico() {
  const { obraId } = useParams()
  const navigate = useNavigate()

  const [obra, setObra]     = useState(null)
  const [atas, setAtas]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('todos')

  useEffect(() => { load() }, [obraId])

  async function load() {
    setLoading(true)
    const [{ data: o }, { data: a }] = await Promise.all([
      supabase.from('obras').select('*').eq('id', obraId).single(),
      supabase.from('atas')
        .select('*, grupos(id, itens(id, status))')
        .eq('obra_id', obraId)
        .order('data_reuniao', { ascending: false }),
    ])
    setObra(o)
    setAtas(a || [])
    setLoading(false)
  }

  const atasFiltradas = atas.filter(a => filtroTipo === 'todos' || a.tipo === filtroTipo)

  function calcStats(ata) {
    const itens = ata.grupos?.flatMap(g => g.itens) || []
    const total = itens.length
    const concluidos = itens.filter(i => i.status === 'CONCLUIDO').length
    const atrasados  = itens.filter(i => i.status === 'ATRASADO').length
    const alertas    = itens.filter(i => i.status === 'ALERTA').length
    return { total, concluidos, atrasados, alertas }
  }

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={s.btnBack} onClick={() => navigate('/obras')}>
            <i className="ti ti-arrow-left" />
          </button>
          <div>
            <h1 style={s.h1}>{obra?.cliente} — {obra?.nome}</h1>
            <p style={s.sub}>Histórico de reuniões</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['todos','kickoff','interno','externo'].map(t => (
            <button key={t} style={{ ...s.filterBtn, ...(filtroTipo === t ? s.filterBtnActive : {}) }} onClick={() => setFiltroTipo(t)}>
              {t === 'todos' ? 'Todos' : TIPOS_ATA[t]?.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p style={{ padding: 24, color: '#6b7280' }}>Carregando...</p> : (
        <div style={s.lista}>
          {atasFiltradas.length === 0 ? (
            <div style={s.empty}>
              <i className="ti ti-calendar-off" style={{ fontSize: 40, color: '#d1d5db' }} />
              <p>Nenhuma ata encontrada.</p>
            </div>
          ) : atasFiltradas.map(ata => {
            const st    = calcStats(ata)
            const tipo  = TIPOS_ATA[ata.tipo]
            const pct   = st.total ? Math.round(st.concluidos / st.total * 100) : 0
            return (
              <div key={ata.id} style={s.card} onClick={() => navigate(`/ata/${obraId}/${ata.tipo}?ata=${ata.id}`)}>
                <div style={s.cardLeft}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ ...s.tipoBadge, background: tipo?.color, color: tipo?.text }}>
                      <i className={`ti ${tipo?.icon}`} /> {tipo?.label}
                    </span>
                    <span style={s.numReuniao}>
                      #{String(ata.numero_reuniao || 1).padStart(2,'0')}
                    </span>
                  </div>
                  <div style={s.dataAta}>
                    {new Date(ata.data_reuniao + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={s.progressBar}>
                    <div style={{ ...s.progressFill, width: `${pct}%` }} />
                  </div>
                  <div style={s.progressLabel}>{st.concluidos}/{st.total} itens concluídos ({pct}%)</div>
                </div>
                <div style={s.cardStats}>
                  {st.atrasados > 0 && <span style={s.statChip('fee2e2','991b1b')}>⚠ {st.atrasados}</span>}
                  {st.alertas   > 0 && <span style={s.statChip('fef3c7','92400e')}>🔶 {st.alertas}</span>}
                  <i className="ti ti-chevron-right" style={{ color: '#d1d5db', fontSize: 18 }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const s = {
  page:     { padding: 24, maxWidth: 860, margin: '0 auto' },
  topBar:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
  btnBack:  { background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 18, cursor: 'pointer', color: '#6b7280', display: 'flex' },
  h1:       { fontSize: 20, fontWeight: 800, color: '#2e2e2e' },
  sub:      { fontSize: 13, color: '#6b7280', marginTop: 2 },
  filterBtn:       { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: '#6b7280', cursor: 'pointer' },
  filterBtnActive: { background: '#2e2e2e', color: '#07D48A', borderColor: '#2e2e2e' },
  lista:    { display: 'flex', flexDirection: 'column', gap: 10 },
  empty:    { textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: '#6b7280' },
  card:     { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'border-color .15s' },
  cardLeft: { flex: 1 },
  tipoBadge:{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 },
  numReuniao: { fontSize: 12, fontWeight: 800, color: '#9ca3af', letterSpacing: '0.05em' },
  dataAta:  { fontSize: 14, fontWeight: 600, color: '#2e2e2e', marginBottom: 8 },
  progressBar:  { height: 4, background: '#f3f4f6', borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', background: '#07D48A', borderRadius: 2, transition: 'width .4s ease' },
  progressLabel:{ fontSize: 11, color: '#6b7280' },
  cardStats:{ display: 'flex', alignItems: 'center', gap: 8 },
  statChip: (bg, color) => ({ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: `#${bg}`, color: `#${color}` }),
}
