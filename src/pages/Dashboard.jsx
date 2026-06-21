import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { STATUS } from '../lib/supabase'

const URGENCIA = ['ATRASADO', 'ALERTA', 'MONITORAMENTO', 'EM_ANDAMENTO']

export default function Dashboard() {
  const { perfil } = useAuth()
  const navigate = useNavigate()

  const [pendencias, setPendencias]   = useState([])
  const [obras, setObras]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [filtroObra, setFiltroObra]   = useState('todas')
  const [filtroPM, setFiltroPM]       = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [pms, setPMs]                 = useState([])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)

    const { data: obs } = await supabase
      .from('obras')
      .select('*, usuarios(nome, role)')
      .eq('ativa', true)
      .order('cliente')
    setObras(obs || [])

    const { data: pend } = await supabase
      .from('pendencias')
      .select('*')
      .order('obra_nome')
    setPendencias(pend || [])

    // PMs únicos (para filtro de sócio)
    if (perfil?.role === 'socio' && obs) {
      const pmSet = [...new Map(obs.map(o => [o.pm_id, { id: o.pm_id, nome: o.usuarios?.nome }])).values()]
      setPMs(pmSet)
    }

    setLoading(false)
  }

  // ── FILTROS ──
  const pendFiltradas = pendencias.filter(p => {
    if (filtroObra !== 'todas' && p.obra_id !== filtroObra) return false
    if (filtroPM !== 'todos' && p.pm_id !== filtroPM) return false
    if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false
    return true
  })

  // Agrupar por obra
  const porObra = pendFiltradas.reduce((acc, p) => {
    if (!acc[p.obra_id]) acc[p.obra_id] = { nome: p.obra_nome, cliente: p.cliente, pm: p.pm_nome, itens: [] }
    acc[p.obra_id].itens.push(p)
    return acc
  }, {})

  // Ordenar itens por urgência
  Object.values(porObra).forEach(o => {
    o.itens.sort((a, b) => URGENCIA.indexOf(a.status) - URGENCIA.indexOf(b.status))
  })

  const totalPend = pendFiltradas.length
  const totalAtras = pendFiltradas.filter(p => p.status === 'ATRASADO').length
  const totalAlerta = pendFiltradas.filter(p => p.status === 'ALERTA').length

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div>
          <h1 style={s.h1}>Dashboard de pendências</h1>
          <p style={s.sub}>
            {perfil?.role === 'socio' ? 'Visão geral — todas as obras' : `Suas obras — ${perfil?.nome}`}
          </p>
        </div>
        <button style={s.btnRefresh} onClick={load}>
          <i className="ti ti-refresh" /> Atualizar
        </button>
      </div>

      {/* RESUMO */}
      <div style={s.resumoRow}>
        <div style={s.resumoCard}>
          <span style={s.resumoNum}>{obras.length}</span>
          <span style={s.resumoLabel}>Obras ativas</span>
        </div>
        <div style={{ ...s.resumoCard, borderColor: '#fca5a5' }}>
          <span style={{ ...s.resumoNum, color: '#dc2626' }}>{totalAtras}</span>
          <span style={s.resumoLabel}>Atrasados</span>
        </div>
        <div style={{ ...s.resumoCard, borderColor: '#fcd34d' }}>
          <span style={{ ...s.resumoNum, color: '#92400e' }}>{totalAlerta}</span>
          <span style={s.resumoLabel}>Em alerta</span>
        </div>
        <div style={s.resumoCard}>
          <span style={s.resumoNum}>{totalPend}</span>
          <span style={s.resumoLabel}>Total pendentes</span>
        </div>
      </div>

      {/* FILTROS */}
      <div style={s.filtrosBar}>
        <select style={s.filterSel} value={filtroObra} onChange={e => setFiltroObra(e.target.value)}>
          <option value="todas">Todas as obras</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.cliente} — {o.nome}</option>)}
        </select>

        {perfil?.role === 'socio' && (
          <select style={s.filterSel} value={filtroPM} onChange={e => setFiltroPM(e.target.value)}>
            <option value="todos">Todos os PMs</option>
            {pms.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        )}

        <select style={s.filterSel} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS).filter(([k]) => k !== 'CONCLUIDO').map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* CONTEÚDO */}
      {loading ? (
        <p style={{ padding: 24, color: '#6b7280' }}>Carregando...</p>
      ) : Object.keys(porObra).length === 0 ? (
        <div style={s.empty}>
          <i className="ti ti-circle-check" style={{ fontSize: 48, color: '#07D48A' }} />
          <p style={{ fontWeight: 700, fontSize: 16 }}>Tudo em dia!</p>
          <p style={{ color: '#6b7280' }}>Nenhuma pendência encontrada com os filtros atuais.</p>
        </div>
      ) : (
        <div style={s.obrasList}>
          {Object.entries(porObra).map(([obraId, obra]) => (
            <div key={obraId} style={s.obraCard}>
              <div style={s.obraHeader}>
                <div style={s.obraInfo}>
                  <span style={s.obraCliente}>{obra.cliente}</span>
                  <span style={s.obraNome}>{obra.nome}</span>
                  {perfil?.role === 'socio' && (
                    <span style={s.obraPM}><i className="ti ti-user" /> {obra.pm}</span>
                  )}
                </div>
                <div style={s.obraStats}>
                  {URGENCIA.slice(0, 2).map(st => {
                    const cnt = obra.itens.filter(i => i.status === st).length
                    if (!cnt) return null
                    return (
                      <span key={st} style={{ ...s.statPill, background: STATUS[st].color, color: STATUS[st].text }}>
                        {cnt} {STATUS[st].label}
                      </span>
                    )
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
                    <th style={{ ...s.th, width: 90 }}>Tipo ata</th>
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
                        <td style={{ ...s.td, textAlign: 'center' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: item.tipo_ata === 'interno' ? '#e0e7ff' : '#dcfce7', color: item.tipo_ata === 'interno' ? '#3730a3' : '#166534' }}>
                            {item.tipo_ata === 'interno' ? 'INT' : 'EXT'}
                          </span>
                        </td>
                        <td style={s.td}>{item.responsavel || '—'}</td>
                        <td style={{ ...s.td, color: vencido ? '#dc2626' : '#2e2e2e', fontWeight: vencido ? 700 : 400 }}>
                          {item.data_limite ? new Date(item.data_limite + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                          {vencido && ' ⚠'}
                        </td>
                        <td style={{ ...s.td, color: '#6b7280', fontSize: 12 }}>{ultimaObs || '—'}</td>
                        <td style={s.td}>
                          <span className={`badge badge-${item.status}`}>
                            {stCfg?.label || item.status}
                          </span>
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
  )
}

const s = {
  page:       { padding: 24, maxWidth: 1200, margin: '0 auto' },
  topBar:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  h1:         { fontSize: 22, fontWeight: 800, color: '#2e2e2e' },
  sub:        { fontSize: 13, color: '#6b7280', marginTop: 2 },
  btnRefresh: { background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  resumoRow:  { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  resumoCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px', minWidth: 120, display: 'flex', flexDirection: 'column', gap: 4 },
  resumoNum:  { fontSize: 28, fontWeight: 800, color: '#2e2e2e', lineHeight: 1 },
  resumoLabel:{ fontSize: 12, color: '#6b7280', fontWeight: 500 },
  filtrosBar: { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  filterSel:  { border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: '#fff', color: '#2e2e2e', outline: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  empty:      { textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  obrasList:  { display: 'flex', flexDirection: 'column', gap: 16 },
  obraCard:   { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' },
  obraHeader: { padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', background: '#fafafa' },
  obraInfo:   { display: 'flex', alignItems: 'center', gap: 10 },
  obraCliente:{ fontSize: 11, fontWeight: 700, color: '#07D48A', textTransform: 'uppercase', letterSpacing: '0.08em' },
  obraNome:   { fontSize: 15, fontWeight: 700, color: '#2e2e2e' },
  obraPM:     { fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 },
  obraStats:  { display: 'flex', alignItems: 'center', gap: 8 },
  statPill:   { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  btnIrAta:   { background: '#07D48A', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  table:      { width: '100%', borderCollapse: 'collapse' },
  th:         { background: '#f9fafb', padding: '7px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', textAlign: 'left', borderBottom: '1px solid #e5e7eb' },
  td:         { padding: '8px 12px', fontSize: 13, color: '#2e2e2e', verticalAlign: 'middle' },
}
