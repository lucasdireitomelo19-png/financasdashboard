import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { InvestorProfile, RiskProfile } from '../types/database'

export function useInvestorProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<InvestorProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase.from('investor_profiles').select('*').eq('user_id', userId).maybeSingle()
    setProfile(data ?? null)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const save = async (riskProfile: RiskProfile, score: number, answers: Record<string, number>) => {
    if (!userId) return { error: 'Sem usuário' }
    const { error } = await supabase
      .from('investor_profiles')
      .upsert({ user_id: userId, risk_profile: riskProfile, score, answers, updated_at: new Date().toISOString() })
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  return { profile, loading, refetch, save }
}
