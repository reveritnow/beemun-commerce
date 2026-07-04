"use client"

import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_STOREFRONT_URL ||
    (typeof window !== "undefined" ? window.location.origin : undefined),
})
