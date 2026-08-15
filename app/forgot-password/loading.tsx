import { AuthCard, FormSkeleton } from "@/components/common"

export default function ForgotPasswordLoading() {
  return (
    <AuthCard title="Reset password" description="Loading reset request form...">
      <FormSkeleton fields={1} />
    </AuthCard>
  )
}
