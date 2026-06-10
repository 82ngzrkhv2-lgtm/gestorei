'use client'

/**
 * lib/hooks/use-notifications.ts
 *
 * Architecture:
 *  - Realtime (supabase channel): ONLY for badge/unreadCount
 *  - REST (fetch): For loading the full notification list (paginated)
 *  - IndexedDB (via localStorage as lightweight fallback): cache last results
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  payload: Record<string, unknown>
  priority: string
  read: boolean
  created_at: string
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  hasMore: boolean
  loadMore: () => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  refresh: () => void
}

const CACHE_KEY = 'gestorei:notifications:cache'
const PAGE_SIZE = 20

export function useNotifications(): UseNotificationsReturn {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [loading, setLoading]             = useState(false)
  const [page, setPage]                   = useState(1)
  const [hasMore, setHasMore]             = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Load from cache on mount (instant perceived performance)
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const { data, unread } = JSON.parse(cached)
        setNotifications(data)
        setUnreadCount(unread)
      }
    } catch {}
    fetchPage(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Realtime: ONLY tracks unreadCount — no full list subscription
  useEffect(() => {
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      channelRef.current = supabase
        .channel(`notif:${user.id}`)
        .on(
          'postgres_changes',
          {
            event:  'INSERT',
            schema: 'public',
            table:  'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Only update badge — drawer fetches on open
            setUnreadCount(prev => prev + 1)
          }
        )
        .subscribe()
    }

    setupRealtime()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchPage = useCallback(async (pageNum: number, reset = false) => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/notifications?page=${pageNum}&limit=${PAGE_SIZE}`)
      const data = await res.json()

      const newNotifs: Notification[] = data.notifications ?? []
      const unread = newNotifs.filter(n => !n.read).length

      setNotifications(prev => reset ? newNotifs : [...prev, ...newNotifs])
      setHasMore(data.hasMore ?? false)
      setPage(pageNum)

      if (reset) {
        setUnreadCount(unread)
        // Update cache
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: newNotifs, unread }))
        } catch {}
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMore = useCallback(() => {
    if (!loading && hasMore) fetchPage(page + 1)
  }, [loading, hasMore, page, fetchPage])

  const refresh = useCallback(() => fetchPage(1, true), [fetchPage])

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
  }, [])

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    await fetch('/api/notifications/mark-all-read', { method: 'POST' })
  }, [])

  return { notifications, unreadCount, loading, hasMore, loadMore, markAsRead, markAllAsRead, refresh }
}
