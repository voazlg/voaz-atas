import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { GRUPOS_TEMPLATE, STATUS, TIPOS_ATA } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../hooks/useAuth'
import { gerarPDF } from '../lib/pdf'

const hoje = new Date().toISOString().split('T')[0]

export default function Ata() {
  const { obraId, tipo } = useParams()
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const { showToast, ToastContainer } = useToast()

  const [obra, setObra]               = useState(null)
  const [ata, setAta]                 = useState(null)
  const [grupos, setGrupos]           = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [tab, setTab]                 = useState('cabecalho')

  // Modal de observações
  const [obsModal, setObsModal]       = useState(null)
  const [obsText, setObsText]         = useState('')

  // Modal de transferência
  const [transferModal, setTransferModal] = useState(null)
  const [transferOutraAtaModal, setTransferOutraAtaModal] = useState(null)

  // Modal de resumo/PDF
  const [resumoModal, setResumoModal] = useState(false)

  // Auto-save timer
  const saveTimer = useRef(null)

  useEffect(() => { init() }, [obraId, tipo])

  async function init() {
    setLoading(true)

    const { data: obraData } = await supabase.from('obras').select('*').eq('id', obraId).single()
    setObra(obraData)

    const { data: resps } = await supabase
      .from('responsaveis')
      .select('*')
      .eq('obra_id', obraId)
      .order('nome')
    setResponsaveis(resps || [])

    // Pegar ou criar ata do dia
    let { data: ataData } = await supabase
      .from('atas')
      .select('*')
      .eq('obra_id', obraId)
      .eq('tipo', tipo)
      .eq('data_reuniao', hoje)
      .single()

    if (!ataData) {
      const { data: pm } = await supabase.from('usuarios').select('id').eq('auth_id', (await supabase.auth.getUser()).data.user.id).single()
      const { data: nova } = await supabase.from('atas').insert({
        obra_id: obraId,
        tipo,
        data_reuniao: hoje,
        created_by: pm?.id,
      }).select().single()
      ataData = nova

      // Criar grupos e itens do template
      if (ataData) await criarGruposTemplate(ataData.id)
    }

    setAta(ataData)
    if (ataData) await loadGrupos(ataData.id)

    setLoading(false)
  }

  async function criarGruposTemplate(ataId) {
    const template = GRUPOS_TEMPLATE[tipo] || []
    for (let i = 0; i < template.length; i++) {
      const g = template[i]
      const { data: grupo } = await supabase.from('grupos').insert({
        ata_id: ataId, titulo: g.titulo, ordem: i,
      }).select().single()

      if (grupo && g.itens.length > 0) {
        await supabase.from('itens').insert(
          g.itens.map((assunto, j) => ({
            grupo_id: grupo.id,
            ata_id: ataId,
            obra_id: obraId,
            assunto,
            data_item: hoje,
            status: 'EM_ANDAMENTO',
            ordem: j,
          }))
        )
      }
    }
  }

  async function loadGrupos(ataId) {
    const { data: gs } = await supabase
      .from('grupos')
      .select('*, itens(*)')
      .eq('ata_id', ataId)
      .order('ordem')

    if (gs) {
      gs.forEach(g => g.itens.sort((a, b) => a.ordem - b.ordem))
      setGrupos(gs)
    }
  }

  // ── AUTO-SAVE ─────────────────────────────────────────
  function scheduleSave(grupoId, itemId, field, value) {
    // Atualiza estado local imediatamente
    setGrupos(prev => prev.map(g =>
      g.id !== grupoId ? g : {
        ...g,
        itens: g.itens.map(i =>
          i.id !== itemId ? i : { ...i, [field]: value }
        )
      }
    ))

    // Debounce para o banco
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await supabase.from('itens').update({ [field]: value }).eq('id', itemId)
    }, 800)
  }

  async function saveItemImmediate(itemId, field, value) {
    await supabase.from('itens').update({ [field]: value }).eq('id', itemId)
  }

  // ── ADICIONAR GRUPO ────────────────────────────────────
  async function addGrupo() {
    const titulo = prompt('Nome do grupo:')
    if (!titulo?.trim()) return
    const { data } = await supabase.from('grupos').insert({
      ata_id: ata.id,
      titulo: titulo.trim(),
      ordem: grupos.length,
    }).select().single()
    if (data) setGrupos(prev => [...prev, { ...data, itens: [] }])
  }

  // ── ADICIONAR ITEM ─────────────────────────────────────
  async function addItem(grupoId) {
    const { data } = await supabase.from('itens').insert({
      grupo_id: grupoId,
      ata_id: ata.id,
      obra_id: obraId,
      assunto: '',
      data_item: hoje,
      status: 'EM_ANDAMENTO',
      ordem: grupos.find(g => g.id === grupoId)?.itens.length || 0,
    }).select().single()

    if (data) {
      setGrupos(prev => prev.map(g =>
        g.id !== grupoId ? g : { ...g, itens: [...g.itens, data] }
      ))
      // Focar no novo item após render
      setTimeout(() => {
        document.getElementById(`assunto-${data.id}`)?.focus()
      }, 100)
    }
  }

  // ── DELETAR ITEM ───────────────────────────────────────
  async function delItem(grupoId, itemId) {
    await supabase.from('itens').delete().eq('id', itemId)
    setGrupos(prev => prev.map(g =>
      g.id !== grupoId ? g : { ...g, itens: g.itens.filter(i => i.id !== itemId) }
    ))
  }

  // ── RESPONSÁVEIS ──────────────────────────────────────
  async function addResponsavel() {
    const nome = prompt('Nome do responsável:')
    if (!nome?.trim()) return
    const { data } = await supabase.from('responsaveis').insert({
      obra_id: obraId, nome: nome.trim(),
    }).select().single()
    if (data) setResponsaveis(prev => [...prev, data])
  }

  async function delResponsavel(id) {
    await supabase.from('responsaveis').delete().eq('id', id)
    setResponsaveis(prev => prev.filter(r => r.id !== id))
  }

  // ── OBS MODAL ─────────────────────────────────────────
  function openObs(grupoId, item) {
    setObsModal({ grupoId, item })
    setObsText('')
  }

  async function saveObs() {
    if (!obsModal) return
    const { grupoId, item } = obsModal
    const d = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    const novaObs = obsText.trim()
      ? (item.observacoes ? item.observacoes + '\n' + d + ' - ' + obsText.trim() : d + ' - ' + obsText.trim())
      : item.observacoes

    await supabase.from('itens').update({ observacoes: novaObs }).eq('id', item.id)
    setGrupos(prev => prev.map(g =>
      g.id !== grupoId ? g : {
        ...g, itens: g.itens.map(i => i.id !== item.id ? i : { ...i, observacoes: novaObs })
      }
    ))
    setObsModal(null)
    showToast('Observação salva')
  }

  // ── TRANSFER (mesmo tipo de ata) ─────────────────────
  function openTransfer(grupoId, item) {
    setTransferModal({ grupoId, item })
  }

  async function doTransfer(destGrupoId) {
    if (!transferModal) return
    const { item } = transferModal
    const { data } = await supabase.from('itens').insert({
      grupo_id: destGrupoId,
      ata_id: ata.id,
      obra_id: obraId,
      assunto: item.assunto,
      data_item: hoje,
      responsavel: item.responsavel,
      observacoes: item.observacoes,
      status: item.status,
      ordem: 99,
    }).select().single()

    if (data) {
      setGrupos(prev => prev.map(g =>
        g.id !== destGrupoId ? g : { ...g, itens: [...g.itens, data] }
      ))
      showToast('Item copiado para ' + grupos.find(g => g.id === destGrupoId)?.titulo)
    }
    setTransferModal(null)
  }

  // ── TRANSFER PARA OUTRA ATA (interno ↔ externo) ───────
  async function doTransferOutraAta(item) {
    const tipoDestino = tipo === 'interno' ? 'externo' : 'interno'

    // Buscar ou criar ata do tipo destino para hoje
    let { data: ataDestino } = await supabase
      .from('atas')
      .select('*')
      .eq('obra_id', obraId)
      .eq('tipo', tipoDestino)
      .eq('data_reuniao', hoje)
      .single()

    if (!ataDestino) {
      const { data: pmUser } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_id', (await supabase.auth.getUser()).data.user.id)
        .single()

      const { data: novaAta } = await supabase.from('atas').insert({
        obra_id: obraId,
        tipo: tipoDestino,
        data_reuniao: hoje,
        created_by: pmUser?.id,
      }).select().single()
      ataDestino = novaAta

      // Criar grupos do template na nova ata
      if (ataDestino) {
        const template = GRUPOS_TEMPLATE[tipoDestino] || []
        for (let i = 0; i < template.length; i++) {
          await supabase.from('grupos').insert({
            ata_id: ataDestino.id,
            titulo: template[i].titulo,
            ordem: i,
          })
        }
      }
    }

    if (!ataDestino) { showToast('Erro ao acessar ata destino'); return }

    const { data: gruposDestino } = await supabase
      .from('grupos')
      .select('*')
      .eq('ata_id', ataDestino.id)
      .order('ordem')

    setTransferModal(null)
    setTransferOutraAtaModal({ item, ataDestino, gruposDestino: gruposDestino || [], tipoDestino })
  }

  // ── SE FOR KICKOFF, PERMITE ESCOLHER PARA QUAL TIPO ───
  function openTransferKickoff(item) {
    setTransferModal(null)
    setTransferOutraAtaModal({ item, escolherTipo: true })
  }

  async function selecionarTipoDestino(tipoDestino) {
    const { item } = transferOutraAtaModal

    let { data: ataDestino } = await supabase
      .from('atas')
      .select('*')
      .eq('obra_id', obraId)
      .eq('tipo', tipoDestino)
      .eq('data_reuniao', hoje)
      .single()

    if (!ataDestino) {
      const { data: pmUser } = await supabase
        .from('usuarios').select('id').eq('auth_id', (await supabase.auth.getUser()).data.user.id).single()
      const { data: novaAta } = await supabase.from('atas').insert({
        obra_id: obraId, tipo: tipoDestino, data_reuniao: hoje, created_by: pmUser?.id,
      }).select().single()
      ataDestino = novaAta
      if (ataDestino) {
        const template = GRUPOS_TEMPLATE[tipoDestino] || []
        for (let i = 0; i < template.length; i++) {
          await supabase.from('grupos').insert({ ata_id: ataDestino.id, titulo: template[i].titulo, ordem: i })
        }
      }
    }

    const { data: gruposDestino } = await supabase
      .from('grupos').select('*').eq('ata_id', ataDestino.id).order('ordem')

    setTransferOutraAtaModal({ item, ataDestino, gruposDestino: gruposDestino || [], tipoDestino })
  }

  async function confirmarTransferOutraAta(destGrupoId) {
    if (!transferOutraAtaModal) return
    const { item, ataDestino, tipoDestino } = transferOutraAtaModal

    await supabase.from('itens').insert({
      grupo_id: destGrupoId,
      ata_id: ataDestino.id,
      obra_id: obraId,
      assunto: item.assunto,
      data_item: hoje,
      responsavel: item.responsavel,
      observacoes: item.observacoes,
      status: item.status,
      ordem: 99,
    })

    showToast(`Item enviado para o Checkpoint ${tipoDestino === 'interno' ? 'Interno' : 'Externo'} ✓`)
    setTransferOutraAtaModal(null)
  }

  // ── RESUMO / PDF ─────────────────────────────────────
  function gerarResumoTexto() {
    const linhas = []
    let totalPendentes = 0

    grupos.forEach(g => {
      const itensPendentes = g.itens.filter(i => i.status !== 'CONCLUIDO')
      if (itensPendentes.length === 0) return

      // Cabeçalho do grupo
      linhas.push('')
      linhas.push(`📌 ${g.titulo.toUpperCase()}`)
      linhas.push('─'.repeat(36))

      itensPendentes.forEach(i => {
        const status = STATUS[i.status]?.label || i.status
        const resp = i.responsavel ? ` | ${i.responsavel}` : ''
        const ultimaObs = i.observacoes
          ? `\n     → ${i.observacoes.split('\n').slice(-1)[0]}`
          : ''
        linhas.push(`[${status}] ${i.assunto}${resp}${ultimaObs}`)
        totalPendentes++
      })
    })

    const header = [
      `VOAZ — Checkpoint ${tipo === 'interno' ? 'Interno' : 'Externo'}`,
      `${obra?.cliente} | ${obra?.nome}`,
      `Data: ${new Date(hoje).toLocaleDateString('pt-BR')}`,
      '',
      `PENDÊNCIAS (${totalPendentes} itens):`,
      '═'.repeat(40),
    ].join('\n')

    return header + linhas.join('\n')
  }

  // ── CONTADORES ────────────────────────────────────────
  const todosItens = grupos.flatMap(g => g.itens)
  const counts = Object.keys(STATUS).reduce((acc, k) => {
    acc[k] = todosItens.filter(i => i.status === k).length
    return acc
  }, {})

  // ── TAB NAVIGATION ────────────────────────────────────
  // Implementada via tabIndex e onKeyDown nas células
  function handleCellTab(e, grupoId, itemId, field) {
    if (e.key !== 'Tab') return
    // O browser já vai para o próximo tabIndex — deixamos acontecer naturalmente
    // O tabIndex é definido em ordem na renderização da tabela
  }

  if (loading) return <div style={{ padding: 40, color: '#6b7280' }}>Carregando ata...</div>
  if (!obra || !ata) return <div style={{ padding: 40, color: '#dc2626' }}>Ata não encontrada.</div>

  const resumoTexto = gerarResumoTexto()

  return (
    <div style={s.page}>
      <ToastContainer />

      {/* ── HEADER DA ATA ── */}
      <div style={s.ataHeader}>
        <button style={s.btnBack} onClick={() => navigate('/obras')}>
          <i className="ti ti-arrow-left" /> Obras
        </button>
        <div style={s.ataInfo}>
          <span style={s.ataCliente}>{obra.cliente}</span>
          <span style={s.ataNome}>{obra.nome}</span>
          <span style={{
            ...s.ataTipo,
            background: TIPOS_ATA[tipo]?.color || '#e5e7eb',
            color: TIPOS_ATA[tipo]?.text || '#374151',
          }}>
            <i className={`ti ${TIPOS_ATA[tipo]?.icon}`} /> {TIPOS_ATA[tipo]?.label || tipo}
          </span>
          {tipo === 'kickoff' && (
            <span style={{ fontSize: 11, color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, padding: '3px 10px', fontWeight: 600 }}>
              Não aparece no dashboard
            </span>
          )}
        </div>
        <div style={s.ataActions}>
          <button style={s.btnResumo} onClick={() => setResumoModal(true)}>
            <i className="ti ti-send" /> Resumo / PDF
          </button>
        </div>
      </div>

      {/* ── PILLS DE STATUS ── */}
      <div style={s.pillsRow}>
        {Object.entries(STATUS).map(([k, v]) => (
          <span key={k} style={{ ...s.pill, background: v.color, color: v.text }}>
            <strong>{counts[k]}</strong>&nbsp;{v.label}
          </span>
        ))}
      </div>

      {/* ── TABS ── */}
      <div style={s.tabs}>
        {[
          { key: 'cabecalho',    label: 'Cabeçalho',    icon: 'ti-info-circle' },
          { key: 'pauta',        label: 'Pauta',         icon: 'ti-list' },
          { key: 'responsaveis', label: 'Responsáveis',  icon: 'ti-users' },
        ].map(t => (
          <button
            key={t.key}
            style={{ ...s.tab, ...(tab === t.key ? s.tabActive : {}) }}
            onClick={() => setTab(t.key)}
          >
            <i className={`ti ${t.icon}`} /> {t.label}
          </button>
        ))}
      </div>

      {/* ══ ABA: CABEÇALHO ══ */}
      {tab === 'cabecalho' && (
        <div style={s.section}>
          <div style={s.cabGrid}>
            {[
              { label: 'Cliente',   value: obra.cliente,    readonly: true },
              { label: 'Data',      value: ata.data_reuniao, readonly: true },
              { label: 'Obra',      value: obra.nome,       readonly: true },
              { label: 'Fase',      value: obra.fase || '—', readonly: true },
              { label: 'Local',     value: obra.local || '—', readonly: true },
              { label: 'Parceiros', value: obra.parceiros || '—', readonly: true },
            ].map(f => (
              <div key={f.label} style={s.cabRow}>
                <span style={s.cabLabel}>{f.label}</span>
                <span style={s.cabValue}>{f.value}</span>
              </div>
            ))}
          </div>
          <p style={s.cabNote}>
            Para editar informações da obra, acesse a tela de Obras.
          </p>
        </div>
      )}

      {/* ══ ABA: PAUTA ══ */}
      {tab === 'pauta' && (
        <div style={s.section}>
          {grupos.map((grupo, gi) => (
            <GrupoAta
              key={grupo.id}
              grupo={grupo}
              grupos={grupos}
              responsaveis={responsaveis}
              onFieldChange={scheduleSave}
              onStatusChange={async (gid, iid, val) => {
                scheduleSave(gid, iid, 'status', val)
                await saveItemImmediate(iid, 'status', val)
              }}
              onAddItem={addItem}
              onDelItem={delItem}
              onOpenObs={openObs}
              onTransfer={openTransfer}
            />
          ))}
          <button style={s.btnAddGrupo} onClick={addGrupo}>
            <i className="ti ti-plus" /> Adicionar grupo
          </button>
        </div>
      )}

      {/* ══ ABA: RESPONSÁVEIS ══ */}
      {tab === 'responsaveis' && (
        <div style={s.section}>
          <div style={s.respBox}>
            <p style={s.respTitle}>Responsáveis desta obra</p>
            <p style={s.respSub}>Estes nomes aparecerão como opção nos campos da pauta.</p>
            <div style={s.respList}>
              {responsaveis.map(r => (
                <div key={r.id} style={s.respTag}>
                  <span>{r.nome}</span>
                  <button style={s.respDel} onClick={() => delResponsavel(r.id)}>
                    <i className="ti ti-x" />
                  </button>
                </div>
              ))}
            </div>
            <button style={s.btnAddResp} onClick={addResponsavel}>
              <i className="ti ti-plus" /> Adicionar responsável
            </button>
          </div>
        </div>
      )}

      {/* ══ MODAL: OBS ══ */}
      {obsModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>{obsModal.item.assunto || 'Observações'}</span>
              <button style={s.btnClose} onClick={() => setObsModal(null)}>
                <i className="ti ti-x" />
              </button>
            </div>
            {obsModal.item.observacoes && (
              <div style={s.obsHistory}>
                {obsModal.item.observacoes}
              </div>
            )}
            <textarea
              style={s.obsInput}
              rows={3}
              placeholder="Nova observação de hoje..."
              value={obsText}
              onChange={e => setObsText(e.target.value)}
              autoFocus
            />
            <div style={s.modalFooter}>
              <button style={s.btnSave} onClick={saveObs}>Salvar</button>
              <button style={s.btnCancel} onClick={() => setObsModal(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: TRANSFER ══ */}
      {transferModal && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: 380 }}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>Copiar item para...</span>
              <button style={s.btnClose} onClick={() => setTransferModal(null)}>
                <i className="ti ti-x" />
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
              "{transferModal.item.assunto?.substring(0, 50)}"
            </p>

            {/* Botão para outra ata */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Enviar para checkpoint
              </p>
              {tipo === 'kickoff' ? (
                <>
                  <button
                    style={{ ...s.transferBtn, background: '#e0e7ff', borderColor: '#a5b4fc', color: '#3730a3', fontWeight: 700, marginBottom: 8 }}
                    onClick={() => { setTransferModal(null); selecionarTipoDestino('interno') }}
                  >
                    <i className="ti ti-lock" /> Enviar para CP Interno
                  </button>
                  <button
                    style={{ ...s.transferBtn, background: '#dcfce7', borderColor: '#86efac', color: '#166534', fontWeight: 700 }}
                    onClick={() => { setTransferModal(null); selecionarTipoDestino('externo') }}
                  >
                    <i className="ti ti-users" /> Enviar para CP Externo
                  </button>
                </>
              ) : (
                <button
                  style={{ ...s.transferBtn, background: tipo === 'interno' ? '#dcfce7' : '#e0e7ff', borderColor: tipo === 'interno' ? '#86efac' : '#a5b4fc', color: tipo === 'interno' ? '#166534' : '#3730a3', fontWeight: 700 }}
                  onClick={() => doTransferOutraAta(transferModal.item)}
                >
                  <i className={`ti ti-${tipo === 'interno' ? 'users' : 'lock'}`} />
                  Enviar para CP {tipo === 'interno' ? 'Externo' : 'Interno'}
                </button>
              )}
            </div>

            {/* Grupos da mesma ata */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Outro grupo desta ata
              </p>
              {grupos
                .filter(g => g.id !== transferModal.grupoId)
                .map(g => (
                  <button key={g.id} style={s.transferBtn} onClick={() => doTransfer(g.id)}>
                    {g.titulo}
                  </button>
                ))}
            </div>

            <button style={{ ...s.btnCancel, marginTop: 12, width: '100%' }} onClick={() => setTransferModal(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* ══ MODAL: TRANSFER OUTRA ATA ══ */}
      {transferOutraAtaModal && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: 380 }}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>
                {transferOutraAtaModal.tipoDestino
                  ? `CP ${transferOutraAtaModal.tipoDestino === 'interno' ? 'Interno' : 'Externo'} — qual grupo?`
                  : 'Escolha o destino'}
              </span>
              <button style={s.btnClose} onClick={() => setTransferOutraAtaModal(null)}>
                <i className="ti ti-x" />
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
              "{transferOutraAtaModal.item?.assunto?.substring(0, 50)}"
            </p>
            {transferOutraAtaModal.gruposDestino?.map(g => (
              <button key={g.id} style={s.transferBtn} onClick={() => confirmarTransferOutraAta(g.id)}>
                {g.titulo}
              </button>
            ))}
            <button style={{ ...s.btnCancel, marginTop: 8, width: '100%' }} onClick={() => setTransferOutraAtaModal(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* ══ MODAL: RESUMO / PDF ══ */}
      {resumoModal && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: 580 }}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>Resumo de pendências</span>
              <button style={s.btnClose} onClick={() => setResumoModal(false)}>
                <i className="ti ti-x" />
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
              Copie o texto abaixo e cole no WhatsApp, e-mail ou onde quiser.
            </p>
            <textarea
              style={{ ...s.obsInput, height: 260, fontFamily: 'monospace', fontSize: 12 }}
              value={resumoTexto}
              readOnly
              onClick={e => e.target.select()}
            />
            <div style={s.modalFooter}>
              <button style={s.btnSave} onClick={() => {
                navigator.clipboard.writeText(resumoTexto)
                showToast('Copiado!')
              }}>
                <i className="ti ti-copy" /> Copiar tudo
              </button>
              <button style={s.btnCancel} onClick={() => {
                gerarPDF(obra, ata, grupos, tipo)
                showToast('PDF gerado!')
              }}>
                <i className="ti ti-file-type-pdf" /> Gerar PDF
              </button>
              <button style={{ ...s.btnCancel, marginLeft: 'auto' }} onClick={() => setResumoModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SUB-COMPONENTE: GRUPO ────────────────────────────────
function GrupoAta({ grupo, grupos, responsaveis, onFieldChange, onStatusChange, onAddItem, onDelItem, onOpenObs, onTransfer }) {
  const [open, setOpen] = useState(true)
  const pendentes = grupo.itens.filter(i => i.status !== 'CONCLUIDO').length

  return (
    <div style={sg.wrap}>
      <div style={sg.header} onClick={() => setOpen(o => !o)}>
        <div style={sg.headerLeft}>
          <span style={sg.titulo}>{grupo.titulo}</span>
          <span style={sg.countPill}>{grupo.itens.length} itens</span>
          {pendentes > 0 && (
            <span style={sg.pendPill}>{pendentes} pendentes</span>
          )}
        </div>
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }} />
      </div>

      {open && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={sg.table}>
              <thead>
                <tr>
                  <th style={sg.th}></th>
                  <th style={{ ...sg.th, minWidth: 180 }}>Assunto</th>
                  <th style={{ ...sg.th, width: 108 }}>Data item</th>
                  <th style={{ ...sg.th, width: 108 }}>Data limite</th>
                  <th style={{ ...sg.th, width: 130 }}>Responsável</th>
                  <th style={{ ...sg.th, minWidth: 160 }}>Observações</th>
                  <th style={{ ...sg.th, width: 130 }}>Status</th>
                  <th style={{ ...sg.th, width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {grupo.itens.map((item, idx) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    grupoId={grupo.id}
                    grupos={grupos}
                    responsaveis={responsaveis}
                    tabBase={idx * 6}
                    onFieldChange={onFieldChange}
                    onStatusChange={onStatusChange}
                    onDel={() => onDelItem(grupo.id, item.id)}
                    onOpenObs={() => onOpenObs(grupo.id, item)}
                    onTransfer={() => onTransfer(grupo.id, item)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <button style={sg.btnAdd} onClick={() => onAddItem(grupo.id)}>
            <i className="ti ti-plus" /> Adicionar item
          </button>
        </>
      )}
    </div>
  )
}

// ── SUB-COMPONENTE: LINHA ────────────────────────────────
function ItemRow({ item, grupoId, grupos, responsaveis, tabBase, onFieldChange, onStatusChange, onDel, onOpenObs, onTransfer }) {
  const statusCfg = STATUS[item.status] || STATUS.EM_ANDAMENTO
  const obsPreview = item.observacoes
    ? item.observacoes.split('\n').slice(-1)[0].substring(0, 35) + (item.observacoes.length > 35 ? '…' : '')
    : null

  return (
    <tr style={sr.row}>
      <td style={sr.td}>
        <button style={sr.delBtn} onClick={onDel} tabIndex={-1}>×</button>
      </td>
      <td style={sr.td}>
        <textarea
          id={`assunto-${item.id}`}
          style={sr.cellInput}
          value={item.assunto || ''}
          onChange={e => onFieldChange(grupoId, item.id, 'assunto', e.target.value)}
          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
          rows={1}
          tabIndex={tabBase + 1}
        />
      </td>
      <td style={sr.td}>
        <input
          style={sr.dateInput}
          type="date"
          value={item.data_item || ''}
          onChange={e => onFieldChange(grupoId, item.id, 'data_item', e.target.value)}
          tabIndex={tabBase + 2}
        />
      </td>
      <td style={sr.td}>
        <input
          style={sr.dateInput}
          type="date"
          value={item.data_limite || ''}
          onChange={e => onFieldChange(grupoId, item.id, 'data_limite', e.target.value)}
          tabIndex={tabBase + 3}
        />
      </td>
      <td style={sr.td}>
        <select
          style={sr.respSelect}
          value={item.responsavel || ''}
          onChange={e => onFieldChange(grupoId, item.id, 'responsavel', e.target.value)}
          tabIndex={tabBase + 4}
        >
          <option value="">—</option>
          {responsaveis.map(r => (
            <option key={r.id} value={r.nome}>{r.nome}</option>
          ))}
        </select>
      </td>
      <td style={sr.td}>
        <button
          style={{ ...sr.obsBtn, ...(item.observacoes ? sr.obsBtnHas : {}) }}
          onClick={onOpenObs}
          tabIndex={tabBase + 5}
        >
          {obsPreview || '+ obs'}
        </button>
      </td>
      <td style={sr.td}>
        <select
          style={{ ...sr.statusSel, background: statusCfg.color, color: statusCfg.text }}
          value={item.status}
          onChange={e => onStatusChange(grupoId, item.id, e.target.value)}
          tabIndex={tabBase + 6}
        >
          {Object.entries(STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </td>
      <td style={sr.td}>
        <button style={sr.transferBtn} onClick={onTransfer} title="Copiar para outro grupo" tabIndex={-1}>
          <i className="ti ti-copy" />
        </button>
      </td>
    </tr>
  )
}

// ── ESTILOS ──────────────────────────────────────────────
const s = {
  page:       { padding: '0 0 60px' },
  ataHeader:  { background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16 },
  btnBack:    { background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', flexShrink: 0 },
  ataInfo:    { flex: 1, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  ataCliente: { fontSize: 11, fontWeight: 700, color: '#07D48A', textTransform: 'uppercase', letterSpacing: '0.08em' },
  ataNome:    { fontSize: 15, fontWeight: 700, color: '#2e2e2e' },
  ataTipo:    { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 },
  ataActions: { display: 'flex', gap: 8 },
  btnResumo:  { background: '#07D48A', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  pillsRow:   { display: 'flex', gap: 8, padding: '12px 24px', flexWrap: 'wrap', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  pill:       { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  tabs:       { display: 'flex', background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', gap: 2 },
  tab:        { padding: '11px 16px', background: 'none', border: 'none', borderBottom: '2px solid transparent', fontSize: 13, fontWeight: 500, color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: -1 },
  tabActive:  { color: '#2e2e2e', borderBottomColor: '#07D48A', fontWeight: 600 },
  section:    { padding: 24 },
  cabGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#e5e7eb', maxWidth: 640 },
  cabRow:     { background: '#fff', padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' },
  cabLabel:   { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', width: 70, flexShrink: 0 },
  cabValue:   { fontSize: 14, fontWeight: 500, color: '#2e2e2e' },
  cabNote:    { fontSize: 12, color: '#9ca3af', marginTop: 12 },
  btnAddGrupo:{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '12px 16px', background: 'none', border: '2px dashed #e5e7eb', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#9ca3af', cursor: 'pointer', justifyContent: 'center', marginTop: 12 },
  respBox:    { background: '#f9fafb', borderRadius: 10, padding: 20, maxWidth: 560 },
  respTitle:  { fontSize: 15, fontWeight: 700, marginBottom: 4 },
  respSub:    { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  respList:   { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  respTag:    { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px', fontSize: 13 },
  respDel:    { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 14, display: 'flex' },
  btnAddResp: { background: '#2e2e2e', color: '#07D48A', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal:      { background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' },
  modalHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 15, fontWeight: 700 },
  btnClose:   { background: 'none', border: 'none', fontSize: 20, color: '#6b7280', cursor: 'pointer' },
  obsHistory: { background: '#f9fafb', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#6b7280', lineHeight: 1.7, maxHeight: 140, overflowY: 'auto', marginBottom: 12, whiteSpace: 'pre-wrap', fontFamily: 'monospace' },
  obsInput:   { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 13, resize: 'none', outline: 'none', color: '#2e2e2e' },
  modalFooter:{ display: 'flex', gap: 8, marginTop: 12 },
  btnSave:    { flex: 1, background: '#07D48A', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnCancel:  { background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 },
  transferBtn:{ width: '100%', padding: '11px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left', color: '#2e2e2e', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 },
}

const sg = {
  wrap:     { border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 12 },
  header:   { background: '#2e2e2e', color: '#fff', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  titulo:   { fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' },
  countPill:{ background: 'rgba(7,212,138,0.2)', color: '#07D48A', borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 700 },
  pendPill: { background: 'rgba(220,38,38,0.15)', color: '#dc2626', borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 700 },
  table:    { width: '100%', borderCollapse: 'collapse' },
  th:       { background: '#f9fafb', padding: '7px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', textAlign: 'left', borderBottom: '1px solid #e5e7eb' },
  btnAdd:   { display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 16px', background: '#f9fafb', border: 'none', fontSize: 12, fontWeight: 600, color: '#6b7280', cursor: 'pointer', borderTop: '1px solid #e5e7eb' },
}

const sr = {
  row:       { borderBottom: '1px solid #f3f4f6' },
  td:        { padding: '5px 8px', verticalAlign: 'middle' },
  cellInput: { border: 'none', background: 'transparent', fontSize: 13, color: '#2e2e2e', outline: 'none', width: '100%', resize: 'none', padding: '3px', borderRadius: 4, fontFamily: 'Inter, sans-serif', minHeight: 28 },
  dateInput: { border: 'none', background: 'transparent', fontSize: 12, color: '#2e2e2e', outline: 'none', width: 108, fontFamily: 'Inter, sans-serif', cursor: 'pointer' },
  respSelect:{ border: 'none', background: 'transparent', fontSize: 12, color: '#2e2e2e', outline: 'none', width: '100%', cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  obsBtn:    { border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#9ca3af', background: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  obsBtnHas: { borderColor: '#83DAB9', color: '#2e2e2e' },
  statusSel: { border: 'none', borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', outline: 'none', appearance: 'none', textAlign: 'center', width: '100%', fontFamily: 'Inter, sans-serif' },
  delBtn:    { background: 'none', border: 'none', color: '#d1d5db', fontSize: 15, cursor: 'pointer', padding: '2px 4px' },
  transferBtn:{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 14, cursor: 'pointer', padding: '3px 5px', borderRadius: 4 },
}
