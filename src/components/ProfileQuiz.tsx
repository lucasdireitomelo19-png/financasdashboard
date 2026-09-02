import { useState } from 'react'
import { QUIZ_QUESTIONS, scoreToProfile } from '../lib/investorProfile'
import type { RiskProfile } from '../types/database'

export function ProfileQuiz({
  onComplete,
  onCancel,
}: {
  onComplete: (riskProfile: RiskProfile, score: number, answers: Record<string, number>) => Promise<void>
  onCancel?: () => void
}) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)

  const question = QUIZ_QUESTIONS[step]
  const isLast = step === QUIZ_QUESTIONS.length - 1
  const selected = answers[question.id]

  const choose = async (value: number) => {
    const next = { ...answers, [question.id]: value }
    setAnswers(next)

    if (!isLast) {
      setStep((s) => s + 1)
      return
    }

    const score = Object.values(next).reduce((s, v) => s + v, 0)
    const profile = scoreToProfile(score)
    setSaving(true)
    await onComplete(profile, score, next)
    setSaving(false)
  }

  return (
    <div>
      <div className="mb-4 flex gap-1.5">
        {QUIZ_QUESTIONS.map((q, i) => (
          <div key={q.id} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-cyan-400 shadow-[0_0_8px_color-mix(in_srgb,var(--color-accent)_80%,transparent)]' : 'bg-cyan-500/15'}`} />
        ))}
      </div>

      <p className="mb-1 font-display text-[10px] uppercase tracking-wider text-slate-500">
        Pergunta {step + 1} de {QUIZ_QUESTIONS.length}
      </p>
      <h3 className="mb-4 text-base font-medium text-slate-100">{question.question}</h3>

      <div className="space-y-2">
        {question.options.map((opt) => (
          <button
            key={opt.label}
            type="button"
            disabled={saving}
            onClick={() => choose(opt.value)}
            className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
              selected === opt.value
                ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-100 shadow-[0_0_16px_-4px_color-mix(in_srgb,var(--color-accent)_60%,transparent)]'
                : 'border-cyan-500/20 bg-[#0a1120]/60 text-slate-300 hover:border-cyan-400/40 hover:bg-cyan-500/5'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => (step === 0 ? onCancel?.() : setStep((s) => s - 1))}
          disabled={saving}
          className="font-display text-xs uppercase tracking-wider text-slate-500 hover:text-cyan-300 disabled:opacity-50"
        >
          {step === 0 ? 'Cancelar' : '← Voltar'}
        </button>
        {saving && <p className="font-display text-xs uppercase tracking-wider text-cyan-300/70">Calculando perfil...</p>}
      </div>
    </div>
  )
}
