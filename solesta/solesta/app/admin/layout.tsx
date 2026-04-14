"use client"

import { ThemeProvider } from "./context/ThemeContext"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ThemeProvider>{children}</ThemeProvider>
}
