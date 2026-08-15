import { AuthCard, FormSkeleton } from "@/components/common"

export default function ResetPasswordLoading() {
  return (
    <AuthCard title="Set new password" description="Loading reset form...">
      <FormSkeleton fields={2} />
    </AuthCard>
  )
}
