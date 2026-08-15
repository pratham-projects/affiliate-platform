import { CardGridSkeleton, DetailSkeleton, TableSkeleton } from "@/components/common"

export default function Loading() {
  return (
    <div className="space-y-6">
      <CardGridSkeleton count={4} />
      <DetailSkeleton rows={6} />
      <TableSkeleton rows={6} columns={4} />
    </div>
  )
}
