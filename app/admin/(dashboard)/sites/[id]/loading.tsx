import { CardGridSkeleton, TableSkeleton } from "@/components/common"

export default function Loading() {
  return (
    <div className="space-y-6">
      <CardGridSkeleton count={4} />
      <div className="grid gap-6 xl:grid-cols-2">
        <TableSkeleton rows={5} columns={2} />
        <TableSkeleton rows={4} columns={2} />
      </div>
      <TableSkeleton rows={6} columns={4} />
    </div>
  )
}
