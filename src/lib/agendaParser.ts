export interface ParsedAgendaInput {
  title: string
  date: string
  time: string | null
}

const MONTH_NAMES: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  março: 3,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
}

const WEEKDAY_NAMES: Record<string, number> = {
  domingo: 0,
  'segunda-feira': 1,
  segunda: 1,
  'terça-feira': 2,
  terça: 2,
  terca: 2,
  'quarta-feira': 3,
  quarta: 3,
  'quinta-feira': 4,
  quinta: 4,
  'sexta-feira': 5,
  sexta: 5,
  sábado: 6,
  sabado: 6,
}

const TRIGGER_WORDS = /^(marcar|marca|agendar|agenda|criar\s+evento|novo\s+evento|adicionar|adiciona|lembrar\s+de|lembrete\s+de|lembrete|anotar|colocar)\b[:-]?\s*/i

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/** Extrai a parte de data do texto (regras em português) e devolve a data
 * (ou null se nada foi reconhecido) + o texto restante sem o trecho usado. */
function extractDate(text: string, now: Date): { date: Date | null; rest: string } {
  const lower = stripDiacritics(text.toLowerCase())

  if (/\bdepois de amanha\b/.test(lower)) {
    const idx = lower.indexOf('depois de amanha')
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2)
    return { date: d, rest: text.slice(0, idx) + text.slice(idx + 'depois de amanha'.length) }
  }
  if (/\bamanha\b/.test(lower)) {
    const idx = lower.indexOf('amanha')
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return { date: d, rest: text.slice(0, idx) + text.slice(idx + 'amanha'.length) }
  }
  if (/\bhoje\b/.test(lower)) {
    const idx = lower.indexOf('hoje')
    return { date: new Date(now.getFullYear(), now.getMonth(), now.getDate()), rest: text.slice(0, idx) + text.slice(idx + 'hoje'.length) }
  }

  // "dia 27 de outubro de 2026" / "dia 27 de outubro" / "27 de outubro"
  const longMatch = lower.match(/\b(?:dia\s+)?(\d{1,2})\s+de\s+([a-zç]+)(?:\s+de\s+(\d{4}))?\b/)
  if (longMatch) {
    const day = Number(longMatch[1])
    const month = MONTH_NAMES[longMatch[2]]
    if (month && day >= 1 && day <= 31) {
      const year = longMatch[3] ? Number(longMatch[3]) : now.getFullYear()
      let d = new Date(year, month - 1, day)
      if (!longMatch[3] && d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        d = new Date(year + 1, month - 1, day)
      }
      const idx = lower.indexOf(longMatch[0])
      return { date: d, rest: text.slice(0, idx) + text.slice(idx + longMatch[0].length) }
    }
  }

  // "27/09" ou "dia 27/09/2026" — checa antes do "dia N" solto, senão o "dia
  // 27" seria consumido primeiro e deixaria o "/09" sobrando no título
  const slashMatch = lower.match(/\b(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
  if (slashMatch) {
    const day = Number(slashMatch[1])
    const month = Number(slashMatch[2])
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      let year = slashMatch[3] ? Number(slashMatch[3]) : now.getFullYear()
      if (year < 100) year += 2000
      let d = new Date(year, month - 1, day)
      if (!slashMatch[3] && d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        d = new Date(year + 1, month - 1, day)
      }
      const idx = lower.indexOf(slashMatch[0])
      return { date: d, rest: text.slice(0, idx) + text.slice(idx + slashMatch[0].length) }
    }
  }

  // "dia 27" (sem mês) — assume mês atual, rola pro próximo mês se já passou
  const dayOnlyMatch = lower.match(/\bdia\s+(\d{1,2})\b/)
  if (dayOnlyMatch) {
    const day = Number(dayOnlyMatch[1])
    if (day >= 1 && day <= 31) {
      let d = new Date(now.getFullYear(), now.getMonth(), day)
      if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        d = new Date(now.getFullYear(), now.getMonth() + 1, day)
      }
      const idx = lower.indexOf(dayOnlyMatch[0])
      return { date: d, rest: text.slice(0, idx) + text.slice(idx + dayOnlyMatch[0].length) }
    }
  }

  // dia da semana: "segunda", "próxima sexta", etc — próxima ocorrência (hoje conta)
  for (const [name, weekday] of Object.entries(WEEKDAY_NAMES)) {
    const re = new RegExp(`\\b(proxima\\s+)?${name}\\b`)
    const m = lower.match(re)
    if (m) {
      const todayWeekday = now.getDay()
      let diff = (weekday - todayWeekday + 7) % 7
      if (diff === 0 && m[1]) diff = 7
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff)
      const idx = lower.indexOf(m[0])
      return { date: d, rest: text.slice(0, idx) + text.slice(idx + m[0].length) }
    }
  }

  return { date: null, rest: text }
}

