import { useState, type FormEvent } from 'react'
import { TextInput } from './FormField'
import { parseAgendaInput } from '../lib/agendaParser'
import { formatDate } from '../lib/format'
import { triggerSaveFeedback } from '../lib/feedback'
import type { AgendaEvent } from '../types/database'

interface QuickAddAgendaProps {
  onCreate: (input: Omit<AgendaEvent, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => Promise<{ error: string | null }>
}

/** Gatilho de texto livre pra criar compromissos sem abrir formulário —
 * "marcar reunião dia 27 às 14:00" já cria o evento direto. */
export function QuickAddAgenda({ onCreate }: QuickAddAgendaProps) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim() || saving) return
    setSaving(true)
    setFeedback(null)
    const parsed = parseAgendaInput(text)
    const result = await onCreate({ title: parsed.title, event_date: parsed.date, event_time: parsed.time, notes: null, done: false, google_event_id: null })
    setSaving(false)
    if (result.error) {
      setFeedback(`Não deu pra salvar: ${result.error}`)
      return
    }
    setText('')
    triggerSaveFeedback()
    setFeedback(`✅ "${parsed.title}" marcado pra ${formatDate(parsed.date)}${parsed.time ? ` às ${parsed.time}` : ''}`)
    setTimeout(() => setFeedback(null), 5000)
  }

  return (
    <div className="hud-panel p-4">
      <p className="mb-2 font-display text-[10px] uppercase tracking-wider text-slate-500">📅 Agenda rápida</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <TextInput
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Ex: "marcar reunião dia 27 às 14:00"'
          className="flex-1"
        />
        <button
          type="submit"
          disabled={saving || !text.trim()}
          className="shrink-0 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-[#031018] shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--color-accent)_80%,transparent)] transition hover:from-cyan-400 hover:to-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Salvando...' : '+ Agendar'}
        </button>
      </form>
      {feedback && <p className="mt-2 text-xs text-slate-400">{feedback}</p>}
    </div>
  )
}
