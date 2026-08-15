import type { ContactRequestType, CreateContactRequest } from "@/lib/api/contact"

const REQUEST_TYPE_LABELS: Record<ContactRequestType, string> = {
  general_inquiry: "General Inquiry",
  technical_support: "Technical Support",
  account_issue: "Account Issue",
}

export function buildContactSubmitPayload(input: {
  subject: string
  message: string
  requestType: ContactRequestType
}): CreateContactRequest {
  return {
    subject: input.subject.trim(),
    message: input.message.trim(),
    requestType: input.requestType,
  }
}

export function getContactSubmitDisabled(input: { subject: string; message: string }) {
  return input.subject.trim().length === 0 || input.message.trim().length < 5
}

export function getContactTypeLabel(type: ContactRequestType) {
  return REQUEST_TYPE_LABELS[type]
}
