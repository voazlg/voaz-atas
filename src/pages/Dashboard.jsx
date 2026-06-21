import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { STATUS } from '../lib/supabase'

const URGENCIA = ['ATRASADO', 'ALERTA', 'MONITORAMENTO', 'EM_ANDAMENTO']

export default function Dashboard() {
  const { perfil } = useAuth()
  const navigate = useNavigate()

  const [scores, setScores]           = useState([])
  const [pendencias, setPendencias]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [aba, setAba]                 = useState('pendencias')
  const [filtroObra, setFiltroObra]   = useState('todas')
  const [filtroPM, setFiltroPM]       = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)

    const [{ data: sc }, { data: pend }] = await Promise.all([
      supabase.from('score_obras').select('*').order('score', { ascending: true }),
      supabase.from('pendencias').select('*').order('obra_nome'),
    ])

    setScores(sc || [])
    setPendencias(pend || [])
    setLoading(false)
  }

  const obras      = scores
  const pmsUnicos  = [...new Map(scores.map(s => [s.pm_id, { id: s.pm_id, nome: s.pm_nome }])).values()]
  const isSocio    = perfil?.role === 'socio'

  // ── FILTROS ──
  const pendFiltradas = pendencias.filter(p => {
    if (filtroObra !== 'todas' && p.obra_id !== filtroObra) return false
    if (filtroPM !== 'todos' && p.pm_id !== filtroPM) return false
    if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false
    return true
  })

  const porObra = pendFiltradas.reduce((acc, p) => {
    if (!acc[p.obra_id]) acc[p.obra_id] = { nome: p.obra_nome, cliente: p.cliente, pm: p.pm_nome, pm_id: p.pm_id, itens: [] }
    acc[p.obra_id].itens.push(p)
    return acc
  }, {})
  Object.values(porObra).forEach(o => {
    o.itens.sort((a, b) => URGENCIA.indexOf(a.status) - URGENCIA.indexOf(b.status))
  })

  // ── TOTAIS ──
  const totalAtras  = pendencias.filter(p => p.status === 'ATRASADO').length
  const totalAlerta = pendencias.filter(p => p.status === 'ALERTA').length
  const scoreGeral  = scores.length ? Math.round(scores.reduce((s, o) => s + Number(o.score), 0) / scores.length) : 100
  const corScore    = scoreGeral >= 70 ? '#07D48A' : scoreGeral >= 40 ? '#f59e0b' : '#ef4444'

  // ── CARGA POR PM ──
  const cargaPM = pmsUnicos.map(pm => {
    const obrasPM = scores.filter(s => s.pm_id === pm.id)
    const pendPM  = pendencias.filter(p => p.pm_id === pm.id)
    const scorePM = obrasPM.length
      ? Math.round(obrasPM.reduce((s, o) => s + Number(o.score), 0) / obrasPM.length)
      : 100
    return {
      ...pm,
      obras: obrasPM.length,
      pendentes: pendPM.length,
      atrasados: pendPM.filter(p => p.status === 'ATRASADO').length,
      score: scorePM,
    }
  }).sort((a, b) => a.score - b.score)

  function corSaude(status) {
    return status === 'verde' ? '#07D48A' : status === 'amarelo' ? '#f59e0b' : '#ef4444'
  }
  function bgSaude(status) {
    return status === 'verde' ? '#d1fae5' : status === 'amarelo' ? '#fef3c7' : '#fee2e2'
  }
  function labelSaude(status) {
    return status === 'verde' ? 'Saudável' : status === 'amarelo' ? 'Atenção' : 'Crítico'
  }

  return (
    <div style={s.page}>

      {/* ── HEADER ── */}
      <div style={s.topBar}>
        <div>
          <h1 style={s.h1}>Dashboard</h1>
          <p style={s.sub}>{isSocio ? 'Visão geral de todas as obras' : `Suas obras — ${perfil?.nome}`}</p>
        </div>
        <button style={s.btnRefresh} onClick={load}>
          <i className="ti ti-refresh" /> Atualizar
        </button>
      </div>

      {/* ── CARDS RESUMO ── */}
      <div style={s.resumoRow}>
        <div style={s.resumoCard}>
          <div style={{ fontSize: 28, fontWeight: 800, color: corScore }}>{scoreGeral}</div>
          <div style={s.resumoLabel}>Score médio geral</div>
        </div>
        <div style={{ ...s.resumoCard, borderColor: '#fca5a5' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626' }}>{totalAtras}</div>
          <div style={s.resumoLabel}>Itens atrasados</div>
        </div>
        <div style={{ ...s.resumoCard, borderColor: '#fcd34d' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#92400e' }}>{totalAlerta}</div>
          <div style={s.resumoLabel}>Em alerta</div>
        </div>
        <div style={s.resumoCard}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#2e2e2e' }}>{scores.length}</div>
          <div style={s.resumoLabel}>Obras ativas</div>
        </div>
      </div>

      {/* ── ABAS ── */}
      <div style={s.tabs}>
        {[
          { key: 'pendencias', label: 'Pendências', icon: 'ti-list' },
          { key: 'saude',      label: 'Saúde das obras', icon: 'ti-heart-rate-monitor' },
          ...(isSocio ? [{ key: 'carga', label: 'Carga por PM', icon: 'ti-users' }] : []),
        ].map(t => (
          <button key={t.key} style={{ ...s.tab, ...(aba === t.key ? s.tabActive : {}) }} onClick={() => setAba(t.key)}>
            <i className={`ti ${t.icon}`} /> {t.label}
          </button>
        ))}
      </div>

      {loading ? <p style={{ padding: 24, color: '#6b7280' }}>Carregando...</p> : (
        <>
          {/* ══ ABA: PENDÊNCIAS ══ */}
          {aba === 'pendencias' && (
            <div style={s.section}>
              {/* Filtros */}
              <div style={s.filtrosBar}>
                <select style={s.filterSel} value={filtroObra} onChange={e => setFiltroObra(e.target.value)}>
                  <option value="todas">Todas as obras</option>
                  {scores.map(o => <option key={o.obra_id} value={o.obra_id}>{o.cliente} — {o.obra_nome}</option>)}
                </select>
                {isSocio && (
                  <select style={s.filterSel} value={filtroPM} onChange={e => setFiltroPM(e.target.value)}>
                    <option value="todos">Todos os PMs</option>
                    {pmsUnicos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                )}
                <select style={s.filterSel} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                  <option value="todos">Todos os status</option>
                  {Object.entries(STATUS).filter(([k]) => k !== 'CONCLUIDO').map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              {Object.keys(porObra).length === 0 ? (
                <div style={s.empty}>
                  <i className="ti ti-circle-check" style={{ fontSize: 48, color: '#07D48A' }} />
                  <p style={{ fontWeight: 700, fontSize: 16 }}>Tudo em dia!</p>
                  <p style={{ color: '#6b7280' }}>Nenhuma pendência com os filtros atuais.</p>
                </div>
              ) : (
                <div style={s.obrasList}>
                  {Object.entries(porObra).map(([obraId, obra]) => (
                    <div key={obraId} style={s.obraCard}>
                      <div style={s.obraHeader}>
                        <div style={s.obraInfo}>
                          <span style={s.obraCliente}>{obra.cliente}</span>
                          <span style={s.obraNome}>{obra.nome}</span>
                          {isSocio && <span style={s.obraPM}><i className="ti ti-user" /> {obra.pm}</span>}
                        </div>
                        <div style={s.obraStats}>
                          {['ATRASADO','ALERTA'].map(st => {
                            const cnt = obra.itens.filter(i => i.status === st).length
                            if (!cnt) return null
                            return <span key={st} style={{ ...s.statPill, background: STATUS[st].color, color: STATUS[st].text }}>{cnt} {STATUS[st].label}</span>
                          })}
                          <button style={s.btnIrAta} onClick={() => navigate(`/ata/${obraId}/interno`)}>
                            Abrir ata <i className="ti ti-arrow-right" />
                          </button>
                        </div>
                      </div>
                      <table style={s.table}>
                        <thead>
                          <tr>
                            <th style={s.th}>Assunto</th>
                            <th style={{ ...s.th, width: 100 }}>Tipo</th>
                            <th style={{ ...s.th, width: 110 }}>Responsável</th>
                            <th style={{ ...s.th, width: 90 }}>Data limite</th>
                            <th style={{ ...s.th, minWidth: 160 }}>Última obs.</th>
                            <th style={{ ...s.th, width: 120 }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {obra.itens.map(item => {
                            const stCfg = STATUS[item.status]
                            const ultimaObs = item.observacoes?.split('\n').slice(-1)[0] || ''
                            const vencido = item.data_limite && new Date(item.data_limite) < new Date() && item.status !== 'CONCLUIDO'
                            return (
                              <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={s.td}>{item.assunto}</td>
                                <td style={s.td}>
                                  <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 12, background: item.tipo_ata === 'interno' ? '#e0e7ff' : '#dcfce7', color: item.tipo_ata === 'interno' ? '#3730a3' : '#166534', letterSpacing: '0.05em' }}>
                                    {item.tipo_ata === 'interno' ? '🔒 INT' : '👥 EXT'}
                                  </span>
                                </td>
                                <td style={s.td}>{item.responsavel || '—'}</td>
                                <td style={{ ...s.td, color: vencido ? '#dc2626' : '#2e2e2e', fontWeight: vencido ? 700 : 400 }}>
                                  {item.data_limite ? new Date(item.data_limite + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                                  {vencido && ' ⚠'}
                                </td>
                                <td style={{ ...s.td, color: '#6b7280', fontSize: 12 }}>{ultimaObs || '—'}</td>
                                <td style={s.td}>
                                  <span className={`badge badge-${item.status}`}>{stCfg?.label}</span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ ABA: SAÚDE DAS OBRAS ══ */}
          {aba === 'saude' && (
            <div style={s.section}>
              <div style={s.saudeGrid}>
                {scores.map(o => (
                  <div key={o.obra_id} style={s.saudeCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#07D48A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{o.cliente}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#2e2e2e', marginTop: 2 }}>{o.obra_nome}</div>
                        {isSocio && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}><i className="ti ti-user" /> {o.pm_nome}</div>}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 32, fontWeight: 800, color: corSaude(o.status_saude), lineHeight: 1 }}>{o.score}</div>
                        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>score</div>
                      </div>
                    </div>

                    {/* Barra de saúde */}
                    <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${o.score}%`, background: corSaude(o.status_saude), borderRadius: 3, transition: 'width .5s ease' }} />
                    </div>

                    {/* Badge status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: bgSaude(o.status_saude), color: corSaude(o.status_saude) }}>
                        {labelSaude(o.status_saude)}
                      </span>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{o.total} itens total</span>
                    </div>

                    {/* Breakdown */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {[
                        { label: 'Atrasados',    val: o.atrasados,    bg: '#fee2e2', color: '#991b1b' },
                        { label: 'Alertas',      val: o.alertas,      bg: '#fef3c7', color: '#92400e' },
                        { label: 'Em andamento', val: o.em_andamento, bg: '#dbeafe', color: '#1e40af' },
                        { label: 'Concluídos',   val: o.concluidos,   bg: '#d1fae5', color: '#065f46' },
                      ].map(item => (
                        <div key={item.label} style={{ background: item.bg, borderRadius: 6, padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: item.color, fontWeight: 500 }}>{item.label}</span>
                          <span style={{ fontSize: 14, fontWeight: 800, color: item.color }}>{item.val}</span>
                        </div>
                      ))}
                    </div>

                    <button style={s.btnIrAtaSaude} onClick={() => navigate(`/ata/${o.obra_id}/interno`)}>
                      Abrir ata <i className="ti ti-arrow-right" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ ABA: CARGA POR PM ══ */}
          {aba === 'carga' && isSocio && (
            <div style={s.section}>
              <div style={s.cargaGrid}>
                {cargaPM.map(pm => (
                  <div key={pm.id} style={s.cargaCard}>
                    <div style={s.cargaHeader}>
                      <div style={s.avatar}>{pm.nome?.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{pm.nome}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>Project Manager</div>
                      </div>
                      <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: pm.score >= 70 ? '#07D48A' : pm.score >= 40 ? '#f59e0b' : '#ef4444' }}>{pm.score}</div>
                        <div style={{ fontSize: 10, color: '#6b7280' }}>score</div>
                      </div>
                    </div>

                    <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2, margin: '12px 0', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pm.score}%`, background: pm.score >= 70 ? '#07D48A' : pm.score >= 40 ? '#f59e0b' : '#ef4444', borderRadius: 2 }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <div style={{ textAlign: 'center', padding: '8px 4px', background: '#f9fafb', borderRadius: 8 }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#2e2e2e' }}>{pm.obras}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>obras</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '8px 4px', background: '#fee2e2', borderRadius: 8 }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{pm.atrasados}</div>
                        <div style={{ fontSize: 11, color: '#dc2626' }}>atrasados</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '8px 4px', background: '#dbeafe', borderRadius: 8 }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#1e40af' }}>{pm.pendentes}</div>
                        <div style={{ fontSize: 11, color: '#1e40af' }}>pendentes</div>
                      </div>
                    </div>

                    {/* Obras deste PM */}
                    <div style={{ marginTop: 12 }}>
                      {scores.filter(o => o.pm_id === pm.id).map(o => (
                        <div key={o.obra_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #f3f4f6' }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#2e2e2e' }}>{o.cliente}</div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>{o.obra_nome}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: corSaude(o.status_saude) }}>{o.score}</span>
                            <button style={{ ...s.btnIrAta, padding: '4px 10px', fontSize: 11 }} onClick={() => navigate(`/ata/${o.obra_id}/interno`)}>
                              Ver
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const s = {
  page:        { paddingBottom: 60 },
  topBar:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 24px 0', maxWidth: 1200, margin: '0 auto' },
  h1:          { fontSize: 22, fontWeight: 800, color: '#2e2e2e' },
  sub:         { fontSize: 13, color: '#6b7280', marginTop: 2 },
  btnRefresh:  { background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  resumoRow:   { display: 'flex', gap: 12, padding: '20px 24px', maxWidth: 1200, margin: '0 auto', flexWrap: 'wrap' },
  resumoCard:  { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px', minWidth: 120, display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  resumoLabel: { fontSize: 12, color: '#6b7280', fontWeight: 500 },
  tabs:        { display: 'flex', background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', gap: 2 },
  tab:         { padding: '11px 16px', background: 'none', border: 'none', borderBottom: '2px solid transparent', fontSize: 13, fontWeight: 500, color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: -1 },
  tabActive:   { color: '#2e2e2e', borderBottomColor: '#07D48A', fontWeight: 600 },
  section:     { padding: 24, maxWidth: 1200, margin: '0 auto' },
  filtrosBar:  { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  filterSel:   { border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: '#fff', color: '#2e2e2e', outline: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  empty:       { textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  obrasList:   { display: 'flex', flexDirection: 'column', gap: 16 },
  obraCard:    { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' },
  obraHeader:  { padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', background: '#fafafa', flexWrap: 'wrap', gap: 8 },
  obraInfo:    { display: 'flex', alignItems: 'center', gap: 10 },
  obraCliente: { fontSize: 11, fontWeight: 700, color: '#07D48A', textTransform: 'uppercase', letterSpacing: '0.08em' },
  obraNome:    { fontSize: 15, fontWeight: 700, color: '#2e2e2e' },
  obraPM:      { fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 },
  obraStats:   { display: 'flex', alignItems: 'center', gap: 8 },
  statPill:    { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  btnIrAta:    { background: '#07D48A', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  table:       { width: '100%', borderCollapse: 'collapse' },
  th:          { background: '#f9fafb', padding: '7px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', textAlign: 'left', borderBottom: '1px solid #e5e7eb' },
  td:          { padding: '8px 12px', fontSize: 13, color: '#2e2e2e', verticalAlign: 'middle' },
  saudeGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  saudeCard:   { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 },
  btnIrAtaSaude: { width: '100%', marginTop: 14, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#2e2e2e' },
  cargaGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  cargaCard:   { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 },
  cargaHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 },
  avatar:      { width: 40, height: 40, borderRadius: '50%', background: '#2e2e2e', color: '#07D48A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 },
}
