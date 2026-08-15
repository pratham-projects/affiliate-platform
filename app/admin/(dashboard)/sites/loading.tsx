import { TableSkeleton } from "@/components/common"

export default function Loading() {
  return (
    <div className="space-y-6">
      <TableSkeleton rows={6} columns={5} />
    </div>
  )
}
