import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "PortraifyAI — Admin",
  description: "PortraifyAI administration panel",
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children
}
