import type { ReactNode } from 'react'

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1.5 block font-display text-[11px] font-medium uppercase tracking-wider text-cyan-300/70">{label}</span>
      {children}
    </label>
  )
}

const baseInput =
  'w-full rounded-lg border border-cyan-500/20 bg-[#0a1120]/80 px-3 py-2.5 text-slate-100 outline-none placeholder:text-slate-600 transition-all focus:border-cyan-400/70 focus:shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent)_40%,transparent),0_0_16px_-2px_color-mix(in_srgb,var(--color-accent)_50%,transparent)]'

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseInput} ${props.className ?? ''}`} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${baseInput} ${props.className ?? ''}`} />
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${baseInput} ${props.className ?? ''}`} />
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-[#031018] shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--color-accent)_80%,transparent)] transition hover:from-cyan-400 hover:to-cyan-300 hover:shadow-[0_0_28px_-4px_color-mix(in_srgb,var(--color-accent)_95%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ''}`}
    />
  )
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full rounded-lg border border-cyan-500/25 bg-[#0a1120]/70 px-4 py-2.5 font-display text-sm font-medium uppercase tracking-wider text-cyan-100/80 transition hover:border-cyan-400/50 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ''}`}
    />
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{children}</p>
}
