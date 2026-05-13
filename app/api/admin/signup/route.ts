import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

const ADMIN_INVITE_CODE = process.env.ADMIN_INVITE_CODE ?? "portraify-admin-2024"

export async function POST(request: Request) {
  const body = await request.json()
  const { email, password, fullName, inviteCode } = body

  if (!email || !password || !fullName || !inviteCode) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })
  }

  if (inviteCode !== ADMIN_INVITE_CODE) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 403 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }

  const service = createServiceClient()

  // Create the auth user
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, is_admin: true },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Insert into admin_users table
  const { error: insertError } = await service
    .from("admin_users")
    .insert({ id: authData.user.id, email, full_name: fullName })

  if (insertError) {
    // Rollback auth user
    await service.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
