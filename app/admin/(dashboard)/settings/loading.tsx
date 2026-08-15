import { FormSkeleton } from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Loading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">System settings</CardTitle>
      </CardHeader>
      <CardContent>
        <FormSkeleton fields={5} />
      </CardContent>
    </Card>
  )
}
