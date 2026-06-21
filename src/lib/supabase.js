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

// ── TIPOS DE ATA ──────────────────────────────────────────
export const TIPOS_ATA = {
  kickoff:  { label: 'Kickoff Interno',      icon: 'ti-rocket',      color: '#fef3c7', text: '#92400e', alimentaDash: false },
  interno:  { label: 'Checkpoint Interno',   icon: 'ti-lock',        color: '#e0e7ff', text: '#3730a3', alimentaDash: true  },
  externo:  { label: 'Checkpoint Externo',   icon: 'ti-users',       color: '#dcfce7', text: '#166534', alimentaDash: true  },
}

// ── GRUPOS BASE POR TIPO ──────────────────────────────────
export const GRUPOS_TEMPLATE = {
  kickoff: [
    {
      titulo: 'Informações Gerais do Cliente',
      itens: [
        'Perfil do cliente',
        'Modelo de negócio',
        'Contrato / carta de intenções / formalização de início',
        'Haverá PO? Já recebemos? Previsão?',
        'Escopo',
        'Resumo da proposta (apresentação)',
        'Itens reaproveitados',
        'Compras diretas do cliente',
        'Confirmar se última revisão do projeto reflete planilha de custos',
        'Gerenciadora externa?',
        'Mockup e amostras',
        'Definição equipe de obra / TST',
        'Indicação de fornecedores',
        'Cadastro de fornecedores',
      ],
    },
    {
      titulo: 'Requisitos Legais',
      itens: [
        'Análise da situação do imóvel',
        'Informação de aprovação (impactos em projeto e cronograma)',
        'Prefeitura',
        'Necessidade de aprovação CONTRU, SEHAB, CET, CONPRESP, CONDEPHAT',
        'Vendemos a FAT',
        'Alvará e licença de funcionamento',
        'Seguro — prazo de cobertura, valor mínimo e itens do cliente',
        'ART / RRT Arquitetura',
        'ART / RRT VOAZ',
      ],
    },
    {
      titulo: 'Budget e Orçamento',
      itens: [
        'Apresentação e análise do cronograma comercial',
        'Estratégia de rentabilização do projeto',
        'Créditos e débitos',
      ],
    },
    {
      titulo: 'Cronograma e Rotina Semanal',
      itens: [
        'Definir agenda de reunião semanal com o cliente',
        'Definir agenda de checkpoint interno',
        'Definição da data do kickoff externo',
        'Agenda dos próximos passos internos',
        'Apresentação e análise do cronograma comercial',
      ],
    },
    {
      titulo: 'Contratação dos Projetos Técnicos',
      itens: [
        'Elétrica',
        'Luminotécnico',
        'Ar condicionado',
        'Hidráulica / SPK',
        'Cabeamento de dados / voz / telecom',
        'Bombeiro',
        'Projeto estrutural',
        'CFTV / controle de acesso',
        'Comunicação visual',
        'Acústica',
        'Automação',
        'Paisagismo',
        'Cozinha industrial',
        'LEED',
        'Consultorias específicas',
      ],
    },
    {
      titulo: 'Aprovações Condomínio / Início de Obra',
      itens: [
        'Verificação de procedimento / protocolo do condomínio',
        'Preparo do material necessário para entrada no condomínio',
        'Projetos para entrada no prédio',
      ],
    },
    {
      titulo: 'Riscos do Projeto',
      itens: [],
    },
    {
      titulo: 'Cronograma de Compras',
      itens: [
        'Demolição',
        'Lista de canteiro',
        'Drywall',
        'Elétrica',
        'Ar condicionado',
        'Divisórias',
        'Luminária',
        'Hidráulica',
        'Papel de parede',
      ],
    },
  ],
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
