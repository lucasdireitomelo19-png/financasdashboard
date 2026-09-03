import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAgendaEvents } from '../hooks/useAgendaEvents'
import { useGoogleCalendar } from '../hooks/useGoogleCalendar'
import { Modal } from '../components/Modal'
import { QuickAddAgenda } from '../components/QuickAddAgenda'
import { ErrorText, FormField, PrimaryButton, TextArea, TextInput } from '../components/FormField'
import { formatDate, todayIso } from '../lib/format'
import { triggerSaveFeedback } from '../lib/feedback'
import { AGENDA_CATEGORY_META as CATEGORY_META } from '../lib/constants'
import type { AgendaEvent, AgendaEventCategory } from '../types/database'

export function Agenda() {
  const { user } = useAuth()
  const { events, loading, create, update, remove, toggleDone, refetch: refetchEvents } = useAgendaEvents(user?.id)
  const google = useGoogleCalendar()
  const [searchParams, setSearchParams] = useSearchParams()
  const [connecting, setConnecting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AgendaEvent | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<AgendaEventCategory | 'all'>('all')

  // volta do consentimento do Google com ?code=... na URL — troca pelo
  // token e já sincroniza uma vez
  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) return
    setSearchParams((p) => {
      p.delete('code')
      p.delete('scope')
      return p
    })
    setConnecting(true)
    void google.completeConnection(code).then(async (res) => {
      if (!res.error) {
        await google.sync()
        await refetchEvents()
      }
      setConnecting(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>()
    for (const e of events) {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) continue
      if (!map.has(e.event_date)) map.set(e.event_date, [])
      map.get(e.event_date)!.push(e)
    }
    return Array.from(map.entries())
  }, [events, categoryFilter])

  const today = todayIso()

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleSubmit = async (values: { title: string; event_date: string; event_time: string; notes: string; category: AgendaEventCategory }) => {
    const payload = {
      title: values.title,
      event_date: values.event_date,
      event_time: values.event_time || null,
      notes: values.notes || null,
      done: editing?.done ?? false,
      google_event_id: editing?.google_event_id ?? null,
      category: values.category,
    }
    const result = editing ? await update(editing.id, payload) : await create(payload)
    if (!result.error) {
      setModalOpen(false)
      triggerSaveFeedback()
    }
    return result
  }

  const handleDelete = async (e: AgendaEvent) => {
    if (!confirm(`Excluir "${e.title}"?`)) return
    await remove(e.id)
  }

  const handleSync = async () => {
    const res = await google.sync()
    if (!res.error) await refetchEvents()
  }

  const handleDisconnect = async () => {
    if (!confirm('Desconectar do Google Agenda? Os compromissos já sincronizados continuam salvos aqui, só param de atualizar.')) return
    await google.disconnect()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-bold uppercase tracking-wider text-cyan-100">Agenda</h1>
        <button
          onClick={openCreate}
          className="rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-[#031018] shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--color-accent)_80%,transparent)] transition hover:from-cyan-400 hover:to-cyan-300"
        >
          + Novo
        </button>
      </div>

      <div className="hud-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-[10px] uppercase tracking-wider text-slate-500">📆 Google Agenda</p>
            {connecting ? (
              <p className="mt-1 text-sm text-slate-400">Conectando...</p>
            ) : google.connection ? (
              <p className="mt-1 text-sm text-emerald-300">
                Conectado
                {google.connection.last_synced_at ? ` · última sincronização ${new Date(google.connection.last_synced_at).toLocaleString('pt-BR')}` : ' · ainda não sincronizado'}
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-400">Não conectado</p>
            )}
            {google.error && <p className="mt-1 text-xs text-rose-400">{google.error}</p>}
          </div>

          <div className="flex gap-2">
            {google.connection ? (
              <>
                <button
                  onClick={() => void handleSync()}
                  disabled={google.syncing}
                  className="rounded-lg border border-cyan-500/25 bg-[#0a1120]/70 px-3 py-2 font-display text-xs font-medium uppercase tracking-wider text-cyan-100/80 transition hover:border-cyan-400/50 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {google.syncing ? 'Sincronizando...' : '🔄 Sincronizar agora'}
                </button>
                <button onClick={() => void handleDisconnect()} className="rounded-lg border border-rose-500/20 px-3 py-2 font-display text-xs font-medium uppercase tracking-wider text-rose-400 hover:bg-rose-500/10">
                  Desconectar
                </button>
              </>
            ) : (
              <button
                onClick={() => google.connect()}
                className="rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-[#031018] shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--color-accent)_80%,transparent)] transition hover:from-cyan-400 hover:to-cyan-300"
              >
                Conectar Google Agenda
              </button>
            )}
          </div>
        </div>
      </div>

      <QuickAddAgenda onCreate={create} />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`rounded-full border px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-wider transition ${
            categoryFilter === 'all' ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200' : 'border-cyan-500/15 text-slate-400 hover:border-cyan-500/30'
          }`}
        >
          Todos
        </button>
        {(Object.keys(CATEGORY_META) as AgendaEventCategory[]).map((cat) => {
          const meta = CATEGORY_META[cat]
          const active = categoryFilter === cat
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-wider transition"
              style={active ? { borderColor: `${meta.color}80`, background: `${meta.color}1a`, color: meta.color } : { borderColor: 'rgba(6,182,212,0.15)', color: '#94a3b8' }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
              {meta.label}
            </button>
          )
        })}
      </div>

      <div className="hud-panel p-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Carregando...</p>
        ) : grouped.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Nenhum compromisso ainda. Use a agenda rápida acima ou o botão "+ Novo".</p>
        ) : (
          <div className="space-y-5">
            {grouped.map(([date, items]) => (
              <div key={date}>
                <p className={`mb-2 text-xs font-medium uppercase tracking-wide ${date === today ? 'text-cyan-300' : 'text-slate-500'}`}>
                  {formatDate(date)}
                  {date === today ? ' · hoje' : ''}
                </p>
                <ul className="space-y-2">
                  {items.map((e) => (
                    <li
                      key={e.id}
                      className="relative flex items-start gap-3 rounded-lg border border-cyan-500/10 bg-[#0a1120]/40 p-3"
                      style={{ borderLeft: `3px solid ${(CATEGORY_META[e.category] ?? CATEGORY_META.outro).color}` }}
                    >
                      <button
                        onClick={() => void toggleDone(e)}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                          e.done ? 'border-emerald-400/60 bg-emerald-400/20 text-emerald-300' : 'border-cyan-500/30 text-transparent hover:border-cyan-400/60'
                        }`}
                        aria-label={e.done ? 'Marcar como não feito' : 'Marcar como feito'}
                      >
                        ✓
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: (CATEGORY_META[e.category] ?? CATEGORY_META.outro).color }} aria-hidden="true" />
                          <p className={`truncate text-sm font-medium ${e.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{e.title}</p>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{e.event_time ? e.event_time.slice(0, 5) : 'Dia todo'}</p>
                        {e.notes && <p className="mt-1 text-xs text-slate-500">{e.notes}</p>}
                      </div>
                      <button
                        onClick={() => setOpenMenu(openMenu === e.id ? null : e.id)}
                        className="rounded p-1.5 text-lg leading-none text-slate-500 hover:text-cyan-300"
                        aria-label="Mais opções"
                        aria-expanded={openMenu === e.id}
                      >
                        ⋮
                      </button>

                      {openMenu === e.id && (
                        <>
                          <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpenMenu(null)} aria-label="Fechar menu" />
                          <div className="hud-panel absolute right-3 top-11 z-50 w-36 overflow-hidden !p-0">
                            <button
                              onClick={() => {
                                setOpenMenu(null)
                                setEditing(e)
                                setModalOpen(true)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-cyan-500/10"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenu(null)
                                void handleDelete(e)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-rose-400 hover:bg-rose-500/10"
                            >
                              🗑️ Excluir
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Editar compromisso' : 'Novo compromisso'} onClose={() => setModalOpen(false)}>
          <AgendaEventForm initial={editing} onCancel={() => setModalOpen(false)} onSubmit={handleSubmit} />
        </Modal>
      )}
    </div>
  )
}

function AgendaEventForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial?: AgendaEvent | null
  onCancel: () => void
  onSubmit: (values: { title: string; event_date: string; event_time: string; notes: string; category: AgendaEventCategory }) => Promise<{ error: string | null }>
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [date, setDate] = useState(initial?.event_date ?? todayIso())
  const [time, setTime] = useState(initial?.event_time?.slice(0, 5) ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [category, setCategory] = useState<AgendaEventCategory>(initial?.category ?? 'pessoal')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!title.trim()) {
      setError('Informe um título.')
      return
    }
    if (!date) {
      setError('Informe uma data.')
      return
    }
    setSaving(true)
    const result = await onSubmit({ title: title.trim(), event_date: date, event_time: time, notes: notes.trim(), category })
    setSaving(false)
    if (result.error) setError(result.error)
  }

  return (
    <form onSubmit={handleSubmit}>
      <ErrorText>{error}</ErrorText>

      <FormField label="Título">
        <TextInput type="text" required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Reunião com o time" />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Data">
          <TextInput type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <FormField label="Hora (opcional)">
          <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </FormField>
      </div>

      <FormField label="Categoria">
        <div className="flex gap-2">
          {(Object.keys(CATEGORY_META) as AgendaEventCategory[]).map((cat) => {
            const meta = CATEGORY_META[cat]
            const active = category === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 font-display text-[10px] font-semibold uppercase tracking-wider transition"
                style={active ? { borderColor: `${meta.color}80`, background: `${meta.color}1a`, color: meta.color } : { borderColor: 'rgba(6,182,212,0.15)', color: '#94a3b8' }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
                {meta.label}
              </button>
            )
          })}
        </div>
      </FormField>

      <FormField label="Notas (opcional)">
        <TextArea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes, local, o que levar..." />
      </FormField>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onCancel} className="w-full rounded-lg border border-cyan-500/20 px-4 py-2.5 font-medium text-slate-300 hover:bg-cyan-500/10">
          Cancelar
        </button>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </PrimaryButton>
      </div>
    </form>
  )
}
