"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react"
import { StatusBadge } from "@/components/common"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export interface SearchDropdownOption {
    value: string
    label: string
    description?: string
    status?: string
    details?: Record<string, string | number | boolean | null>
}

interface SearchDropdownProps {
    options?: SearchDropdownOption[]
    value?: string
    onChange: (value: string) => void
    onSearch?: (query: string) => void | Promise<void>
    placeholder?: string
    searchPlaceholder?: string
    emptyText?: string
    loading?: boolean
    className?: string
    disabled?: boolean
    allowClear?: boolean
    loadOnMount?: boolean
    compact?: boolean
}

export function SearchDropdown({
    options = [],
    value,
    onChange,
    onSearch,
    placeholder = "Select option...",
    searchPlaceholder = "Search...",
    emptyText = "No results found.",
    loading = false,
    className,
    disabled = false,
    allowClear = true,
    loadOnMount = false,
    compact = false,
}: SearchDropdownProps) {
    const [open, setOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [internalLoading, setInternalLoading] = React.useState(false)
    const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null)
    const initialLoadDoneRef = React.useRef(false)

    // Load default options on mount if loadOnMount is true
    React.useEffect(() => {
        if (loadOnMount && onSearch && !initialLoadDoneRef.current) {
            initialLoadDoneRef.current = true
            onSearch("")
        }
    }, [loadOnMount, onSearch])

    // Fetch initial options whenever the popover opens (is in focus)
    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen && onSearch) {
            // Trigger an empty search to load the default/initial results
            setInternalLoading(true)
            Promise.resolve(onSearch("")).finally(() => setInternalLoading(false))
        }
        setOpen(isOpen)
    }

    const handleSearchChange = (query: string) => {
        setSearchQuery(query)

        if (onSearch) {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
            }

            setInternalLoading(true)
            debounceTimerRef.current = setTimeout(async () => {
                try {
                    await onSearch(query)
                } finally {
                    setInternalLoading(false)
                }
            }, 300)
        }
    }

    const selectedOption = options.find((option) => option.value === value)

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between font-normal", className)}
                    disabled={disabled}
                >
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <div className="flex items-center">
                        {allowClear && value && (
                            <span
                                role="button"
                                tabIndex={0}
                                aria-label={`Clear ${placeholder}`}
                                className="mr-2 flex h-4 w-4 shrink-0 items-center justify-center opacity-50 transition-opacity hover:opacity-100"
                                onPointerDown={(e: React.PointerEvent) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                }}
                                onClick={(e: React.MouseEvent) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setSearchQuery("")
                                    onChange("")
                                }}
                                onKeyDown={(e: React.KeyboardEvent) => {
                                    if (e.key !== "Enter" && e.key !== " ") return
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setSearchQuery("")
                                    onChange("")
                                }}
                            >
                                <X className="h-4 w-4" />
                            </span>
                        )}
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
                <Command shouldFilter={!onSearch}>
                    <CommandInput
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                        onValueChange={handleSearchChange}
                    />
                    <CommandList>
                        {(loading || internalLoading) ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <>
                                <CommandEmpty>{emptyText}</CommandEmpty>
                                <CommandGroup>
                                    {options.map((option) => (
                                        <CommandItem
                                            key={option.value}
                                            value={option.value}
                                            onSelect={(currentValue) => {
                                                onChange(currentValue === value ? "" : currentValue)
                                                setOpen(false)
                                            }}
                                            className="px-2 py-1.5"
                                        >
                                            <div className="flex items-start w-full gap-2">
                                                <div className={cn(
                                                    "mt-1 rotate-0 transition-all",
                                                    value === option.value ? "opacity-100" : "opacity-0"
                                                )}>
                                                    <Check className="h-3.5 w-3.5 text-primary" />
                                                </div>
                                                <div className="flex flex-col flex-1 min-w-0 pr-1">
                                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                                        <span className="truncate text-sm font-medium">{option.label}</span>
                                                        {option.status && (
                                                            <StatusBadge status={option.status} className="h-5 text-xs" />
                                                        )}
                                                    </div>

                                                    {option.description && (
                                                        <span className="truncate text-xs leading-tight text-muted-foreground">
                                                            {option.description}
                                                        </span>
                                                    )}

                                                    {option.details && (
                                                        <div className={cn(
                                                            "grid gap-x-3 gap-y-0.5 mt-1",
                                                            compact ? "grid-cols-1" : "grid-cols-2"
                                                        )}>
                                                            {Object.entries(option.details).map(([key, val]) => (
                                                                val !== null && val !== undefined && val !== "" && (
                                                                    <div key={key} className="flex items-baseline gap-1 min-w-0">
                                                                        <span className="shrink-0 text-[11px] uppercase text-muted-foreground">{key}:</span>
                                                                        <span className="truncate text-xs leading-none text-muted-foreground">{String(val)}</span>
                                                                    </div>
                                                                )
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
