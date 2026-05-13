import { createServiceClient } from "@/lib/supabase/server"
import { Users, CreditCard, MessageSquare, Image, TrendingUp, Clock } from "lucide-react"

async function getDashboardStats() {
  const supabase = createServiceClient()

  const [
    { count: totalUsers },
    { count: totalHeadshots },
    { count: openTickets },
    { count: activeSubscriptions },
    { data: recentUsers },
    { data: recentTickets },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("headshots").select("*", { count: "exact", head: true }),
    supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("stripe_customers").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("support_tickets")
      .select("id, ticket_number, name, subject, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  return {
    totalUsers: totalUsers ?? 0,
    totalHeadshots: totalHeadshots ?? 0,
    openTickets: openTickets ?? 0,
    activeSubscriptions: activeSubscriptions ?? 0,
    recentUsers: recentUsers ?? [],
    recentTickets: recentTickets ?? [],
  }
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number
  icon: React.ElementType
  accent: string
}) {
  return (
    <div className="bg-admin-card border border-admin-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-admin-muted text-sm font-medium">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-admin-foreground">{value.toLocaleString()}</p>
    </div>
  )
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-admin-foreground">Dashboard</h1>
        <p className="text-admin-muted text-sm mt-1">Overview of PortraifyAI activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={stats.totalUsers} icon={Users} accent="bg-blue-500" />
        <StatCard label="Active Subscriptions" value={stats.activeSubscriptions} icon={CreditCard} accent="bg-admin-accent" />
        <StatCard label="Total Headshots" value={stats.totalHeadshots} icon={Image} accent="bg-emerald-500" />
        <StatCard label="Open Tickets" value={stats.openTickets} icon={MessageSquare} accent="bg-amber-500" />
      </div>

      {/* Recent rows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-admin-card border border-admin-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-admin-accent" />
            <h2 className="text-admin-foreground font-semibold text-sm">Recent Signups</h2>
          </div>
          <div className="flex flex-col gap-3">
            {stats.recentUsers.length === 0 && (
              <p className="text-admin-muted text-sm py-4 text-center">No users yet</p>
            )}
            {stats.recentUsers.map((u: { id: string; full_name: string | null; created_at: string }) => (
              <div key={u.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-admin-accent/20 flex items-center justify-center">
                    <span className="text-admin-accent text-xs font-semibold">
                      {(u.full_name ?? "?")[0]?.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-admin-foreground text-sm">{u.full_name ?? "Unknown"}</span>
                </div>
                <span className="text-admin-muted text-xs">
                  {new Date(u.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="bg-admin-card border border-admin-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-amber-400" />
            <h2 className="text-admin-foreground font-semibold text-sm">Recent Support Tickets</h2>
          </div>
          <div className="flex flex-col gap-3">
            {stats.recentTickets.length === 0 && (
              <p className="text-admin-muted text-sm py-4 text-center">No tickets yet</p>
            )}
            {stats.recentTickets.map((t: { id: string; ticket_number: string; name: string; subject: string; status: string; created_at: string }) => (
              <div key={t.id} className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-admin-foreground text-sm font-medium truncate">{t.subject}</p>
                  <p className="text-admin-muted text-xs">{t.name} · #{t.ticket_number}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    t.status === "open"
                      ? "bg-amber-500/15 text-amber-400"
                      : t.status === "resolved"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-admin-accent/15 text-admin-accent"
                  }`}
                >
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
