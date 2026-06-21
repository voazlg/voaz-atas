import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, TIPOS_ATA } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

export default function Obras() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const { showToast, ToastContainer } = useToast()

  const [obras, setObras]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState({ nome: '', cliente: '', local: '', fase: '', parceiros: '' })
  const [saving, setSaving]     = useState(false)

  useEffect(() => { loadObras() }, [])

  async function loadObras() {
    setLoading(true)
    const { data } = await supabase
      .from('obras')
      .select('*, usuarios(nome)')
      .eq('ativa', true)
      .order('created_at', { ascending: false })
    setObras(data || [])
    setLoading(false)
  }

  async function criarObra(e) {
    e.preventDefault()
    setSaving(true)
    const { data: pm } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_id', (await supabase.auth.getUser()).data.user.id)
      .single()

    const { error } = await supabase.from('obras').insert({
      ...form,
      pm_id: pm.id,
    })

    if (error) showToast('Erro ao criar obra')
    else { showToast('Obra criada!'); setModal(false); setForm({ nome: '', cliente: '', local: '', fase: '', parceiros: '' }); loadObras() }
    setSaving(false)
  }

  function abrirAta(obraId, tipo) {
    navigate(`/ata/${obraId}/${tipo}`)
  }

  const statusColors = {
    ativa: { bg: '#d1fae5', text: '#065f46' },
  }

  return (
    <div style={s.page}>
      <ToastContainer />

      <div style={s.topBar}>
        <div>
          <h1 style={s.h1}>Obras</h1>
          <p style={s.sub}>
            {perfil?.role === 'socio' ? 'Todas as obras ativas' : 'Suas obras ativas'}
          </p>
        </div>
        <button style={s.btnNova} onClick={() => setModal(true)}>
          <i className="ti ti-plus" /> Nova obra
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#6b7280', padding: 20 }}>Carregando...</p>
      ) : obras.length === 0 ? (
        <div style={s.empty}>
          <i className="ti ti-building-off" style={{ fontSize: 40, color: '#d1d5db' }} />
          <p>Nenhuma obra cadastrada ainda.</p>
          <button style={s.btnNova} onClick={() => setModal(true)}>Criar primeira obra</button>
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
                    {obra.local && <span><i className="ti ti-map-pin" /> {obra.local}</span>}
                    {obra.fase && <span><i className="ti ti-flag" /> {obra.fase}</span>}
                    {obra.usuarios?.nome && <span><i className="ti ti-user" /> {obra.usuarios.nome}</span>}
                  </div>
                </div>
              </div>
              <div style={s.cardActions}>
                <button style={s.btnHist} onClick={() => navigate(\`/historico/\${obra.id}\`)}>
                  <i className="ti ti-history" /> Histórico
                </button>
                <button style={s.btnKick} onClick={() => abrirAta(obra.id, 'kickoff')}>
                  <i className="ti ti-rocket" /> Kickoff
                </button>
                <button style={s.btnInt} onClick={() => abrirAta(obra.id, 'interno')}>
                  <i className="ti ti-lock" /> CP Interno
                </button>
                <button style={s.btnExt} onClick={() => abrirAta(obra.id, 'externo')}>
                  <i className="ti ti-users" /> CP Externo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
                { key: 'cliente',    label: 'Cliente *',   placeholder: 'ex: DIGIO' },
                { key: 'nome',       label: 'Nome da obra *', placeholder: 'ex: Implantação Sede' },
                { key: 'local',      label: 'Local',       placeholder: 'ex: Bradesco Alpha' },
                { key: 'fase',       label: 'Fase',        placeholder: 'ex: Implantação' },
                { key: 'parceiros',  label: 'Parceiros',   placeholder: 'ex: VOAZ + PROH' },
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
  btnHist:  { padding: '12px', background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: '#6b7280', borderRight: '1px solid #f3f4f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnKick:  { padding: '12px', background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: '#92400e', borderRight: '1px solid #f3f4f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnInt:   { padding: '12px', background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: '#2e2e2e', borderRight: '1px solid #f3f4f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnExt:   { padding: '12px', background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: '#2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal:    { background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 440 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:  { fontSize: 16, fontWeight: 700 },
  btnClose: { background: 'none', border: 'none', fontSize: 20, color: '#6b7280', cursor: 'pointer' },
  form:     { display: 'flex', flexDirection: 'column', gap: 12 },
  label:    { display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 },
  input:    { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', color: '#2e2e2e' },
  btnSave:  { background: '#07D48A', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
}
