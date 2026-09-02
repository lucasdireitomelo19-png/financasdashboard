let sharedContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!sharedContext) sharedContext = new Ctor()
  return sharedContext
}

/** Bipe curto de duas notas subindo — confirmação de "salvo". Sintetizado
 * (sem arquivo de áudio) via Web Audio API. */
function playConfirmTone() {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()

  const now = ctx.currentTime
  const notes: [number, number][] = [
    [880, now],
    [1320, now + 0.07],
  ]

  for (const [freq, start] of notes) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.08, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.13)
  }
}

function vibrateShort() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(12)
  }
}

/** Feedback sonoro + tátil sutil para confirmar que algo foi salvo. */
export function triggerSaveFeedback() {
  try {
    playConfirmTone()
  } catch {
    // navegador pode bloquear áudio sem interação prévia — ignora silenciosamente
  }
  try {
    vibrateShort()
  } catch {
    // ignora — vibração não é essencial
  }
}
