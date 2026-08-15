import { TableSkeleton } from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Loading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Conversion History</CardTitle>
      </CardHeader>
      <CardContent>
        <TableSkeleton rows={8} columns={7} />
      </CardContent>
    </Card>
  )
}
