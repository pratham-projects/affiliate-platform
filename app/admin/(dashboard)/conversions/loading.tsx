import { TableSkeleton } from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Loading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Conversions</CardTitle>
      </CardHeader>
      <CardContent>
        <TableSkeleton rows={8} columns={8} />
      </CardContent>
    </Card>
  )
}
