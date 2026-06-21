import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { LogoVOAZ } from '../components/LogoVOAZ'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail]       = useState('')
  const [senha, setSenha]       = useState('')
  const [erro, setErro]         = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const { error } = await signIn(email, senha)
    if (error) setErro('E-mail ou senha incorretos.')
    setLoading(false)
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoArea}>
          <LogoVOAZ size={56} />
          <div style={styles.logoText}>
            <span style={styles.brand}>VOAZ</span>
            <span style={styles.sub}>Checkpoint Semanal</span>
          </div>
        </div>

        <div style={styles.greenBar} />

        <form onSubmit={handleLogin} style={styles.form}>
          <label style={styles.label}>E-mail</label>
          <input
            style={styles.input}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="seuemail@voaz.com.br"
            required
            autoFocus
          />

          <label style={styles.label}>Senha</label>
          <input
            style={styles.input}
            type="password"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            placeholder="••••••••"
            required
          />

          {erro && <p style={styles.erro}>{erro}</p>}

          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f3f4f6',
    padding: 20,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 380,
    border: '1px solid #e5e7eb',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column',
  },
  brand: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: '0.06em',
    color: '#2e2e2e',
  },
  sub: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: 500,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  greenBar: {
    height: 3,
    background: '#07D48A',
    borderRadius: 2,
    marginBottom: 28,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginTop: 8,
  },
  input: {
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 14,
    outline: 'none',
    color: '#2e2e2e',
    transition: 'border-color .15s',
  },
  erro: {
    fontSize: 13,
    color: '#dc2626',
    marginTop: 4,
  },
  btn: {
    marginTop: 12,
    background: '#07D48A',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background .15s',
  },
}
