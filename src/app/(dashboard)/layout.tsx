import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/ui/Sidebar'
import Header from '@/components/ui/Header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8FAFC' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header profile={profile} />
        <main className="flex-1 overflow-auto" style={{ background: '#F8FAFC' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
