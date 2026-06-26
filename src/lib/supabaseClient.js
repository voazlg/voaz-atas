// ── supabaseClient.js ──
// Aponta para o Supabase CENTRAL (mesmo do VOAZ Obras)
// Substitui src/lib/supabase.js no projeto Check Point

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Tipos de ata — mantidos exatamente como estavam
export const TIPOS_ATA = {
  kickoff:  { label: 'Kickoff',          color: '#92400e', bg: '#fef3c7' },
  interno:  { label: 'CP Interno',       color: '#1e40af', bg: '#dbeafe' },
  externo:  { label: 'CP Externo',       color: '#065f46', bg: '#d1fae5' },
}
