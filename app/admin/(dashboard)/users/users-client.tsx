"use client"

import { useState } from "react"
import { Search, Pencil, X, Loader2, Mail, User, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

type UserRow = {
  id: string
  full_name: string | null
  email: string
  credits: number | null
  plan: string | null
  created_at: string
}

type EditingUser = UserRow & { newName: string; newEmail: string }

export function UsersClient({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<EditingUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const filtered = users.filter(
    (u) =>
      (u.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.plan ?? "").toLowerCase().includes(search.toLowerCase())
  )

  async function handleSaveName() {
    if (!editing) return
    setSaving(true)
    const res = await fetch(`/api/admin/users/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: editing.newName }),
    })
    setSaving(false)
    if (res.ok) {
      showToast("Name updated successfully", "success")
      setEditing(null)
      window.location.reload()
    } else {
      const d = await res.json()
      showToast(d.error ?? "Failed to update name", "error")
    }
  }

  async function handleSendEmailChange() {
    if (!editing) return
    setSendingEmail(true)
    const res = await fetch(`/api/admin/users/${editing.id}/email-change`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_email: editing.newEmail }),
    })
    setSendingEmail(false)
    const d = await res.json()
    if (res.ok) {
      showToast("Email change link sent to the new address", "success")
      setEditing(null)
    } else {
      showToast(d.error ?? "Failed to send email change", "error")
    }
  }

  return (
    <div className="p-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
              : "bg-red-500/15 border border-red-500/30 text-red-400"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-admin-foreground">Users</h1>
        <p className="text-admin-muted text-sm mt-1">{users.length} total users</p>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="pl-9 bg-admin-card border-admin-border text-admin-foreground placeholder:text-admin-muted/50"
        />
      </div>

      {/* Table */}
      <div className="bg-admin-card border border-admin-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-border">
                <th className="text-left px-5 py-3 text-admin-muted font-medium">User</th>
                <th className="text-left px-5 py-3 text-admin-muted font-medium">Plan</th>
                <th className="text-left px-5 py-3 text-admin-muted font-medium">Credits</th>
                <th className="text-left px-5 py-3 text-admin-muted font-medium">Joined</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-admin-muted">No users found</td>
                </tr>
              )}
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-admin-border/50 hover:bg-admin-bg/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-admin-accent/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-admin-accent text-xs font-semibold">
                          {(user.full_name ?? user.email ?? "?")[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-admin-foreground font-medium">{user.full_name ?? "—"}</p>
                        <p className="text-admin-muted text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        user.plan === "pro"
                          ? "bg-admin-accent/15 text-admin-accent"
                          : user.plan === "enterprise"
                          ? "bg-purple-500/15 text-purple-400"
                          : "bg-admin-bg text-admin-muted"
                      }`}
                    >
                      {user.plan ?? "free"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-admin-foreground">{user.credits ?? 0}</td>
                  <td className="px-5 py-3.5 text-admin-muted text-xs">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() =>
                        setEditing({ ...user, newName: user.full_name ?? "", newEmail: user.email })
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
          <div className="bg-admin-card border border-admin-border rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-admin-foreground font-semibold">Edit User</h2>
              <button
                onClick={() => setEditing(null)}
                className="text-admin-muted hover:text-admin-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-5">
              {/* Name */}
              <div>
                <Label className="text-admin-muted text-sm mb-1.5 block">Full name</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
                    <Input
                      value={editing.newName}
                      onChange={(e) => setEditing({ ...editing, newName: e.target.value })}
                      className="pl-9 bg-admin-bg border-admin-border text-admin-foreground"
                    />
                  </div>
                  <Button
                    onClick={handleSaveName}
                    disabled={saving || editing.newName === editing.full_name}
                    size="sm"
                    className="bg-admin-accent hover:bg-admin-accent/90 text-white"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Email change */}
              <div>
                <Label className="text-admin-muted text-sm mb-1.5 block">Change email</Label>
                <p className="text-admin-muted text-xs mb-2">
                  Current: <span className="text-admin-foreground">{editing.email}</span>
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
                    <Input
                      value={editing.newEmail}
                      onChange={(e) => setEditing({ ...editing, newEmail: e.target.value })}
                      type="email"
                      placeholder="new@email.com"
                      className="pl-9 bg-admin-bg border-admin-border text-admin-foreground placeholder:text-admin-muted/50"
                    />
                  </div>
                  <Button
                    onClick={handleSendEmailChange}
                    disabled={sendingEmail || editing.newEmail === editing.email || !editing.newEmail}
                    size="sm"
                    variant="outline"
                    className="border-admin-border text-admin-foreground hover:bg-admin-bg whitespace-nowrap"
                  >
                    {sendingEmail ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Send link"
                    )}
                  </Button>
                </div>
                <p className="text-admin-muted text-xs mt-1.5">
                  An email confirmation will be sent to the new address.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
