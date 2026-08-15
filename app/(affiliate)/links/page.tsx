"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink } from "lucide-react"
import {
  AsyncBoundary,
  CopyButton,
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
  TableSkeleton,
  type Column,
} from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { isAffiliate, useAuth } from "@/lib/auth-context"
import { linksService, type AffiliateLink } from "@/lib/api"
import { parseApiError } from "@/lib/api/errors"
import { formatDate } from "@/lib/utils"

export default function LinksPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [links, setLinks] = useState<AffiliateLink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  const fetchLinks = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setError(null)

    try {
      const response = await linksService.getMyLinks()
      setLinks(response.links)
    } catch (loadError) {
      setError(parseApiError(loadError).message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !isAffiliate(user?.role)) {
      router.push("/")
      return
    }

    if (fetchedRef.current || authLoading || !user) return
    fetchedRef.current = true
    void fetchLinks()
  }, [user, authLoading, router, fetchLinks])

  const filteredLinks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return links

    return links.filter((link) => {
      return (
        link.siteName.toLowerCase().includes(query) ||
        link.siteUrl.toLowerCase().includes(query) ||
        link.code.toLowerCase().includes(query)
      )
    })
  }, [links, searchQuery])

  if (authLoading) {
    return <AffiliateLinksTableSkeleton />
  }

  if (!isAffiliate(user?.role)) {
    return null
  }

  const columns: Column<AffiliateLink>[] = [
    {
      key: "site",
      header: "Site",
      cell: (link) => (
        <div className="space-y-1">
          <div className="font-medium">{link.siteName}</div>
          <div className="text-xs text-muted-foreground">{link.siteUrl}</div>
        </div>
      ),
    },
    {
      key: "code",
      header: "Referral Code",
      cell: (link) => (
        <div className="flex items-center gap-2">
          <code className="rounded bg-muted px-2 py-1 text-sm">{link.code}</code>
          <CopyButton value={link.code} size="icon" className="size-8" />
        </div>
      ),
    },
    {
      key: "link",
      header: "Referral Link",
      cell: (link) => (
        <div className="flex items-center gap-2">
          <span className="max-w-[280px] truncate text-sm text-muted-foreground">{link.fullUrl}</span>
          <CopyButton value={link.fullUrl} size="icon" className="size-8" />
          <Button variant="outline" size="icon" asChild className="size-8">
            <a href={link.fullUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              <span className="sr-only">Open referral link</span>
            </a>
          </Button>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (link) => <StatusBadge status={link.isActive ? "active" : "inactive"} />,
    },
    {
      key: "created",
      header: "Created",
      cell: (link) => formatDate(link.createdAt),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Links"
        description="Use your referral code and full tracking link for each assigned site."
        onRefresh={() => fetchLinks(true)}
        isRefreshing={isRefreshing}
      />

      <AsyncBoundary
        loading={isLoading}
        error={error}
        isEmpty={links.length === 0}
        loadingFallback={<AffiliateLinksTableSkeleton />}
        onRetry={() => fetchLinks()}
        emptyTitle="No referral links yet"
        emptyDescription="Links appear here once sites are assigned to your account."
      >
        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Assigned Referral Links</CardTitle>
            </div>
            <FilterBar
              search={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search sites or codes..."
              className="w-full sm:max-w-xs"
            />
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={filteredLinks}
              rowKey={(link) => link.id}
              emptyTitle="No matching links"
              emptyDescription="Try a different search term."
              className="border-0"
            />
          </CardContent>
        </Card>
      </AsyncBoundary>
    </div>
  )
}

function AffiliateLinksTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Assigned Referral Links</CardTitle>
      </CardHeader>
      <CardContent>
        <TableSkeleton rows={6} columns={5} />
      </CardContent>
    </Card>
  )
}
