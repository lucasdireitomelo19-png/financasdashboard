import type { ReactNode } from 'react'

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-slate-300">{label}</span>
      {children}
    </label>
  )
}

const baseInput =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'

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
      className={`w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ''}`}
    />
  )
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 font-medium text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ''}`}
    />
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{children}</p>
}
