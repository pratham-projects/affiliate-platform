import { TableSkeleton } from "@/components/common"

export default function Loading() {
  return (
    <div className="space-y-6">
      <TableSkeleton rows={8} columns={7} />
    </div>
  )
}
