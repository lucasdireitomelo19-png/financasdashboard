import type { InvestmentCategory, RiskProfile } from '../types/database'

export interface QuizOption {
  label: string
  value: number
}

export interface QuizQuestion {
  id: string
  question: string
  options: QuizOption[]
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'objetivo',
    question: 'Qual é o seu principal objetivo com os investimentos?',
    options: [
      { label: 'Segurança e liquidez, sem correr riscos', value: 1 },
      { label: 'Equilíbrio entre segurança e crescimento', value: 2 },
      { label: 'Maximizar o crescimento no longo prazo, mesmo com oscilações', value: 3 },
    ],
  },
  {
    id: 'queda',
    question: 'Se seus investimentos caíssem 15% em um mês, o que você faria?',
    options: [
      { label: 'Tiraria o dinheiro imediatamente', value: 1 },
      { label: 'Esperaria para ver o que acontece', value: 2 },
      { label: 'Aproveitaria para investir mais', value: 3 },
    ],
  },
  {
    id: 'prazo',
    question: 'Por quanto tempo pretende deixar esse dinheiro investido, sem precisar dele?',
    options: [
      { label: 'Menos de 1 ano', value: 1 },
      { label: 'Entre 1 e 5 anos', value: 2 },
      { label: 'Mais de 5 anos', value: 3 },
    ],
  },
  {
    id: 'experiencia',
    question: 'Qual seu nível de experiência com investimentos?',
    options: [
      { label: 'Nenhuma, estou começando agora', value: 1 },
      { label: 'Já invisto há algum tempo', value: 2 },
      { label: 'Bastante experiência, incluindo renda variável', value: 3 },
    ],
  },
  {
    id: 'reserva',
    question: 'Você já tem uma reserva de emergência (dinheiro de fácil acesso para imprevistos)?',
    options: [
      { label: 'Não tenho', value: 1 },
      { label: 'Tenho uma parte', value: 2 },
      { label: 'Sim, cobre vários meses de gastos', value: 3 },
    ],
  },
]

export function scoreToProfile(score: number): RiskProfile {
  if (score <= 8) return 'conservador'
  if (score <= 12) return 'moderado'
  return 'arrojado'
}

export const RISK_PROFILE_LABELS: Record<RiskProfile, string> = {
  conservador: 'Conservador',
  moderado: 'Moderado',
  arrojado: 'Arrojado',
}

export const RISK_PROFILE_DESCRIPTIONS: Record<RiskProfile, string> = {
  conservador: 'Prioriza segurança e liquidez. Prefere preservar o capital a buscar grandes ganhos.',
  moderado: 'Busca equilíbrio entre segurança e crescimento, aceitando alguma oscilação.',
  arrojado: 'Foco em crescimento no longo prazo, tolera boa oscilação em troca de retorno maior.',
}

/** Alocação-alvo sugerida por perfil — conteúdo educacional genérico, não é
 * recomendação de investimento individualizada. */
export const TARGET_ALLOCATIONS: Record<RiskProfile, Record<InvestmentCategory, number>> = {
  conservador: {
    reserva_emergencia: 15,
    renda_fixa: 45,
    tesouro: 25,
    fundos: 5,
    fiis: 5,
    previdencia: 5,
    acoes: 0,
    cripto: 0,
    outros: 0,
  },
  moderado: {
    reserva_emergencia: 10,
    renda_fixa: 25,
    tesouro: 20,
    fundos: 15,
    fiis: 15,
    acoes: 10,
    previdencia: 5,
    cripto: 0,
    outros: 0,
  },
  arrojado: {
    reserva_emergencia: 5,
    renda_fixa: 10,
    tesouro: 10,
    fundos: 15,
    fiis: 15,
    acoes: 30,
    cripto: 10,
    previdencia: 5,
    outros: 0,
  },
}
