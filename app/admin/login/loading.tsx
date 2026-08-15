import { AuthCard, FormSkeleton } from "@/components/common"

export default function AdminLoginLoading() {
  return (
    <AuthCard title="Administrator Login" description="Loading sign-in form...">
      <FormSkeleton fields={2} />
    </AuthCard>
  )
}
