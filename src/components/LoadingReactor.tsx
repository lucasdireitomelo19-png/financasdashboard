import { ArcReactor } from './ArcReactor'

export function LoadingReactor({ label = 'Carregando' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <ArcReactor size={56} />
      <p className="font-display text-xs uppercase tracking-[0.3em] text-cyan-300/70">{label}</p>
    </div>
  )
}
