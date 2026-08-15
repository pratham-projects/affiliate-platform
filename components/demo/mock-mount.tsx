"use client"

// Mounted once from app/layout.tsx. Module scope runs at import time, before
// any child effect fires, so the fetch patch and the auto-login are both in
// place before AuthProvider's own mount effect checks for a session.

import { installMockApi } from "@/mock/install"
import { ensureAutoLogin } from "@/mock/auto-auth"

installMockApi()
ensureAutoLogin()

export function MockMount() {
  return null
}
