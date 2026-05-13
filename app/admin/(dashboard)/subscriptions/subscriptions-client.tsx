"use client"

import { useState } from "react"
import { Search, Pencil, X, Loader2, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

type SubRow = {
  id: string
  user_id: string
  customer_id: string
  subscription_id: string | null
  price_id: string | null
  plan: string | null
  status: string | null
  current_period_end: string | null
  created_at: string
  full_name: string
  email: string
}

const PLANS = ["free", "pro", "business"]
const STATUSES = ["active", "canceled", "past_due", "trialing", "incomplete"]

export function SubscriptionsClient({ subscriptions }: { subscriptions: SubRow[] }) {
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<(SubRow & { newPlan: string; newStatus: string; newCredits: string }) | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const filtered = subscriptions.filter(
    (s) =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.plan ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.status ?? "").toLowerCase().includes(search.toLowerCase())
  )

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    const res = await fetch(`/api/admin/subscriptions/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: editing.newPlan,
        status: editing.newStatus,
      }),
    })

    // Also update profile plan & credits
    await fetch(`/api/admin/users/${editing.user_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: editing.newPlan,
        credits: editing.newCredits ? parseInt(editing.newCredits) : undefined,
      }),
    })

    setSaving(false)
    if (res.ok) {
      showToast("Subscription updated", "success")
      setEditing(null)
      window.location.reload()
    } else {
      const d = await res.json()
      showToast(d.error ?? "Update failed", "error")
    }
  }

  function statusColor(status: string | null) {
    switch (status) {
      case "active": return "bg-emerald-500/15 text-emerald-400"
      case "canceled": return "bg-red-500/15 text-red-400"
      case "past_due": return "bg-amber-500/15 text-amber-400"
      case "trialing": return "bg-blue-500/15 text-blue-400"
      default: return "bg-admin-bg text-admin-muted"
    }
  }

  function planColor(plan: string | null) {
    switch (plan) {
      case "pro": return "bg-admin-accent/15 text-admin-accent"
      case "business": return "bg-cyan-500/15 text-cyan-400"
      case "free": return "bg-admin-bg text-admin-muted border border-admin-border"
      default: return "bg-admin-bg text-admin-muted"
    }
  }

  return (
    <div className="p-8">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.type === "success" ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400" : "bg-red-500/15 border border-red-500/30 text-red-400"}`}>
          {toast.msg}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-admin-foreground">Subscriptions</h1>
        <p className="text-admin-muted text-sm mt-1">{subscriptions.length} subscription records</p>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search subscriptions..."
          className="pl-9 bg-admin-card border-admin-border text-admin-foreground placeholder:text-admin-muted/50"
        />
      </div>

      <div className="bg-admin-card border border-admin-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-border">
                <th className="text-left px-5 py-3 text-admin-muted font-medium">User</th>
                <th className="text-left px-5 py-3 text-admin-muted font-medium">Plan</th>
                <th className="text-left px-5 py-3 text-admin-muted font-medium">Status</th>
                <th className="text-left px-5 py-3 text-admin-muted font-medium">Renews</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-admin-muted">No subscriptions found</td>
                </tr>
              )}
              {filtered.map((sub) => (
                <tr key={sub.id} className="border-b border-admin-border/50 hover:bg-admin-bg/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-admin-foreground font-medium">{sub.full_name}</p>
                      <p className="text-admin-muted text-xs">{sub.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${planColor(sub.plan)}`}>
                      {sub.plan ?? "free"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor(sub.status)}`}>
                      {sub.status ?? "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-admin-muted text-xs">
                    {sub.current_period_end
                      ? new Date(sub.current_period_end).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() =>
                        setEditing({ ...sub, newPlan: sub.plan ?? "free", newStatus: sub.status ?? "active", newCredits: "" })
                      }
                      className="p-1.5 rounded-lg text-admin-muted hover:text-admin-foreground hover:bg-admin-bg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-admin-card border border-admin-border rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-admin-foreground font-semibold">Edit Subscription</h2>
                <p className="text-admin-muted text-xs mt-0.5">{editing.full_name}</p>
              </div>
              <button onClick={() => setEditing(null)} className="text-admin-muted hover:text-admin-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <Label className="text-admin-muted text-sm mb-1.5 block">Plan</Label>
                <select
                  value={editing.newPlan}
                  onChange={(e) => setEditing({ ...editing, newPlan: e.target.value })}
                  className="w-full bg-admin-bg border border-admin-border text-admin-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-admin-accent"
                >
                  {PLANS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-admin-muted text-sm mb-1.5 block">Status</Label>
                <select
                  value={editing.newStatus}
                  onChange={(e) => setEditing({ ...editing, newStatus: e.target.value })}
                  className="w-full bg-admin-bg border border-admin-border text-admin-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-admin-accent"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-admin-muted text-sm mb-1.5 block">Override credits (optional)</Label>
                <Input
                  type="number"
                  min={0}
                  value={editing.newCredits}
                  onChange={(e) => setEditing({ ...editing, newCredits: e.target.value })}
                  placeholder="Leave blank to keep current"
                  className="bg-admin-bg border-admin-border text-admin-foreground placeholder:text-admin-muted/50"
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-admin-accent hover:bg-admin-accent/90 text-white mt-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
