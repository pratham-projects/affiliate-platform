import { CardGridSkeleton, TableSkeleton } from "@/components/common"

export default function Loading() {
  return (
    <div className="space-y-6">
      <CardGridSkeleton count={4} />
      <TableSkeleton rows={8} columns={5} />
    </div>
  )
}
