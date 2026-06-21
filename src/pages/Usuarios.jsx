import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

const ROLES = {
  pm:    { label: 'PM',    color: '#dbeafe', text: '#1e40af' },
  socio: { label: 'Sócio', color: '#d1fae5', text: '#065f46' },
}

export default function Usuarios() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const { showToast, ToastContainer } = useToast()

  const [usuarios, setUsuarios]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState({ nome: '', email: '', role: 'pm' })
  const [editModal, setEditModal] = useState(null)

  // Redireciona se não for admin
  useEffect(() => {
    if (perfil && !perfil.is_admin) navigate('/obras')
  }, [perfil])

  useEffect(() => { loadUsuarios() }, [])

  async function loadUsuarios() {
    setLoading(true)
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .order('nome')
    setUsuarios(data || [])
    setLoading(false)
  }

  async function convidar(e) {
    e.preventDefault()
    setSaving(true)

    // 1. Dispara o invite pelo Supabase Admin API via Edge Function
    // Como não temos Edge Function, usamos a API de admin via service role
    // O convite cria o usuário no Auth e manda o email automaticamente
    const { data: authData, error: authError } = await supabase.auth.admin
      ? supabase.auth.admin.inviteUserByEmail(form.email)
      : { data: null, error: { message: 'Admin API não disponível no client' } }

    // Fallback: usar a API de invite disponível no supabase-js client
    // Na verdade o supabase-js v2 não expõe admin.inviteUserByEmail no client
    // Então vamos criar via signUp com senha temporária e forçar reset
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: tempPassword,
      options: {
        data: { nome: form.nome },
        emailRedirectTo: window.location.origin + '/login',
      }
    })

    if (signUpError) {
      showToast('Erro: ' + signUpError.message)
      setSaving(false)
      return
    }

    const authId = signUpData?.user?.id
    if (!authId) {
      showToast('Erro ao criar usuário no Auth')
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
      showToast('Usuário criado no Auth mas erro no banco: ' + dbError.message)
      setSaving(false)
      return
    }

    // 3. Disparar email de reset de senha (assim o usuário define a própria senha)
    await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: window.location.origin + '/login',
    })

    showToast(`✓ Convite enviado para ${form.email}! Ele receberá um email para definir a senha.`)
    setModal(false)
    setForm({ nome: '', email: '', role: 'pm' })
    loadUsuarios()
    setSaving(false)
  }

  async function reenviarConvite(email) {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login',
    })
    showToast(`Email de acesso reenviado para ${email}`)
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
          <i className="ti ti-user-plus" /> Convidar usuário
        </button>
      </div>

      {/* INFO BOX */}
      <div style={s.infoBox}>
        <i className="ti ti-info-circle" style={{ color: '#3730a3', fontSize: 16, flexShrink: 0 }} />
        <div>
          <strong>Como funciona o convite:</strong> ao cadastrar um usuário, o sistema envia automaticamente
          um email com um link para ele definir a própria senha. Você pode reenviar o email a qualquer momento
          clicando em "Reenviar acesso".
        </div>
      </div>

      {/* TABELA */}
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
                      <div style={s.avatar}>
                        {u.nome?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.nome}</div>
                        {u.is_admin && (
                          <span style={s.adminBadge}>Admin</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={s.td}>{u.email}</td>
                  <td style={s.td}>
                    <span style={{
                      ...s.roleBadge,
                      background: ROLES[u.role]?.color,
                      color: ROLES[u.role]?.text,
                    }}>
                      {ROLES[u.role]?.label || u.role}
                    </span>
                  </td>
                  <td style={{ ...s.td, color: '#6b7280', fontSize: 12 }}>
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        style={s.btnAcao}
                        onClick={() => reenviarConvite(u.email)}
                        title="Reenviar email de acesso"
                      >
                        <i className="ti ti-mail" /> Reenviar acesso
                      </button>
                      <button
                        style={{ ...s.btnAcao, background: '#f9fafb' }}
                        onClick={() => setEditModal({ ...u })}
                        title="Editar"
                      >
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

      {/* MODAL: CONVIDAR */}
      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>Convidar novo usuário</span>
              <button style={s.btnClose} onClick={() => setModal(false)}>
                <i className="ti ti-x" />
              </button>
            </div>

            <form onSubmit={convidar} style={s.form}>
              <div>
                <label style={s.label}>Nome completo</label>
                <input
                  style={s.input}
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="ex: Thais Oliveira"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label style={s.label}>Email corporativo</label>
                <input
                  style={s.input}
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="ex: thais@voaz.com.br"
                  required
                />
              </div>
              <div>
                <label style={s.label}>Perfil de acesso</label>
                <div style={s.roleGrid}>
                  {Object.entries(ROLES).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      style={{
                        ...s.roleBtn,
                        ...(form.role === key ? {
                          background: val.color,
                          color: val.text,
                          borderColor: val.text,
                        } : {})
                      }}
                      onClick={() => setForm(f => ({ ...f, role: key }))}
                    >
                      <strong>{val.label}</strong>
                      <span style={{ fontSize: 11, display: 'block', marginTop: 2, opacity: 0.8 }}>
                        {key === 'pm' ? 'Vê suas obras' : 'Vê todas as obras'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={s.emailPreview}>
                <i className="ti ti-mail" style={{ color: '#07D48A' }} />
                <span>Um email será enviado para <strong>{form.email || 'o usuário'}</strong> com um link para definir a senha.</span>
              </div>

              <button style={s.btnSave} type="submit" disabled={saving}>
                {saving ? 'Enviando convite...' : 'Enviar convite'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR */}
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
                <input
                  style={s.input}
                  value={editModal.nome}
                  onChange={e => setEditModal(m => ({ ...m, nome: e.target.value }))}
                />
              </div>
              <div>
                <label style={s.label}>Perfil</label>
                <div style={s.roleGrid}>
                  {Object.entries(ROLES).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      style={{
                        ...s.roleBtn,
                        ...(editModal.role === key ? {
                          background: val.color,
                          color: val.text,
                          borderColor: val.text,
                        } : {})
                      }}
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
  btnNovo:     { background: '#07D48A', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  infoBox:     { display: 'flex', gap: 12, background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#3730a3', alignItems: 'flex-start', lineHeight: 1.5 },
  card:        { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' },
  table:       { width: '100%', borderCollapse: 'collapse' },
  th:          { background: '#f9fafb', padding: '10px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', textAlign: 'left', borderBottom: '1px solid #e5e7eb' },
  tr:          { borderBottom: '1px solid #f3f4f6' },
  td:          { padding: '14px 16px', fontSize: 13, color: '#2e2e2e', verticalAlign: 'middle' },
  avatar:      { width: 34, height: 34, borderRadius: '50%', background: '#2e2e2e', color: '#07D48A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 },
  adminBadge:  { fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '1px 6px' },
  roleBadge:   { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 },
  btnAcao:     { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal:       { background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 460 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:  { fontSize: 16, fontWeight: 700 },
  btnClose:    { background: 'none', border: 'none', fontSize: 20, color: '#6b7280', cursor: 'pointer' },
  form:        { display: 'flex', flexDirection: 'column', gap: 16 },
  label:       { display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 },
  input:       { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', color: '#2e2e2e', fontFamily: 'Inter, sans-serif' },
  roleGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  roleBtn:     { padding: '12px', border: '1.5px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#2e2e2e', transition: 'all .15s' },
  emailPreview:{ display: 'flex', gap: 10, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534', alignItems: 'center' },
  btnSave:     { flex: 1, background: '#07D48A', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  btnCancel:   { background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', fontSize: 13, cursor: 'pointer', color: '#6b7280', fontFamily: 'Inter, sans-serif' },
}