/** Extrai o horário do texto (regras em português) e devolve "HH:MM" (ou
 * null) + o texto restante sem o trecho usado. */
function extractTime(text: string): { time: string | null; rest: string } {
  const lower = stripDiacritics(text.toLowerCase())

  if (/\bmeio[\s-]?dia\b/.test(lower)) {
    const m = lower.match(/\bmeio[\s-]?dia\b/)!
    const idx = lower.indexOf(m[0])
    return { time: '12:00', rest: text.slice(0, idx) + text.slice(idx + m[0].length) }
  }
  if (/\bmeia[\s-]?noite\b/.test(lower)) {
    const m = lower.match(/\bmeia[\s-]?noite\b/)!
    const idx = lower.indexOf(m[0])
    return { time: '00:00', rest: text.slice(0, idx) + text.slice(idx + m[0].length) }
  }

  // "às 14:00", "as 14h00", "14:00", "14h30"
  let m = lower.match(/\b(?:[àa]s?\s+)?(\d{1,2})[:h](\d{2})\b/)
  if (m) {
    const h = Number(m[1])
    const mi = Number(m[2])
    if (h >= 0 && h <= 23 && mi >= 0 && mi <= 59) {
      const idx = lower.indexOf(m[0])
      return { time: `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`, rest: text.slice(0, idx) + text.slice(idx + m[0].length) }
    }
  }

  // "às 14", "14h", "14 horas"
  m = lower.match(/\b(?:[àa]s\s+(\d{1,2})\b|(\d{1,2})\s*h\b|(\d{1,2})\s+horas?\b)/)
  if (m) {
    const h = Number(m[1] ?? m[2] ?? m[3])
    if (h >= 0 && h <= 23) {
      const idx = lower.indexOf(m[0])
      return { time: `${String(h).padStart(2, '0')}:00`, rest: text.slice(0, idx) + text.slice(idx + m[0].length) }
    }
  }

  return { time: null, rest: text }
}

function cleanTitle(text: string): string {
  let title = text.replace(TRIGGER_WORDS, '')
  // remove conectores soltos que sobraram depois de tirar data/hora
  title = title.replace(/\s{2,}/g, ' ').trim()
  title = title.replace(/^(de|para|às|as|-|,)\s+/i, '').trim()
  title = title.replace(/\s+(de|para|às|as|-|,)$/i, '').trim()
  title = title.replace(/\s{2,}/g, ' ').trim()
  if (!title) return 'Compromisso'
  return title.charAt(0).toUpperCase() + title.slice(1)
}

/** Interpreta um texto livre em português ("marcar reunião dia 27 às
 * 14:00") e devolve título + data (ISO) + hora opcional. Sem data
 * reconhecida no texto, assume hoje. Puramente por regras, sem IA. */
export function parseAgendaInput(input: string, now = new Date()): ParsedAgendaInput {
  const { date, rest: afterDate } = extractDate(input, now)
  const { time, rest: afterTime } = extractTime(afterDate)
  const title = cleanTitle(afterTime)
  return { title, date: toIso(date ?? now), time }
}
