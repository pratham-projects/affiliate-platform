import { CardGridSkeleton, TableSkeleton } from "@/components/common"

export default function Loading() {
  return (
    <div className="space-y-6">
      <CardGridSkeleton count={3} />
      <TableSkeleton rows={8} columns={4} />
    </div>
  )
}
