"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ExternalLink, Link2 } from "lucide-react"
import {
  AsyncBoundary,
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
  TableSkeleton,
  type Column,
} from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { affiliatesService } from "@/lib/api"
import type { TrackingLink } from "@/lib/api/affiliates"
import { parseApiError } from "@/lib/api/errors"
import { formatDate } from "@/lib/utils"

export default function AffiliateWebsites() {
  const { user, isLoading: authLoading } = useAuth()
  const [sites, setSites] = useState<TrackingLink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  const fetchSites = useCallback(async (silent = false) => {
    if (user?.role !== "affiliate") return

    if (silent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setError(null)

    try {
      const response = await affiliatesService.getTrackingLinks()
      const activeSites = response.filter((site) => site.isActive)
      const uniqueSites = Array.from(new Map(activeSites.map((site) => [site.siteId, site])).values())
      setSites(uniqueSites)
    } catch (loadError) {
      setError(parseApiError(loadError).message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [user?.role])

  useEffect(() => {
    if (fetchedRef.current || user?.role !== "affiliate") return
    fetchedRef.current = true
    void fetchSites()
  }, [fetchSites, user?.role])

  const filteredSites = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return sites

    return sites.filter((site) => {
      return (
        site.siteName.toLowerCase().includes(query) ||
        site.baseUrl.toLowerCase().includes(query) ||
        site.siteUrl.toLowerCase().includes(query)
      )
    })
  }, [searchQuery, sites])

  if (authLoading) {
    return <AffiliateWebsitesTableSkeleton />
  }

  if (user?.role !== "affiliate") {
    return null
  }

  const columns: Column<TrackingLink>[] = [
    {
      key: "site",
      header: "Site",
      cell: (site) => (
        <div className="space-y-1">
          <div className="font-medium">{site.siteName}</div>
          <div className="text-xs text-muted-foreground">{site.siteUrl}</div>
        </div>
      ),
    },
    {
      key: "base-url",
      header: "Base URL",
      cell: (site) => {
        const href = getExternalUrl(site.baseUrl)

        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <span className="truncate">{site.baseUrl}</span>
            <ExternalLink className="size-3.5" />
          </a>
        )
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (site) => <StatusBadge status={site.isActive ? "active" : "inactive"} />,
    },
    {
      key: "assigned-on",
      header: "Assigned On",
      cell: (site) => formatDate(site.assignmentDate),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[180px]",
      cell: (site) => {
        const href = getExternalUrl(site.baseUrl)

        return (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={href} target="_blank" rel="noopener noreferrer">
                Visit
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/referral-codes">
                <Link2 className="size-4" />
                Codes
              </Link>
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Websites"
        description="View the active websites assigned to your account."
        onRefresh={() => fetchSites(true)}
        isRefreshing={isRefreshing}
      />

      <AsyncBoundary
        loading={isLoading}
        error={error}
        isEmpty={sites.length === 0}
        loadingFallback={<AffiliateWebsitesTableSkeleton />}
        onRetry={() => fetchSites()}
        emptyTitle="No websites assigned"
        emptyDescription="Contact support if you expected to see website assignments here."
      >
        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Assigned Websites</CardTitle>
            </div>
            <FilterBar
              search={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search websites..."
              className="w-full sm:max-w-xs"
            />
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={filteredSites}
              rowKey={(site) => site.siteId}
              emptyTitle="No matching websites"
              emptyDescription="Try a different search term."
              className="border-0"
            />
          </CardContent>
        </Card>
      </AsyncBoundary>
    </div>
  )
}

function AffiliateWebsitesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Assigned Websites</CardTitle>
      </CardHeader>
      <CardContent>
        <TableSkeleton rows={6} columns={5} />
      </CardContent>
    </Card>
  )
}

function getExternalUrl(url: string) {
  return url.startsWith("http") ? url : `https://${url}`
}
