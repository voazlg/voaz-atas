// ── Header.jsx ──
// Alterações:
// 1. Clique no logo volta para a hub (/) em vez de /obras
// 2. Breadcrumb: VOAZ › Check Point Semanal
// 3. is_admin continua funcionando (vem do useAuth adaptado)

import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function Header() {
  const { perfil, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isDash = location.pathname === '/dashboard'

  return (
    <header style={s.header}>
      {/* Logo — clica e volta para a hub */}
      <div style={s.left} onClick={() => window.location.href = '/'} role="button" title="Voltar à hub VOAZ">
        <img
          src="https://voaz-obras.vercel.app/logo-voaz-white.jpg"
          alt="VOAZ"
          width={32}
          height={32}
          style={{ objectFit: 'contain', display: 'block' }}
        />
        <div>
          <div style={s.brand}>VOAZ</div>
          <div style={s.sub}>Check Point Semanal</div>
        </div>
      </div>

      <nav style={s.nav}>
        <button
          style={{ ...s.navBtn, ...(location.pathname === '/obras' ? s.navActive : {}) }}
          onClick={() => navigate('/obras')}
        >
          <i className="ti ti-building" /> Obras
        </button>
        <button
          style={{ ...s.navBtn, ...(isDash ? s.navActive : {}) }}
          onClick={() => navigate('/dashboard')}
        >
          <i className="ti ti-layout-dashboard" /> Dashboard
        </button>
       
      </nav>

      <div style={s.right}>
        {perfil && (
          <div style={s.userPill}>
            <span style={s.userName}>{perfil.nome}</span>
            <span style={s.userRole}>
              {perfil.role === 'pmo' ? 'PMO / Sócio' : perfil.role === 'engenheiro' ? 'Engenheiro' : perfil.role === 'mestre' ? 'Mestre' : 'Compras'}
            </span>
          </div>
        )}
        <button style={s.signOut} onClick={() => navigate('/perfil')} title="Minha conta">
          <i className="ti ti-user-circle" />
        </button>
        <button style={s.signOut} onClick={signOut} title="Sair">
          <i className="ti ti-logout" />
        </button>
      </div>
    </header>
  )
}

const s = {
  header: {
    background: '#2e2e2e',
    borderBottom: '3px solid #07D48A',
    height: 56,
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    gap: 20,
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    flexShrink: 0,
  },
  brand: {
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: '0.08em',
    color: '#07D48A',
    lineHeight: 1,
  },
  sub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  nav: { display: 'flex', gap: 4, flex: 1 },
  navBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    padding: '6px 14px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all .15s',
    cursor: 'pointer',
  },
  navActive: { background: 'rgba(7,212,138,0.15)', color: '#07D48A' },
  right: { display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' },
  userPill: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
  userName: { fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1 },
  userRole: { fontSize: 10, color: '#07D48A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  signOut: {
    background: 'none',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 6,
    color: 'rgba(255,255,255,0.5)',
    padding: '5px 8px',
    fontSize: 16,
    cursor: 'pointer',
  },
}
