import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = createServiceClient()
  const { data } = await service.from("admin_users").select("id").eq("id", user.id).single()
  return data ? user : null
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { full_name, plan, credits } = body

  const service = createServiceClient()

  const profileUpdate: Record<string, unknown> = {}
  if (full_name !== undefined) profileUpdate.full_name = full_name
  if (plan !== undefined) profileUpdate.plan = plan
  if (credits !== undefined) profileUpdate.credits = credits

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await service
      .from("profiles")
      .update(profileUpdate)
      .eq("id", id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
