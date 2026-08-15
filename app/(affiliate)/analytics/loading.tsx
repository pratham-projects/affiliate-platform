import { CardGridSkeleton, TableSkeleton } from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="space-y-6">
      <CardGridSkeleton count={4} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Analytics Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={8} columns={6} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={6} columns={1} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
