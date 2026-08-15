import { AuthCard, FormSkeleton } from "@/components/common"

export default function LoginLoading() {
  return (
    <AuthCard title="Affiliate Login" description="Loading sign-in form...">
      <FormSkeleton fields={2} />
    </AuthCard>
  )
}
