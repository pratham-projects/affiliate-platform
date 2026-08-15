import { CardGridSkeleton, TableSkeleton } from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="space-y-6">
      <CardGridSkeleton count={4} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={8} columns={7} />
        </CardContent>
      </Card>
    </div>
  )
}
