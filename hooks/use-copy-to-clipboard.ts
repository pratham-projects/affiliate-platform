"use client"

import { useState, useCallback, useRef } from "react"

interface UseCopyToClipboardReturn {
  copyToClipboard: (text: string) => Promise<boolean>
  isCopied: boolean
}

export function useCopyToClipboard(resetDelay: number = 2000): UseCopyToClipboardReturn {
  const [isCopied, setIsCopied] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Debug logging
    const isSecure = typeof window !== "undefined" && window.isSecureContext
    const hasClipboardAPI = typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function"
    
    console.log("[Clipboard Debug]", {
      isSecureContext: isSecure,
      hasClipboardAPI,
      protocol: typeof window !== "undefined" ? window.location.protocol : "unknown",
      textLength: text.length,
    })

    // Method 1: Modern Clipboard API (requires secure context or localhost)
    if (hasClipboardAPI) {
      try {
        await navigator.clipboard.writeText(text)
        console.log("[Clipboard] Success via Clipboard API")
        setIsCopied(true)
        timeoutRef.current = setTimeout(() => setIsCopied(false), resetDelay)
        return true
      } catch (err) {
        console.warn("[Clipboard] Clipboard API failed, trying fallback:", err)
      }
    }

    // Method 2: Fallback using execCommand (works on HTTP, older browsers, iframes)
    try {
      const success = fallbackCopyToClipboard(text)
      if (success) {
        console.log("[Clipboard] Success via execCommand fallback")
        setIsCopied(true)
        timeoutRef.current = setTimeout(() => setIsCopied(false), resetDelay)
        return true
      }
    } catch (err) {
      console.error("[Clipboard] Fallback also failed:", err)
    }

    // Method 3: Last resort - prompt user to copy manually
    console.error("[Clipboard] All methods failed")
    setIsCopied(false)
    return false
  }, [resetDelay])

  return { copyToClipboard, isCopied }
}

function fallbackCopyToClipboard(text: string): boolean {
  // Create textarea element
  const textArea = document.createElement("textarea")
  textArea.value = text

  // Prevent scrolling to bottom of page on iOS
  textArea.style.top = "0"
  textArea.style.left = "0"
  textArea.style.position = "fixed"
  textArea.style.width = "2em"
  textArea.style.height = "2em"
  textArea.style.padding = "0"
  textArea.style.border = "none"
  textArea.style.outline = "none"
  textArea.style.boxShadow = "none"
  textArea.style.background = "transparent"
  // Ensure it's not visible
  textArea.style.opacity = "0"
  textArea.style.pointerEvents = "none"
  // Prevent zoom on iOS
  textArea.style.fontSize = "16px"
  // Ensure it's in the viewport
  textArea.setAttribute("readonly", "")
  textArea.setAttribute("contenteditable", "true")

  document.body.appendChild(textArea)

  let success = false

  try {
    // iOS specific handling
    if (isIOS()) {
      const range = document.createRange()
      range.selectNodeContents(textArea)
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(range)
      }
      textArea.setSelectionRange(0, text.length)
    } else {
      textArea.focus()
      textArea.select()
      textArea.setSelectionRange(0, text.length)
    }

    success = document.execCommand("copy")
  } catch (err) {
    console.error("[Clipboard Fallback] execCommand error:", err)
    success = false
  } finally {
    document.body.removeChild(textArea)
  }

  return success
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
}

// Standalone function for use outside React components
export async function copyText(text: string): Promise<boolean> {
  const isSecure = typeof window !== "undefined" && window.isSecureContext
  const hasClipboardAPI = typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function"

  // Try Clipboard API first
  if (hasClipboardAPI) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.warn("[copyText] Clipboard API failed:", err)
    }
  }

  // Fallback
  return fallbackCopyToClipboard(text)
}
