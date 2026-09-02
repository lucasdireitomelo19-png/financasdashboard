import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../hooks/useNotifications'
import { Modal } from './Modal'
import type { AppNotification } from '../lib/notifications'

const SEVERITY_STYLES: Record<AppNotification['severity'], { border: string; bg: string; text: string; icon: string }> = {
  alert: { border: 'border-rose-500/40', bg: 'bg-rose-500/10', text: 'text-rose-300', icon: '⚠️' },
  warning: { border: 'border-amber-500/40', bg: 'bg-amber-500/10', text: 'text-amber-300', icon: '🔶' },
  info: { border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', text: 'text-cyan-200', icon: 'ℹ️' },
}

export function NotificationBell({ userId }: { userId: string | undefined }) {
  const { notifications } = useNotifications(userId)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative rounded-full border border-cyan-500/20 p-1.5 text-cyan-300/70 hover:border-cyan-400/50 hover:text-cyan-200"
        aria-label="Notificações"
      >
        🔔
        {notifications.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-[0_0_6px_rgba(244,63,94,0.8)]">
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <Modal title="Notificações" onClose={() => setOpen(false)}>
          {notifications.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Tudo em dia por aqui. 🚀</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => {
                const style = SEVERITY_STYLES[n.severity]
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      setOpen(false)
                      navigate(n.to)
                    }}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition hover:brightness-125 ${style.border} ${style.bg}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base leading-none">{style.icon}</span>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${style.text}`}>{n.title}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{n.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
