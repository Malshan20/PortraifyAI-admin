import { createServiceClient } from "@/lib/supabase/server"
import { UsersClient } from "./users-client"

async function getUsers() {
  const supabase = createServiceClient()

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, credits, plan, created_at, updated_at")
    .order("created_at", { ascending: false })

  // Fetch auth emails from admin endpoint
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 })

  const emailMap: Record<string, string> = {}
  if (authUsers?.users) {
    for (const u of authUsers.users) {
      emailMap[u.id] = u.email ?? ""
    }
  }

  return (profiles ?? []).map((p) => ({
    ...p,
    email: emailMap[p.id] ?? "",
  }))
}

export default async function UsersPage() {
  const users = await getUsers()
  return <UsersClient users={users} />
}
