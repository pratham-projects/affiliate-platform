import { CardGridSkeleton, FormSkeleton } from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Account Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <FormSkeleton fields={3} />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <CardGridSkeleton count={1} className="sm:grid-cols-1 lg:grid-cols-1" />
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Top Performing Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <FormSkeleton fields={2} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Security</CardTitle>
            </CardHeader>
            <CardContent>
              <FormSkeleton fields={3} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
