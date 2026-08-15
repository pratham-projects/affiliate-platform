import { TableSkeleton } from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Assigned Websites</CardTitle>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={6} columns={5} />
        </CardContent>
      </Card>
    </div>
  )
}
