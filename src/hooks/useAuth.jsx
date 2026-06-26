// ── useAuth.jsx ──
// Adaptado para usar tabela "perfis" do Supabase central
// em vez de "usuarios" com auth_id separado

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [perfil, setPerfil]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadPerfil(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadPerfil(session.user.id)
      else { setPerfil(null); setLoading(false) }

      // Redireciona para perfil quando vem de link de reset de senha
      if (event === 'PASSWORD_RECOVERY') {
        window.location.href = '/perfil'
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadPerfil(userId) {
    // Central usa id = auth.uid() diretamente na tabela perfis
    const { data } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', userId)
      .single()

    // Adapta o perfil para manter compatibilidade com o Check Point:
    // - is_admin = true quando role é 'pmo'
    // - nome e role existem em ambos
    if (data) {
      setPerfil({
        ...data,
        auth_id: userId,           // compatibilidade com código existente
        is_admin: data.role === 'pmo',
      })
    }

    setLoading(false)
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    // Volta para a hub após sair
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ user, perfil, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
