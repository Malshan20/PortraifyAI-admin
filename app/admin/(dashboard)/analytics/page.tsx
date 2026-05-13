import { createServiceClient } from "@/lib/supabase/server"
import { AnalyticsClient } from "./analytics-client"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function AnalyticsPage() {
  // Auth guard
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/admin/login")
  const db = createServiceClient()
  const { data: adminCheck } = await db.from("admin_users").select("id").eq("id", user.id).single()
  if (!adminCheck) redirect("/admin/login")

  // Fetch all analytics data server-side
  const [
    { count: totalUsers },
    { count: totalHeadshots },
    { count: totalTickets },
    { count: totalSubs },
    { data: profilesRaw },
    { data: headshotsRaw },
    { data: ticketsRaw },
    { data: subsRaw },
  ] = await Promise.all([
    db.from("profiles").select("*", { count: "exact", head: true }),
    db.from("headshots").select("*", { count: "exact", head: true }),
    db.from("support_tickets").select("*", { count: "exact", head: true }),
    db.from("stripe_customers").select("*", { count: "exact", head: true }),
    db.from("profiles").select("created_at, plan, credits"),
    db.from("headshots").select("created_at, status, style"),
    db.from("support_tickets").select("created_at, status, category, priority"),
    db.from("stripe_customers").select("plan, status"),
  ])

  // ── Time series: signups + headshots per day (last 30 days) ──
  const signupsByDay: Record<string, number> = {}
  for (const r of profilesRaw ?? []) {
    const day = new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    signupsByDay[day] = (signupsByDay[day] ?? 0) + 1
  }
  const headshotsByDay: Record<string, number> = {}
  for (const r of headshotsRaw ?? []) {
    const day = new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    headshotsByDay[day] = (headshotsByDay[day] ?? 0) + 1
  }
  const timeSeries = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    return { day: label, signups: signupsByDay[label] ?? 0, headshots: headshotsByDay[label] ?? 0 }
  })

  // ── Plan distribution ──
  const planMap: Record<string, number> = {}
  for (const r of profilesRaw ?? []) {
    const p = r.plan ?? "free"
    planMap[p] = (planMap[p] ?? 0) + 1
  }
  const planDistribution = Object.entries(planMap).map(([plan, count]) => ({ plan, count }))

  // ── Headshot status ──
  const hsStatusMap: Record<string, number> = {}
  for (const r of headshotsRaw ?? []) {
    const s = r.status ?? "unknown"
    hsStatusMap[s] = (hsStatusMap[s] ?? 0) + 1
  }
  const headshotStatus = Object.entries(hsStatusMap).map(([status, count]) => ({ status, count }))

  // ── Headshot style ──
  const hsStyleMap: Record<string, number> = {}
  for (const r of headshotsRaw ?? []) {
    if (r.style) hsStyleMap[r.style] = (hsStyleMap[r.style] ?? 0) + 1
  }
  const headshotByStyle = Object.entries(hsStyleMap).map(([style, count]) => ({ style, count }))

  // ── Ticket status ──
  const ticketStatusMap: Record<string, number> = {}
  for (const r of ticketsRaw ?? []) {
    const s = r.status ?? "unknown"
    ticketStatusMap[s] = (ticketStatusMap[s] ?? 0) + 1
  }
  const ticketStatus = Object.entries(ticketStatusMap).map(([status, count]) => ({ status, count }))

  // ── Ticket category ──
  const ticketCatMap: Record<string, number> = {}
  for (const r of ticketsRaw ?? []) {
    const c = r.category ?? "other"
    ticketCatMap[c] = (ticketCatMap[c] ?? 0) + 1
  }
  const ticketCategory = Object.entries(ticketCatMap).map(([category, count]) => ({ category, count }))

  // ── Ticket priority ──
  const ticketPrioMap: Record<string, number> = {}
  for (const r of ticketsRaw ?? []) {
    const p = r.priority ?? "normal"
    ticketPrioMap[p] = (ticketPrioMap[p] ?? 0) + 1
  }
  const ticketPriority = Object.entries(ticketPrioMap).map(([priority, count]) => ({ priority, count }))

  // ── Subscription status ──
  const subStatusMap: Record<string, number> = {}
  for (const r of subsRaw ?? []) {
    const s = r.status ?? "unknown"
    subStatusMap[s] = (subStatusMap[s] ?? 0) + 1
  }
  const subStatus = Object.entries(subStatusMap).map(([status, count]) => ({ status, count }))

  // ── Credits by plan ──
  const creditMap: Record<string, { total: number; count: number }> = {}
  for (const r of profilesRaw ?? []) {
    const p = r.plan ?? "free"
    if (!creditMap[p]) creditMap[p] = { total: 0, count: 0 }
    creditMap[p].total += r.credits ?? 0
    creditMap[p].count += 1
  }
  const avgCreditsByPlan = Object.entries(creditMap).map(([plan, { total, count }]) => ({
    plan,
    avg_credits: Math.round(total / count),
    total_credits: total,
  }))

  return (
    <AnalyticsClient
      totals={{
        users: totalUsers ?? 0,
        headshots: totalHeadshots ?? 0,
        tickets: totalTickets ?? 0,
        subscriptions: totalSubs ?? 0,
      }}
      timeSeries={timeSeries}
      planDistribution={planDistribution}
      headshotStatus={headshotStatus}
      headshotByStyle={headshotByStyle}
      ticketStatus={ticketStatus}
      ticketCategory={ticketCategory}
      ticketPriority={ticketPriority}
      subStatus={subStatus}
      avgCreditsByPlan={avgCreditsByPlan}
    />
  )
}
