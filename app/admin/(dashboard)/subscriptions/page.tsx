import { createServiceClient } from "@/lib/supabase/server"
import { SubscriptionsClient } from "./subscriptions-client"

async function getSubscriptions() {
  const supabase = createServiceClient()

  const { data: subs } = await supabase
    .from("stripe_customers")
    .select("id, user_id, customer_id, subscription_id, price_id, plan, status, current_period_end, created_at, updated_at")
    .order("created_at", { ascending: false })

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")

  const profileMap: Record<string, string> = {}
  for (const p of profiles ?? []) {
    profileMap[p.id] = p.full_name ?? "Unknown"
  }

  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const emailMap: Record<string, string> = {}
  for (const u of authUsers?.users ?? []) {
    emailMap[u.id] = u.email ?? ""
  }

  return (subs ?? []).map((s) => ({
    ...s,
    full_name: profileMap[s.user_id] ?? "Unknown",
    email: emailMap[s.user_id] ?? "",
  }))
}

export default async function SubscriptionsPage() {
  const subscriptions = await getSubscriptions()
  return <SubscriptionsClient subscriptions={subscriptions} />
}
