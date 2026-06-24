import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { LogoVOAZ } from '../components/LogoVOAZ'

export default function Perfil() {
  const { perfil, signOut } = useAuth()
  const navigate = useNavigate()
  const { showToast, ToastContainer } = useToast()

  const [novaSenha, setNovaSenha]         = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [salvando, setSalvando]           = useState(false)
  const [mostrarSenha, setMostrarSenha]   = useState(false)

  // Detecta se veio de um link de reset (token na URL)
  const [veioDeLinkReset, setVeioDeLinkReset] = useState(false)
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      setVeioDeLinkReset(true)
    }
  }, [])

  async function trocarSenha(e) {
    e.preventDefault()
    if (novaSenha.length < 6) {
      showToast('A senha deve ter pelo menos 6 caracteres')
      return
    }
    if (novaSenha !== confirmaSenha) {
      showToast('As senhas não coincidem')
      return
    }
    setSalvando(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    if (error) {
      showToast('Erro ao trocar senha: ' + error.message)
    } else {
      showToast('Senha alterada com sucesso! ✓')
      setNovaSenha('')
      setConfirmaSenha('')
      // Se veio de link de reset, redireciona para obras após salvar
      if (veioDeLinkReset) {
        setTimeout(() => navigate('/obras'), 1500)
      }
    }
    setSalvando(false)
  }

  return (
    <div style={s.page}>
      <ToastContainer />

      {/* Header simples para quem veio pelo link de reset */}
      {veioDeLinkReset && (
        <div style={s.resetHeader}>
          <div style={s.logoRow}>
            <LogoVOAZ size={36} />
            <div>
              <div style={s.brand}>VOAZ</div>
              <div style={s.brandSub}>Checkpoint Semanal</div>
            </div>
          </div>
          <div style={s.greenBar} />
        </div>
      )}

      <div style={s.container}>

        {/* Card de perfil */}
        {perfil && (
          <div style={s.card}>
            <div style={s.avatarRow}>
              <div style={s.avatar}>{perfil.nome?.charAt(0).toUpperCase()}</div>
              <div>
                <div style={s.nomeUsuario}>{perfil.nome}</div>
                <div style={s.emailUsuario}>{perfil.email}</div>
                <span style={{
                  ...s.roleBadge,
                  background: perfil.role === 'socio' ? '#d1fae5' : '#dbeafe',
                  color: perfil.role === 'socio' ? '#065f46' : '#1e40af',
                }}>
                  {perfil.role === 'socio' ? 'Sócio' : 'PM'}
                  {perfil.is_admin && ' · Admin'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Card de troca de senha */}
        <div style={s.card}>
          <div style={s.cardTitle}>
            <i className="ti ti-lock" style={{ color: '#07D48A' }} />
            {veioDeLinkReset ? 'Defina sua senha de acesso' : 'Alterar senha'}
          </div>

          {veioDeLinkReset && (
            <p style={s.resetInfo}>
              Você está acessando pelo link de convite. Defina sua senha para acessar o sistema.
            </p>
          )}

          <form onSubmit={trocarSenha} style={s.form}>
            <div>
              <label style={s.label}>Nova senha</label>
              <div style={s.inputWrap}>
                <input
                  style={s.input}
                  type={mostrarSenha ? 'text' : 'password'}
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  style={s.eyeBtn}
                  onClick={() => setMostrarSenha(v => !v)}
                >
                  <i className={`ti ti-eye${mostrarSenha ? '-off' : ''}`} />
                </button>
              </div>
            </div>

            <div>
              <label style={s.label}>Confirmar nova senha</label>
              <div style={s.inputWrap}>
                <input
                  style={s.input}
                  type={mostrarSenha ? 'text' : 'password'}
                  value={confirmaSenha}
                  onChange={e => setConfirmaSenha(e.target.value)}
                  placeholder="Repita a senha"
                  required
                />
              </div>
              {confirmaSenha && novaSenha !== confirmaSenha && (
                <p style={s.erroSenha}>As senhas não coincidem</p>
              )}
              {confirmaSenha && novaSenha === confirmaSenha && confirmaSenha.length >= 6 && (
                <p style={s.okSenha}>✓ Senhas coincidem</p>
              )}
            </div>

            <button
              style={{
                ...s.btnSalvar,
                opacity: salvando ? 0.7 : 1,
              }}
              type="submit"
              disabled={salvando}
            >
              {salvando ? 'Salvando...' : veioDeLinkReset ? 'Definir senha e entrar' : 'Salvar nova senha'}
            </button>
          </form>
        </div>

        {/* Botão voltar — só mostra se não veio de link de reset */}
        {!veioDeLinkReset && (
          <button style={s.btnVoltar} onClick={() => navigate('/obras')}>
            <i className="ti ti-arrow-left" /> Voltar para obras
          </button>
        )}

      </div>
    </div>
  )
}

const s = {
  page:       { minHeight: '100vh', background: '#f3f4f6' },
  resetHeader:{ background: '#2e2e2e', padding: '0 24px' },
  logoRow:    { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 14px' },
  brand:      { fontSize: 14, fontWeight: 800, letterSpacing: '0.08em', color: '#07D48A', lineHeight: 1 },
  brandSub:   { fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', textTransform: 'uppercase' },
  greenBar:   { height: 3, background: '#07D48A', margin: '0 -24px' },
  container:  { maxWidth: 480, margin: '0 auto', padding: '32px 20px' },
  card:       { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 16 },
  avatarRow:  { display: 'flex', alignItems: 'center', gap: 16 },
  avatar:     { width: 52, height: 52, borderRadius: '50%', background: '#2e2e2e', color: '#07D48A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, flexShrink: 0 },
  nomeUsuario:{ fontSize: 17, fontWeight: 700, color: '#2e2e2e', marginBottom: 2 },
  emailUsuario:{ fontSize: 13, color: '#6b7280', marginBottom: 6 },
  roleBadge:  { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 },
  cardTitle:  { fontSize: 15, fontWeight: 700, color: '#2e2e2e', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 },
  resetInfo:  { fontSize: 13, color: '#6b7280', background: '#f9fafb', borderRadius: 8, padding: '10px 14px', marginBottom: 20, lineHeight: 1.5 },
  form:       { display: 'flex', flexDirection: 'column', gap: 16 },
  label:      { display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 },
  inputWrap:  { position: 'relative' },
  input:      { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 40px 10px 12px', fontSize: 14, outline: 'none', color: '#2e2e2e', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' },
  eyeBtn:     { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18, display: 'flex', padding: 4 },
  erroSenha:  { fontSize: 12, color: '#dc2626', marginTop: 4 },
  okSenha:    { fontSize: 12, color: '#07D48A', marginTop: 4 },
  btnSalvar:  { background: '#07D48A', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  btnVoltar:  { background: 'none', border: 'none', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Inter, sans-serif', padding: 0 },
}
