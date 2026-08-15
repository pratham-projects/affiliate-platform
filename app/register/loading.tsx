import { AuthCard, FormSkeleton } from "@/components/common"

export default function RegisterLoading() {
  return (
    <AuthCard
      title="Create affiliate account"
      description="Loading registration form..."
      containerClassName="max-w-lg"
    >
      <FormSkeleton fields={6} />
    </AuthCard>
  )
}
