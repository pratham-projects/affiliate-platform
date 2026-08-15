"use client"

import { use } from "react"
import { ConversionPaymentDetail } from "@/components/dashboard/conversion-payment-detail"

export default function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    return <ConversionPaymentDetail id={parseInt(id)} type="payment" />
}
