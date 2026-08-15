"use client"

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { buildAnalyticsChartData, buildCountryMapData, type AnalyticsInsightRow } from "@/lib/analytics/insights"
import type { CountryAnalyticsRow } from "@/lib/api"
import { CountryAnalyticsMap } from "./country-analytics-map"

const volumeChartConfig = {
  clicks: { label: "Clicks", color: "hsl(210 72% 46%)" },
  conversions: { label: "Conversions", color: "hsl(161 66% 35%)" },
} satisfies ChartConfig

const valueChartConfig = {
  revenue: { label: "Revenue", color: "hsl(262 62% 48%)" },
  commission: { label: "Commission", color: "hsl(38 92% 42%)" },
} satisfies ChartConfig

export function AnalyticsInsightsPanel({
  rows,
  countryRows,
  title = "Insights",
}: {
  rows: AnalyticsInsightRow[]
  countryRows?: CountryAnalyticsRow[]
  title?: string
}) {
  const chartData = buildAnalyticsChartData(rows, 8)
  const mapData = buildCountryMapData(countryRows || [])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Traffic To Conversion</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={volumeChartConfig} className="h-[260px] w-full">
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="clicks" fill="var(--color-clicks)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="conversions" fill="var(--color-conversions)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Value Concentration</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={valueChartConfig} className="h-[260px] w-full">
              <AreaChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="revenue" type="monotone" stroke="var(--color-revenue)" fill="var(--color-revenue)" fillOpacity={0.18} />
                <Area dataKey="commission" type="monotone" stroke="var(--color-commission)" fill="var(--color-commission)" fillOpacity={0.2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      {countryRows ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Country Performance Map</CardTitle>
          </CardHeader>
          <CardContent>
            {mapData.length > 0 ? (
              <CountryAnalyticsMap data={mapData} />
            ) : (
              <div className="flex h-[320px] items-center justify-center rounded-md border bg-muted/20 text-sm text-muted-foreground">
                No country conversion data for the selected filters.
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </section>
  )
}
