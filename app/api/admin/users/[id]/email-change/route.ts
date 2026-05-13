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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { new_email } = await request.json()

  if (!new_email) {
    return NextResponse.json({ error: "new_email is required" }, { status: 400 })
  }

  const service = createServiceClient()

  // Use admin API to update the user's email directly
  const { error } = await service.auth.admin.updateUserById(id, {
    email: new_email,
    email_confirm: false, // will send confirmation email
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
