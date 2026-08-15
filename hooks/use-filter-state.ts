"use client"

import { useCallback, useMemo, useRef } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

export function useFilterState<T extends Record<string, any>>(initialFilters: T) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const initialRef = useRef(initialFilters)
    const filters = useMemo(() => {
        const currentFilters = { ...initialRef.current }

        Object.keys(initialRef.current).forEach((key) => {
            const value = searchParams.get(key)
            if (value !== null) {
                // Handle different types based on initial value
                const type = typeof initialRef.current[key]
                if (type === "number") {
                    currentFilters[key as keyof T] = Number(value) as any
                } else if (type === "boolean") {
                    currentFilters[key as keyof T] = (value === "true") as any
                } else {
                    currentFilters[key as keyof T] = value as any
                }
            }
        })

        return currentFilters
    }, [searchParams])

    const setFilter = useCallback((key: keyof T, value: any) => {
        const params = new URLSearchParams(searchParams.toString())

        if (value === undefined || value === null || value === "") {
            params.delete(key as string)
        } else if (value === "all") {
            if (initialRef.current[key] === "all") {
                params.delete(key as string)
            } else {
                params.set(key as string, "all")
            }
        } else if (value === initialRef.current[key]) {
            params.delete(key as string)
        } else {
            params.set(key as string, String(value))
        }

        // Always reset page to 1 when filters change (e.g. status), but NOT when page or pageSize changes
        if (key !== "page" && key !== "pageSize") {
            params.delete("page")
        }

        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }, [searchParams, pathname, router])

    const setFilters = useCallback((newFilters: Partial<T>) => {
        const params = new URLSearchParams(searchParams.toString())

        Object.entries(newFilters).forEach(([key, value]) => {
            if (value === undefined || value === null || value === "") {
                params.delete(key)
            } else if (value === "all") {
                if (initialRef.current[key] === "all") {
                    params.delete(key)
                } else {
                    params.set(key, "all")
                }
            } else if (value === initialRef.current[key]) {
                params.delete(key)
            } else {
                params.set(key, String(value))
            }
        })

        // Reset page to 1 unless pageSize is being changed
        const isPageSizeChange = 'pageSize' in newFilters
        if (!isPageSizeChange) {
            params.delete("page")
        }

        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }, [searchParams, pathname, router])

    const clearFilters = useCallback(() => {
        router.push(pathname, { scroll: false })
    }, [pathname, router])

    return {
        filters,
        setFilter,
        setFilters,
        clearFilters
    }
}
