"use client"

import { useEffect, useState, useCallback } from "react"
import { createBrowserClient } from "@supabase/ssr"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import { Users, Image, MessageSquare, CreditCard, RefreshCw } from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────
type Totals = { users: number; headshots: number; tickets: number; subscriptions: number }
type TimePoint = { day: string; signups: number; headshots: number }
type PlanRow = { plan: string; count: number }
type StatusRow = { status: string; count: number }
type StyleRow = { style: string; count: number }
type CategoryRow = { category: string; count: number }
type PriorityRow = { priority: string; count: number }
type CreditRow = { plan: string; avg_credits: number; total_credits: number }

interface Props {
  totals: Totals
  timeSeries: TimePoint[]
  planDistribution: PlanRow[]
  headshotStatus: StatusRow[]
  headshotByStyle: StyleRow[]
  ticketStatus: StatusRow[]
  ticketCategory: CategoryRow[]
  ticketPriority: PriorityRow[]
  subStatus: StatusRow[]
  avgCreditsByPlan: CreditRow[]
}

// ── Colours ───────────────────────────────────────────────────────────────
const ACCENT = "#6366f1"
const PALETTE = ["#6366f1", "#22d3ee", "#a78bfa", "#34d399", "#f59e0b", "#f87171", "#fb923c", "#60a5fa"]

const PLAN_COLORS: Record<string, string> = {
  free: "#6b7280",
  pro: "#6366f1",
  business: "#22d3ee",
}

const STATUS_COLORS: Record<string, string> = {
  active: "#34d399",
  canceled: "#f87171",
  past_due: "#f59e0b",
  trialing: "#60a5fa",
  open: "#6366f1",
  in_progress: "#f59e0b",
  resolved: "#34d399",
  closed: "#6b7280",
  completed: "#34d399",
  failed: "#f87171",
  pending: "#f59e0b",
  processing: "#60a5fa",
  unknown: "#6b7280",
}

// ── Tooltip styles ────────────────────────────────────────────────────────
const tooltipStyle = {
  backgroundColor: "#13161e",
  border: "1px solid #1e2230",
  borderRadius: "12px",
  color: "#f0f2f8",
  fontSize: 12,
}
const labelStyle = { color: "#6b7280", fontWeight: 600 }

