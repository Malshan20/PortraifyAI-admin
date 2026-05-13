import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const service = createServiceClient()
  const { data } = await service
    .from("admin_users")
    .select("id")
    .eq("id", user.id)
    .single()

  if (!data) {
    return NextResponse.json({ error: "Not an admin" }, { status: 403 })
  }

  return NextResponse.json({ ok: true })
}
