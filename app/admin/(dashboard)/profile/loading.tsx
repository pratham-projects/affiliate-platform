import { FormSkeleton } from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Account details</CardTitle>
        </CardHeader>
        <CardContent>
          <FormSkeleton fields={3} />
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
  )
}
