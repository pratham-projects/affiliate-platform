"use client"

import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { cn } from "@/lib/utils"

interface CopyButtonProps {
  value: string
  /** Optional label shown next to the icon (icon-only if omitted). */
  label?: string
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
  className?: string
}

/** Copy-to-clipboard button with a transient check confirmation. */
export function CopyButton({ value, label, variant = "outline", size, className }: CopyButtonProps) {
  const { copyToClipboard, isCopied } = useCopyToClipboard()
  const iconOnly = !label

  return (
    <Button
      type="button"
      variant={variant}
      size={size ?? (iconOnly ? "icon" : "default")}
      onClick={() => copyToClipboard(value)}
      className={className}
      title="Copy"
    >
      {isCopied ? <Check className={cn("size-4")} /> : <Copy className="size-4" />}
      {label && <span>{isCopied ? "Copied" : label}</span>}
      {iconOnly && <span className="sr-only">Copy</span>}
    </Button>
  )
}
