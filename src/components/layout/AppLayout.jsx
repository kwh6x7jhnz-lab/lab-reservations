import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function AppLayout() {
  const [pendingCount, setPendingCount] = useState(0)
  const { isApprover } = useAuth()

  useEffect(() => {
    if (!isApprover) return
    async function fetchPending() {
      const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      setPendingCount(count || 0)
    }
    fetchPending()
    const channel = supabase.channel('pending-bookings').on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchPending).subscribe()
    return () => supabase.removeChannel(channel)
  }, [isApprover])

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar pendingCount={pendingCount} />
      <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  )
}
