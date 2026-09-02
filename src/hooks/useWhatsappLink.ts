import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { WhatsappLink } from '../types/database'

export function useWhatsappLink(userId: string | undefined) {
  const [link, setLink] = useState<WhatsappLink | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase.from('whatsapp_links').select('*').eq('user_id', userId).maybeSingle()
    setLink(data)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const save = async (phoneNumber: string) => {
    if (!userId) return { error: 'Sem usuário' }
    const { error } = await supabase.from('whatsapp_links').upsert({ user_id: userId, phone_number: phoneNumber })
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const remove = async () => {
    if (!userId) return { error: 'Sem usuário' }
    const { error } = await supabase.from('whatsapp_links').delete().eq('user_id', userId)
    if (!error) setLink(null)
    return { error: error?.message ?? null }
  }

  return { link, loading, save, remove }
}
