"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, Send, Loader2, ChevronLeft, Tag } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createBrowserClient } from "@supabase/ssr"

type Ticket = {
  id: string
  ticket_number: string
  user_id: string | null
  email: string
  name: string
  subject: string
  category: string | null
  priority: string | null
  status: string
  created_at: string
  updated_at: string
}

type Message = {
  id: string
  ticket_id: string
  sender_type: string
  sender_id: string | null
  sender_name: string
  content: string
  created_at: string
}

function priorityColor(p: string | null) {
  switch (p) {
    case "high": return "bg-red-500/15 text-red-400"
    case "medium": return "bg-amber-500/15 text-amber-400"
    case "low": return "bg-emerald-500/15 text-emerald-400"
    default: return "bg-admin-bg text-admin-muted"
  }
}

function statusColor(s: string) {
  switch (s) {
    case "open": return "bg-amber-500/15 text-amber-400"
    case "resolved": return "bg-emerald-500/15 text-emerald-400"
    case "in_progress": return "bg-blue-500/15 text-blue-400"
    case "closed": return "bg-admin-bg text-admin-muted"
    default: return "bg-admin-bg text-admin-muted"
  }
}

const STATUSES = ["open", "in_progress", "resolved", "closed"]

export function ContactsClient({ tickets }: { tickets: Ticket[] }) {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [currentTickets, setCurrentTickets] = useState<Ticket[]>(tickets)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadMessages = useCallback(async (ticketId: string) => {
    setLoadingMessages(true)
    const res = await fetch(`/api/admin/tickets/${ticketId}/messages`)
    const data = await res.json()
    setMessages(data.messages ?? [])
    setLoadingMessages(false)
  }, [])

  // Initial load when ticket is selected
  useEffect(() => {
    if (selected) {
      loadMessages(selected.id)
    }
  }, [selected, loadMessages])

  // Real-time subscription — only updates the chatbox, no full page reload
  useEffect(() => {
    if (!selected) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel = supabase
      .channel(`ticket-messages-${selected.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${selected.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            // Deduplicate: skip if this message id already exists
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selected?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim() || !selected) return
    setSending(true)

    const res = await fetch(`/api/admin/tickets/${selected.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: reply }),
    })

    const data = await res.json()
    if (res.ok) {
      setReply("")
      // Real-time subscription will append the new message automatically.
      // We still add it here as a fallback in case the realtime event
      // arrives before the optimistic update — deduplication handles overlap.
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev
        return [...prev, data.message]
      })
    } else {
      showToast(data.error ?? "Failed to send", "error")
    }
    setSending(false)
  }

  async function handleStatusChange(newStatus: string) {
    if (!selected) return
    setUpdatingStatus(true)

    const res = await fetch(`/api/admin/tickets/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })

    setUpdatingStatus(false)
    if (res.ok) {
      const updatedTicket = { ...selected, status: newStatus }
      setSelected(updatedTicket)
      setCurrentTickets((prev) => prev.map((t) => (t.id === selected.id ? updatedTicket : t)))
      showToast("Status updated", "success")
    } else {
      showToast("Failed to update status", "error")
    }
  }

  const filtered = currentTickets.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.ticket_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="h-screen flex flex-col">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.type === "success" ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400" : "bg-red-500/15 border border-red-500/30 text-red-400"}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Ticket List Panel */}
        <div className={cn(
          "w-full md:w-80 lg:w-96 border-r border-admin-border flex flex-col bg-admin-bg flex-shrink-0",
          selected ? "hidden md:flex" : "flex"
        )}>
          {/* Header */}
          <div className="p-5 border-b border-admin-border">
            <h1 className="text-xl font-bold text-admin-foreground mb-3">Contacts</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tickets..."
                className="pl-9 bg-admin-card border-admin-border text-admin-foreground placeholder:text-admin-muted/50 h-9"
              />
            </div>
          </div>

          {/* Ticket list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="flex items-center justify-center h-32 text-admin-muted text-sm">
                No tickets found
              </div>
            )}
            {filtered.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelected(ticket)}
                className={cn(
                  "w-full text-left p-4 border-b border-admin-border/50 hover:bg-admin-card/60 transition-colors",
                  selected?.id === ticket.id && "bg-admin-card border-l-2 border-l-admin-accent"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-admin-foreground text-sm font-medium truncate flex-1">{ticket.subject}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </div>
                <p className="text-admin-muted text-xs truncate">{ticket.name} · {ticket.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-admin-muted text-xs">#{ticket.ticket_number}</span>
                  {ticket.priority && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${priorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  )}
                  <span className="text-admin-muted text-xs ml-auto">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Panel */}
        {selected ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Chat header */}
            <div className="p-4 border-b border-admin-border bg-admin-card flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setSelected(null)}
                className="md:hidden text-admin-muted hover:text-admin-foreground"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-admin-foreground font-semibold truncate">{selected.subject}</p>
                <p className="text-admin-muted text-xs">{selected.name} · {selected.email} · #{selected.ticket_number}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {selected.category && (
                  <span className="hidden sm:flex items-center gap-1 text-xs bg-admin-bg border border-admin-border text-admin-muted px-2 py-1 rounded-lg">
                    <Tag className="w-3 h-3" />
                    {selected.category}
                  </span>
                )}
                <div className="relative">
                  <select
                    value={selected.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={updatingStatus}
                    className={cn(
                      "text-xs px-2.5 py-1.5 rounded-lg font-medium border-0 outline-none cursor-pointer appearance-none pr-6",
                      statusColor(selected.status)
                    )}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s} className="bg-admin-card text-admin-foreground">{s}</option>
                    ))}
                  </select>
                  {updatingStatus && <Loader2 className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin" />}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center flex-1">
                  <Loader2 className="w-5 h-5 animate-spin text-admin-muted" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center flex-1 text-admin-muted text-sm">
                  No messages yet. Start the conversation.
                </div>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.sender_type === "admin"
                  return (
                    <div
                      key={msg.id}
                      className={cn("flex", isAdmin ? "justify-end" : "justify-start")}
                    >
                      <div className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2.5",
                        isAdmin
                          ? "bg-admin-accent text-white rounded-br-sm"
                          : "bg-admin-card border border-admin-border text-admin-foreground rounded-bl-sm"
                      )}>
                        <p className={cn("text-xs font-medium mb-1", isAdmin ? "text-white/70" : "text-admin-muted")}>
                          {msg.sender_name}
                        </p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <p className={cn("text-xs mt-1.5", isAdmin ? "text-white/50" : "text-admin-muted")}>
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Reply box */}
            <div className="p-4 border-t border-admin-border bg-admin-card flex-shrink-0">
              <form onSubmit={handleSendReply} className="flex gap-3 items-end">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendReply(e as unknown as React.FormEvent)
                    }
                  }}
                  placeholder="Type a reply... (Enter to send, Shift+Enter for new line)"
                  rows={2}
                  className="flex-1 bg-admin-bg border border-admin-border text-admin-foreground placeholder:text-admin-muted/50 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-admin-accent transition-colors"
                />
                <Button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  className="bg-admin-accent hover:bg-admin-accent/90 text-white h-10 px-4"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-admin-card border border-admin-border flex items-center justify-center mx-auto mb-4">
                <Search className="w-7 h-7 text-admin-muted" />
              </div>
              <p className="text-admin-foreground font-medium">Select a ticket</p>
              <p className="text-admin-muted text-sm mt-1">Choose a support ticket to view the conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
