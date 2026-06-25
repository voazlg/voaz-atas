import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

const ROLES = {
  pm:    { label: 'PM',    color: '#dbeafe', text: '#1e40af', desc: 'Vê suas obras' },
  socio: { label: 'Sócio', color: '#d1fae5', text: '#065f46', desc: 'Vê todas as obras' },
}

export default function Usuarios() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const { showToast, ToastContainer } = useToast()

  const [usuarios, setUsuarios]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false)
  const [editModal, setEditModal]   = useState(null)
  const [saving, setSaving]         = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [form, setForm]             = useState({ nome: '', email: '', role: 'pm', senha: '' })

  useEffect(() => {
    if (perfil && !perfil.is_admin) navigate('/obras')
  }, [perfil])

  useEffect(() => { loadUsuarios() }, [])

  async function loadUsuarios() {
    setLoading(true)
    const { data } = await supabase.from('usuarios').select('*').order('nome')
    setUsuarios(data || [])
    setLoading(false)
  }

  async function cadastrar(e) {
    e.preventDefault()
    if (form.senha.length < 6) {
      showToast('A senha deve ter pelo menos 6 caracteres')
      return
    }
    setSaving(true)

    // 1. Criar usuário no Auth com email + senha definida por você
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
      options: {
        data: { nome: form.nome },
        // Não manda email de confirmação
        emailRedirectTo: undefined,
      }
    })

    if (signUpError) {
      showToast('Erro: ' + signUpError.message)
      setSaving(false)
      return
    }

    const authId = signUpData?.user?.id
    if (!authId) {
      showToast('Erro ao criar usuário')
      setSaving(false)
      return
    }

    // 2. Inserir na tabela usuarios
    const { error: dbError } = await supabase.from('usuarios').insert({
      auth_id: authId,
      nome: form.nome,
      email: form.email,
      role: form.role,
      is_admin: false,
    })

    if (dbError) {
      showToast('Erro no banco: ' + dbError.message)
      setSaving(false)
      return
    }

    showToast(`✓ ${form.nome} cadastrado! Passe a senha por WhatsApp.`)
    setModal(false)
    setForm({ nome: '', email: '', role: 'pm', senha: '' })
    loadUsuarios()
    setSaving(false)
  }

  async function enviarResetSenha(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/perfil',
    })
    if (error) showToast('Erro: ' + error.message)
    else showToast(`Email de redefinição enviado para ${email}`)
  }

  async function salvarEdicao() {
    if (!editModal) return
    await supabase.from('usuarios').update({
      nome: editModal.nome,
      role: editModal.role,
    }).eq('id', editModal.id)
    showToast('Usuário atualizado')
    setEditModal(null)
    loadUsuarios()
  }

  if (!perfil?.is_admin) return null

  return (
    <div style={s.page}>
      <ToastContainer />

      <div style={s.topBar}>
        <div>
          <h1 style={s.h1}>Gestão de Usuários</h1>
          <p style={s.sub}>Cadastre e gerencie o acesso do time ao sistema</p>
        </div>
        <button style={s.btnNovo} onClick={() => setModal(true)}>
          <i className="ti ti-user-plus" /> Cadastrar usuário
        </button>
      </div>

      {/* Info box */}
      <div style={s.infoBox}>
        <i className="ti ti-info-circle" style={{ color: '#3730a3', fontSize: 16, flexShrink: 0 }} />
        <div>
          <strong>Fluxo de cadastro:</strong> você define uma senha temporária e passa por WhatsApp.
          O usuário entra no app e troca a senha em <strong>Minha conta</strong> (ícone de pessoa no header).
          O email só é usado se o usuário esquecer a senha.
        </div>
      </div>

      {/* Tabela */}
      <div style={s.card}>
        {loading ? (
          <p style={{ padding: 24, color: '#6b7280' }}>Carregando...</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Nome</th>
                <th style={s.th}>Email</th>
                <th style={s.th}>Perfil</th>
                <th style={s.th}>Cadastrado em</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} style={s.tr}>
                  <td style={s.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={s.avatar}>{u.nome?.charAt(0).toUpperCase()}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.nome}</div>
                        {u.is_admin && <span style={s.adminBadge}>Admin</span>}
                      </div>
                    </div>
                  </td>
                  <td style={s.td}>{u.email}</td>
                  <td style={s.td}>
                    <span style={{ ...s.roleBadge, background: ROLES[u.role]?.color, color: ROLES[u.role]?.text }}>
                      {ROLES[u.role]?.label || u.role}
                    </span>
                  </td>
                  <td style={{ ...s.td, color: '#6b7280', fontSize: 12 }}>
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button style={s.btnAcao} onClick={() => enviarResetSenha(u.email)} title="Enviar email de redefinição de senha">
                        <i className="ti ti-mail" /> Resetar senha
                      </button>
                      <button style={s.btnAcao} onClick={() => setEditModal({ ...u })} title="Editar">
                        <i className="ti ti-pencil" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ══ MODAL: CADASTRAR ══ */}
      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>Cadastrar novo usuário</span>
              <button style={s.btnClose} onClick={() => setModal(false)}>
                <i className="ti ti-x" />
              </button>
            </div>

            <form onSubmit={cadastrar} style={s.form}>
              <div>
                <label style={s.label}>Nome completo</label>
                <input style={s.input} value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="ex: Thais Oliveira" required autoFocus />
              </div>

              <div>
                <label style={s.label}>Email corporativo</label>
                <input style={s.input} type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="ex: thais@voaz.com.br" required />
              </div>

              <div>
                <label style={s.label}>Senha temporária</label>
                <div style={s.inputWrap}>
                  <input
                    style={s.input}
                    type={mostrarSenha ? 'text' : 'password'}
                    value={form.senha}
                    onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <button type="button" style={s.eyeBtn} onClick={() => setMostrarSenha(v => !v)}>
                    <i className={`ti ti-eye${mostrarSenha ? '-off' : ''}`} />
                  </button>
                </div>
                <p style={s.senhaHint}>
                  <i className="ti ti-info-circle" /> Passe esta senha para o usuário por WhatsApp. Ele trocará pelo app.
                </p>
              </div>

              <div>
                <label style={s.label}>Perfil de acesso</label>
                <div style={s.roleGrid}>
                  {Object.entries(ROLES).map(([key, val]) => (
                    <button key={key} type="button"
                      style={{ ...s.roleBtn, ...(form.role === key ? { background: val.color, color: val.text, borderColor: val.text } : {}) }}
                      onClick={() => setForm(f => ({ ...f, role: key }))}
                    >
                      <strong>{val.label}</strong>
                      <span style={{ fontSize: 11, display: 'block', marginTop: 2, opacity: 0.8 }}>{val.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button style={s.btnSave} type="submit" disabled={saving}>
                {saving ? 'Cadastrando...' : 'Cadastrar usuário'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL: EDITAR ══ */}
      {editModal && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: 380 }}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>Editar usuário</span>
              <button style={s.btnClose} onClick={() => setEditModal(null)}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div style={s.form}>
              <div>
                <label style={s.label}>Nome</label>
                <input style={s.input} value={editModal.nome}
                  onChange={e => setEditModal(m => ({ ...m, nome: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Perfil</label>
                <div style={s.roleGrid}>
                  {Object.entries(ROLES).map(([key, val]) => (
                    <button key={key} type="button"
                      style={{ ...s.roleBtn, ...(editModal.role === key ? { background: val.color, color: val.text, borderColor: val.text } : {}) }}
                      onClick={() => setEditModal(m => ({ ...m, role: key }))}
                    >
                      <strong>{val.label}</strong>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.btnSave} onClick={salvarEdicao}>Salvar</button>
                <button style={s.btnCancel} onClick={() => setEditModal(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page:        { padding: 24, maxWidth: 900, margin: '0 auto' },
  topBar:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  h1:          { fontSize: 22, fontWeight: 800, color: '#2e2e2e' },
  sub:         { fontSize: 13, color: '#6b7280', marginTop: 2 },
  btnNovo:     { background: '#07D48A', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  infoBox:     { display: 'flex', gap: 12, background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#3730a3', alignItems: 'flex-start', lineHeight: 1.5 },
  card:        { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' },
  table:       { width: '100%', borderCollapse: 'collapse' },
  th:          { background: '#f9fafb', padding: '10px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', textAlign: 'left', borderBottom: '1px solid #e5e7eb' },
  tr:          { borderBottom: '1px solid #f3f4f6' },
  td:          { padding: '14px 16px', fontSize: 13, color: '#2e2e2e', verticalAlign: 'middle' },
  avatar:      { width: 34, height: 34, borderRadius: '50%', background: '#2e2e2e', color: '#07D48A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 },
  adminBadge:  { fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '1px 6px' },
  roleBadge:   { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 },
  btnAcao:     { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Inter, sans-serif' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal:       { background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 460 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:  { fontSize: 16, fontWeight: 700 },
  btnClose:    { background: 'none', border: 'none', fontSize: 20, color: '#6b7280', cursor: 'pointer' },
  form:        { display: 'flex', flexDirection: 'column', gap: 16 },
  label:       { display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 },
  inputWrap:   { position: 'relative' },
  input:       { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', color: '#2e2e2e', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' },
  eyeBtn:      { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18, display: 'flex', padding: 4 },
  senhaHint:   { fontSize: 12, color: '#6b7280', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 },
  roleGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  roleBtn:     { padding: '12px', border: '1.5px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#2e2e2e' },
  btnSave:     { flex: 1, background: '#07D48A', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  btnCancel:   { background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', fontSize: 13, cursor: 'pointer', color: '#6b7280', fontFamily: 'Inter, sans-serif' },
}
