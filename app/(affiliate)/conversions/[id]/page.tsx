"use client"

import { use } from "react"
import { ConversionPaymentDetail } from "@/components/dashboard/conversion-payment-detail"

export default function ConversionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    return <ConversionPaymentDetail id={parseInt(id)} type="conversion" />
}
