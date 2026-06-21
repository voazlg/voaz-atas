import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ── STATUS ────────────────────────────────────────────────
export const STATUS = {
  CONCLUIDO:     { label: 'Concluído',     color: '#d1fae5', text: '#065f46' },
  EM_ANDAMENTO:  { label: 'Em andamento',  color: '#dbeafe', text: '#1e40af' },
  ATRASADO:      { label: 'Atrasado',      color: '#fee2e2', text: '#991b1b' },
  ALERTA:        { label: 'Alerta',        color: '#fef3c7', text: '#92400e' },
  MONITORAMENTO: { label: 'Monitoramento', color: '#ede9fe', text: '#5b21b6' },
}

// ── GRUPOS BASE POR TIPO ──────────────────────────────────
export const GRUPOS_TEMPLATE = {
  interno: [
    {
      titulo: 'Arquitetura — Levantamentos',
      itens: [
        'Projetos originais do edifício',
        'Físico / Planta atualizada',
        'Equipamentos (eletro, impressoras, multimídia)',
        'Mobiliário',
        'Itens a reaproveitar',
        'Vistoria técnica com projetistas',
        'Planta DE-PARA',
      ],
    },
    {
      titulo: 'Arquitetura — Estudo Preliminar',
      itens: [
        'Layout aprovado pelo cliente',
        'Civil (croqui)',
        'Forro (croqui)',
        'Piso (croqui)',
        'Indicação de pontos',
        'Amostras — Vinílico',
        'Amostras — Cerâmico / Cobogó',
        'Amostras — Pedras',
        'Amostras — Marcenaria / MDF',
        'Amostras — Tecidos / Baffles',
        'Mock-up',
        'EP completo validado pelo cliente',
      ],
    },
    {
      titulo: 'Arquitetura — Projeto Executivo',
      itens: [
        'Civil demolição',
        'Civil construção',
        'Marcenarias',
        'Revestimentos',
        'Ampliações',
        'Cortes e elevações',
        'Layout de montagem',
        'Kickoff com projetistas técnicos',
        'Elétrica',
        'Ar condicionado',
        'Hidráulica',
        'Incêndio',
        'Luminotécnico',
        'Controle de ARTs',
      ],
    },
    {
      titulo: 'Obra',
      itens: [
        'Liberação de demolição',
        'Relatório de recebimento',
        'Questionário canteiro',
        'Cronograma de obra',
        'Chaves / Controle de acesso',
        'Sala de Fan Coil',
        'Nobreak',
        'Timers nos quadros',
        'Devolução de itens não usados',
        'Comissionamento e testes',
        'Pós obra',
        'Manual do proprietário',
        'As built',
        'ARTs de execução',
      ],
    },
    {
      titulo: 'Compras',
      itens: ['Grupo 1', 'Grupo 2', 'Grupo Técnico', 'Grupo 4', 'Lista de materiais'],
    },
    {
      titulo: 'Aditivos',
      itens: [],
    },
  ],
  externo: [
    {
      titulo: 'Requisitos Legais',
      itens: [
        'Prazo para entrada de projetos no prédio',
        'Reunião semanal',
        'Contrato',
      ],
    },
    {
      titulo: 'Arquitetura',
      itens: [
        'Levantamentos',
        'Estudo Preliminar',
        'Amostras',
        'Mobiliário',
        'Projeto Executivo',
      ],
    },
    {
      titulo: 'Compras',
      itens: ['Grupo 1', 'Grupo 2', 'Grupo Técnico'],
    },
    {
      titulo: 'Obra',
      itens: [
        'Cronograma de obra',
        'Aprovações do condomínio',
        'Andamento geral',
      ],
    },
  ],
}

// ── CORES VOAZ ────────────────────────────────────────────
export const VOAZ = {
  green:      '#07D48A',
  greenLight: '#83DAB9',
  greenPale:  '#e8faf4',
  dark:       '#2e2e2e',
  gray:       '#6b7280',
  border:     '#e5e7eb',
  bg:         '#f9fafb',
}
