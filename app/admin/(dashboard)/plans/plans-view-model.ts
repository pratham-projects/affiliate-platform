import type { CreatePlanRequest } from "@/lib/api/plans"

type PlanFormState = {
  planName: string
  baseCommissionPercentage: string
  commissionDurationType: CreatePlanRequest["commission_duration_type"]
  durationMonths: string
}

export function formatPlanDurationLabel(
  durationType: CreatePlanRequest["commission_duration_type"],
  durationMonths: number | null,
) {
  switch (durationType) {
    case "one_month":
      return "One month"
    case "lifetime":
      return "Lifetime"
    case "x_months":
      return durationMonths ? `${durationMonths} months` : "Custom months"
    default:
      return "Unknown"
  }
}

export function validatePlanForm(form: PlanFormState) {
  const errors: Partial<Record<keyof PlanFormState, string>> = {}

  if (!form.planName.trim()) {
    errors.planName = "Plan name is required"
  }

  const commission = Number.parseFloat(form.baseCommissionPercentage)
  if (!Number.isFinite(commission) || commission <= 0 || commission > 100) {
    errors.baseCommissionPercentage = "Commission must be between 0.01 and 100"
  }

  if (form.commissionDurationType === "x_months" && !form.durationMonths.trim()) {
    errors.durationMonths = "Duration months are required for custom durations"
  }

  return errors
}