// ── Helpers ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: number; sub?: string }) {
  return (
    <div className="bg-admin-card border border-admin-border rounded-2xl p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-admin-accent/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-admin-accent" />
      </div>
      <div>
        <p className="text-admin-muted text-xs font-medium">{label}</p>
        <p className="text-admin-foreground text-2xl font-bold mt-0.5">{value.toLocaleString()}</p>
        {sub && <p className="text-admin-muted text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-admin-card border border-admin-border rounded-2xl p-5 ${className ?? ""}`}>
      <h3 className="text-admin-foreground font-semibold text-sm mb-4">{title}</h3>
      {children}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export function AnalyticsClient(initial: Props) {
  const [data, setData] = useState<Props>(initial)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch("/api/admin/analytics", { cache: "no-store" })
      if (res.ok) {
        const json = await res.json()
        setData((prev) => ({ ...prev, ...json }))
        setLastUpdated(new Date())
      }
    } finally {
      setRefreshing(false)
    }
  }, [])

  // Real-time: listen to INSERT/UPDATE on key tables and refresh aggregates
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const tables = ["profiles", "headshots", "support_tickets", "stripe_customers"]
    const channels = tables.map((table) =>
      supabase
        .channel(`analytics-${table}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, () => {
          refresh()
        })
        .subscribe()
    )

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch))
    }
  }, [refresh])

  const {
    totals,
    timeSeries,
    planDistribution,
    headshotStatus,
    headshotByStyle,
    ticketStatus,
    ticketCategory,
    ticketPriority,
    subStatus,
    avgCreditsByPlan,
  } = data

  // Filter time series to only show days with activity for readability
  const activeTimeSeries = timeSeries.filter((d) => d.signups > 0 || d.headshots > 0)
  const displayTimeSeries = activeTimeSeries.length >= 2 ? activeTimeSeries : timeSeries.slice(-14)

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-admin-foreground">Analytics</h1>
          <p className="text-admin-muted text-sm mt-1">
            Real-time data &mdash; last updated {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-admin-card border border-admin-border rounded-xl text-admin-muted hover:text-admin-foreground hover:border-admin-accent/50 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Total Users" value={totals.users} />
        <StatCard icon={Image} label="Total Headshots" value={totals.headshots} />
        <StatCard icon={MessageSquare} label="Support Tickets" value={totals.tickets} />
        <StatCard icon={CreditCard} label="Subscriptions" value={totals.subscriptions} />
      </div>

      {/* Row 1: Area chart — signups + headshots over time */}
      <div className="mb-6">
        <ChartCard title="Signups & Headshots — Last 30 Days">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={displayTimeSeries} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradSignups" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ACCENT} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradHeadshots" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2230" />
              <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280" }} />
              <Area type="monotone" dataKey="signups" name="Signups" stroke={ACCENT} strokeWidth={2} fill="url(#gradSignups)" dot={false} />
              <Area type="monotone" dataKey="headshots" name="Headshots" stroke="#22d3ee" strokeWidth={2} fill="url(#gradHeadshots)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2: Plan pie + Subscription status pie */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <ChartCard title="Users by Plan">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={planDistribution}
                dataKey="count"
                nameKey="plan"
                cx="50%"
                cy="50%"
                outerRadius={75}
                innerRadius={42}
                paddingAngle={3}
                label={({ plan, percent }) => `${plan} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {planDistribution.map((entry, i) => (
                  <Cell key={entry.plan} fill={PLAN_COLORS[entry.plan] ?? PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {planDistribution.map((e, i) => (
              <div key={e.plan} className="flex items-center gap-1.5 text-xs text-admin-muted">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PLAN_COLORS[e.plan] ?? PALETTE[i % PALETTE.length] }} />
                <span className="capitalize">{e.plan}</span>
                <span className="text-admin-foreground font-semibold">({e.count})</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Subscription Status">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={subStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={75}
                innerRadius={42}
                paddingAngle={3}
                label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {subStatus.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#6b7280"} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {subStatus.map((e) => (
              <div key={e.status} className="flex items-center gap-1.5 text-xs text-admin-muted">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[e.status] ?? "#6b7280" }} />
                <span className="capitalize">{e.status}</span>
                <span className="text-admin-foreground font-semibold">({e.count})</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Ticket Status">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={ticketStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={75}
                innerRadius={42}
                paddingAngle={3}
                label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {ticketStatus.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#6b7280"} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {ticketStatus.map((e) => (
              <div key={e.status} className="flex items-center gap-1.5 text-xs text-admin-muted">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[e.status] ?? "#6b7280" }} />
                <span className="capitalize">{e.status}</span>
                <span className="text-admin-foreground font-semibold">({e.count})</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Row 3: Bar charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Ticket Categories">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ticketCategory} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2230" />
              <XAxis dataKey="category" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
              <Bar dataKey="count" name="Tickets" radius={[6, 6, 0, 0]}>
                {ticketCategory.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Ticket Priority">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ticketPriority} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2230" />
              <XAxis dataKey="priority" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
              <Bar dataKey="count" name="Tickets" radius={[6, 6, 0, 0]}>
                {ticketPriority.map((entry) => (
                  <Cell
                    key={entry.priority}
                    fill={
                      entry.priority === "urgent" ? "#f87171"
                      : entry.priority === "high" ? "#f59e0b"
                      : entry.priority === "low" ? "#34d399"
                      : ACCENT
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 4: Headshot status + style bar + credits radial */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <ChartCard title="Headshot Status">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={headshotStatus} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2230" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="status" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
              <Bar dataKey="count" name="Headshots" radius={[0, 6, 6, 0]}>
                {headshotStatus.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? ACCENT} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {headshotByStyle.length > 0 ? (
          <ChartCard title="Headshots by Style">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={headshotByStyle} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2230" />
                <XAxis dataKey="style" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                <Bar dataKey="count" name="Headshots" radius={[6, 6, 0, 0]}>
                  {headshotByStyle.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartCard title="Headshots by Style">
            <div className="flex items-center justify-center h-48 text-admin-muted text-sm">No style data yet</div>
          </ChartCard>
        )}

        <ChartCard title="Avg Credits by Plan">
          <ResponsiveContainer width="100%" height={200}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={90}
              barSize={14}
              data={avgCreditsByPlan.map((r, i) => ({
                ...r,
                fill: PLAN_COLORS[r.plan] ?? PALETTE[i % PALETTE.length],
              }))}
            >
              <RadialBar
                dataKey="avg_credits"
                nameKey="plan"
                cornerRadius={6}
                label={{ position: "insideStart", fill: "#f0f2f8", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={labelStyle}
                formatter={(val, _name, props) => [`${val} avg credits`, props.payload.plan]}
              />
              <Legend
                iconSize={10}
                formatter={(value) => <span style={{ color: "#6b7280", fontSize: 12 }}>{value}</span>}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 5: Total credits by plan bar */}
      {avgCreditsByPlan.length > 0 && (
        <div className="mb-6">
          <ChartCard title="Total Credits Distributed by Plan">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={avgCreditsByPlan} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2230" />
                <XAxis dataKey="plan" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                <Bar dataKey="total_credits" name="Total Credits" radius={[6, 6, 0, 0]}>
                  {avgCreditsByPlan.map((entry, i) => (
                    <Cell key={entry.plan} fill={PLAN_COLORS[entry.plan] ?? PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  )
}
