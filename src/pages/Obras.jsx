// ── Obras.jsx ──
// Adaptado para usar tabelas cp_* do Supabase central
// Layout e funcionalidades mantidos identicamente

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, TIPOS_ATA } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

export default function Obras() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const { showToast, ToastContainer } = useToast()

  const [obras, setObras]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false)
  const [form, setForm]             = useState({ nome: '', cliente: '', local: '', fase: '', parceiros: '' })
  const [saving, setSaving]         = useState(false)
  const [modalAta, setModalAta]     = useState(null)
  const [loadingAta, setLoadingAta] = useState(false)

  useEffect(() => { loadObras() }, [])

  async function loadObras() {
    setLoading(true)

    // Busca obras + metadados do check point + PM alocado
    const { data: obrasData } = await supabase
      .from('obras')
      .select('id, nome, created_at')
      .order('created_at', { ascending: false })

    if (!obrasData) { setLoading(false); return }

    // Busca metadados cp para cada obra
    const { data: metas } = await supabase
      .from('cp_obras_meta')
      .select('*')
      .in('obra_id', obrasData.map(o => o.id))
      .eq('ativa', true)

    // Busca PMs alocados
    const { data: alocacoes } = await supabase
      .from('alocacoes')
      .select('obra_id, user_id, perfis(nome, role)')
      .in('obra_id', obrasData.map(o => o.id))

    // Monta lista só de obras que têm metadados no check point
    const metaMap = {}
    ;(metas || []).forEach(m => { metaMap[m.obra_id] = m })

    const pmMap = {}
    ;(alocacoes || []).forEach(a => {
      if (a.perfis?.role === 'pmo' && !pmMap[a.obra_id]) {
        pmMap[a.obra_id] = a.perfis.nome
      }
    })

    const resultado = obrasData
      .filter(o => metaMap[o.id])
      .map(o => ({
        ...o,
        ...metaMap[o.id],
        pm_nome: pmMap[o.id] || null,
      }))

    setObras(resultado)
    setLoading(false)
  }

  async function criarObra(e) {
    e.preventDefault()
    setSaving(true)

    // 1. Cria na tabela obras central
    const { data: novaObra, error } = await supabase
      .from('obras')
      .insert({ nome: form.nome })
      .select()
      .single()

    if (error || !novaObra) {
      showToast('Erro ao criar obra')
      setSaving(false)
      return
    }

    // 2. Cria metadados cp
    await supabase.from('cp_obras_meta').insert({
      obra_id:   novaObra.id,
      cliente:   form.cliente,
      local:     form.local,
      fase:      form.fase,
      parceiros: form.parceiros,
      ativa:     true,
    })

    // 3. Aloca o PMO logado
    await supabase.from('alocacoes').insert({
      obra_id: novaObra.id,
      user_id: perfil.id,
    })

    showToast('Obra criada!')
    setModal(false)
    setForm({ nome: '', cliente: '', local: '', fase: '', parceiros: '' })
    loadObras()
    setSaving(false)
  }

  async function abrirAta(obraId, tipo) {
    if (tipo === 'kickoff') {
      navigate('/ata/' + obraId + '/' + tipo)
      return
    }

    setLoadingAta(true)
    const { data: atas } = await supabase
      .from('cp_atas')                          // ← tabela migrada
      .select('id, data_reuniao, numero_reuniao, tipo')
      .eq('obra_id', obraId)
      .eq('tipo', tipo)
      .order('numero_reuniao', { ascending: false })
      .limit(1)
    setLoadingAta(false)

    const ultimaAta = atas?.[0] || null

    if (!ultimaAta) {
      navigate('/ata/' + obraId + '/' + tipo)
      return
    }

    setModalAta({ obraId, tipo, ultimaAta })
  }

  return (
    <div style={s.page}>
      <ToastContainer />

      <div style={s.topBar}>
        <div>
          <h1 style={s.h1}>Obras</h1>
          <p style={s.sub}>
            {perfil?.role === 'pmo' ? 'Todas as obras ativas' : 'Suas obras ativas'}
          </p>
        </div>
        {perfil?.is_admin && (
          <button style={s.btnNova} onClick={() => setModal(true)}>
            <i className="ti ti-plus" /> Nova obra
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: '#6b7280', padding: 20 }}>Carregando...</p>
      ) : obras.length === 0 ? (
        <div style={s.empty}>
          <i className="ti ti-building-off" style={{ fontSize: 40, color: '#d1d5db' }} />
          <p>Nenhuma obra com Check Point cadastrada ainda.</p>
          {perfil?.is_admin && (
            <button style={s.btnNova} onClick={() => setModal(true)}>Criar primeira obra</button>
          )}
        </div>
      ) : (
        <div style={s.grid}>
          {obras.map(obra => (
            <div key={obra.id} style={s.card}>
              <div style={s.cardTop}>
                <div style={s.greenDot} />
                <div style={s.cardInfo}>
                  <div style={s.cardCliente}>{obra.cliente}</div>
                  <div style={s.cardNome}>{obra.nome}</div>
                  <div style={s.cardMeta}>
                    {obra.local    && <span><i className="ti ti-map-pin" /> {obra.local}</span>}
                    {obra.fase     && <span><i className="ti ti-flag" /> {obra.fase}</span>}
                    {obra.pm_nome  && <span><i className="ti ti-user" /> {obra.pm_nome}</span>}
                  </div>
                </div>
              </div>
              <div style={s.cardActions}>
                <button style={s.btnHist} onClick={() => navigate('/historico/' + obra.id)}>
                  <i className="ti ti-history" /> Histórico
                </button>
                <button style={s.btnKick} onClick={() => abrirAta(obra.id, 'kickoff')} disabled={loadingAta}>
                  <i className="ti ti-rocket" /> Kickoff
                </button>
                <button style={s.btnInt} onClick={() => abrirAta(obra.id, 'interno')} disabled={loadingAta}>
                  <i className="ti ti-lock" /> CP Interno
                </button>
                <button style={s.btnExt} onClick={() => abrirAta(obra.id, 'externo')} disabled={loadingAta}>
                  <i className="ti ti-users" /> CP Externo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ MODAL: NOVA OBRA ══ */}
      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>Nova obra</span>
              <button style={s.btnClose} onClick={() => setModal(false)}>
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={criarObra} style={s.form}>
              {[
                { key: 'cliente',   label: 'Cliente *',      placeholder: 'ex: DIGIO' },
                { key: 'nome',      label: 'Nome da obra *', placeholder: 'ex: Implantação Sede' },
                { key: 'local',     label: 'Local',          placeholder: 'ex: Bradesco Alpha' },
                { key: 'fase',      label: 'Fase',           placeholder: 'ex: Implantação' },
                { key: 'parceiros', label: 'Parceiros',      placeholder: 'ex: VOAZ + PROH' },
              ].map(f => (
                <div key={f.key}>
                  <label style={s.label}>{f.label}</label>
                  <input
                    style={s.input}
                    value={form[f.key]}
                    onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    required={f.label.includes('*')}
                  />
                </div>
              ))}
              <button style={s.btnSave} type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Criar obra'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL: ESCOLHA DE ATA ══ */}
      {modalAta && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: 420 }}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>
                {modalAta.tipo === 'interno' ? 'Checkpoint Interno' : 'Checkpoint Externo'}
              </span>
              <button style={s.btnClose} onClick={() => setModalAta(null)}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div style={s.infoBox}>
              Existe a ata{' '}
              <strong>#{String(modalAta.ultimaAta.numero_reuniao || 1).padStart(2, '0')}</strong>{' '}
              de{' '}
              <strong>
                {new Date(modalAta.ultimaAta.data_reuniao + 'T12:00:00').toLocaleDateString('pt-BR')}
              </strong>
              . O que deseja fazer?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button style={s.btnOpcao} onClick={() => {
                setModalAta(null)
                navigate('/ata/' + modalAta.obraId + '/' + modalAta.tipo + '?ata=' + modalAta.ultimaAta.id)
              }}>
                <div style={s.btnOpcaoIcon}><i className="ti ti-pencil" /></div>
                <div>
                  <div style={s.btnOpcaoTitle}>Editar ata atual</div>
                  <div style={s.btnOpcaoSub}>
                    Abrir e editar a ata #{String(modalAta.ultimaAta.numero_reuniao || 1).padStart(2, '0')} existente
                  </div>
                </div>
              </button>
              <button style={{ ...s.btnOpcao, borderColor: '#07D48A' }} onClick={() => {
                setModalAta(null)
                navigate('/ata/' + modalAta.obraId + '/' + modalAta.tipo)
              }}>
                <div style={{ ...s.btnOpcaoIcon, background: '#e8faf4', color: '#07D48A' }}>
                  <i className="ti ti-plus" />
                </div>
                <div>
                  <div style={s.btnOpcaoTitle}>Nova reunião</div>
                  <div style={s.btnOpcaoSub}>
                    Criar ata #{String((modalAta.ultimaAta.numero_reuniao || 1) + 1).padStart(2, '0')} copiando os itens da anterior
                  </div>
                </div>
              </button>
            </div>
            <button style={s.btnCancel} onClick={() => setModalAta(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page:     { padding: 24, maxWidth: 1100, margin: '0 auto' },
  topBar:   { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  h1:       { fontSize: 22, fontWeight: 800, color: '#2e2e2e' },
  sub:      { fontSize: 13, color: '#6b7280', marginTop: 2 },
  btnNova:  { background: '#07D48A', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  empty:    { textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, color: '#6b7280' },
  grid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  card:     { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' },
  cardTop:  { padding: '20px 20px 16px', display: 'flex', gap: 14 },
  greenDot: { width: 4, borderRadius: 2, background: '#07D48A', flexShrink: 0, alignSelf: 'stretch' },
  cardInfo: { flex: 1 },
  cardCliente: { fontSize: 11, fontWeight: 700, color: '#07D48A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 },
  cardNome: { fontSize: 16, fontWeight: 700, color: '#2e2e2e', marginBottom: 8 },
  cardMeta: { display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12, color: '#6b7280' },
  cardActions: { borderTop: '1px solid #f3f4f6', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr' },
  btnHist:  { padding: '12px 6px', background: 'none', border: 'none', fontSize: 11, fontWeight: 600, color: '#6b7280', borderRight: '1px solid #f3f4f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 },
  btnKick:  { padding: '12px 6px', background: 'none', border: 'none', fontSize: 11, fontWeight: 600, color: '#92400e', borderRight: '1px solid #f3f4f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 },
  btnInt:   { padding: '12px 6px', background: 'none', border: 'none', fontSize: 11, fontWeight: 600, color: '#2e2e2e', borderRight: '1px solid #f3f4f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 },
  btnExt:   { padding: '12px 6px', background: 'none', border: 'none', fontSize: 11, fontWeight: 600, color: '#2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 },
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal:    { background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 440 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:  { fontSize: 16, fontWeight: 700 },
  btnClose: { background: 'none', border: 'none', fontSize: 20, color: '#6b7280', cursor: 'pointer' },
  form:     { display: 'flex', flexDirection: 'column', gap: 12 },
  label:    { display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 },
  input:    { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', color: '#2e2e2e', fontFamily: 'Inter, sans-serif' },
  btnSave:  { background: '#07D48A', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4, fontFamily: 'Inter, sans-serif' },
  btnCancel:{ width: '100%', marginTop: 12, background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px', fontSize: 13, cursor: 'pointer', color: '#6b7280', fontFamily: 'Inter, sans-serif' },
  infoBox:  { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.5 },
  btnOpcao: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 16px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif' },
  btnOpcaoIcon: { width: 38, height: 38, borderRadius: 8, background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 },
  btnOpcaoTitle: { fontSize: 14, fontWeight: 700, color: '#2e2e2e', marginBottom: 2 },
  btnOpcaoSub:   { fontSize: 12, color: '#6b7280' },
}
