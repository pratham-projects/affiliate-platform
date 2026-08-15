import { CardGridSkeleton, DetailSkeleton } from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="space-y-6">
      <CardGridSkeleton count={4} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailSkeleton rows={6} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Conversion Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailSkeleton rows={6} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
