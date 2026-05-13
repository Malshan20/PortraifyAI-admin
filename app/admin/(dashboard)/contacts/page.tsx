import { createServiceClient } from "@/lib/supabase/server"
import { ContactsClient } from "./contacts-client"

async function getTickets() {
  const supabase = createServiceClient()

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, ticket_number, user_id, email, name, subject, category, priority, status, created_at, updated_at")
    .order("created_at", { ascending: false })

  return tickets ?? []
}

export default async function ContactsPage() {
  const tickets = await getTickets()
  return <ContactsClient tickets={tickets} />
}
