"use client"

import { useMemo, useState } from "react"

import { Map as AnalyticsMap, MapControls, MapGeoJSON, MapPopup } from "@/components/ui/map"
import { useTheme } from "@/components/providers/theme-provider"
import type { CountryMapDatum } from "@/lib/analytics/insights"
import { useWorldData, WORLD_GEOJSON } from "@/lib/use-world-data"
import { cn, formatCurrency, formatNumber } from "@/lib/utils"

type Theme = "light" | "dark"

interface CountryProperties {
  NAME_LONG: string
  clicks: number
  conversions: number
  commission: number
  value: number
}

type CountryFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, CountryProperties>

interface HoverInfo {
  name: string
  clicks: number
  conversions: number
  commission: number
  value: number
  lng: number
  lat: number
}

const mapConfig = {
  view: {
    center: [12, 28] as [number, number],
    zoom: 1.35,
    minZoom: 1,
    maxZoom: 4,
  },
  colors: {
    light: {
      base: "#e5e9f0",
      ramp: ["#c7cfdd", "#a2adc3", "#74829f", "#4d6187"] as const,
      hover: "#3d4f78",
    },
    dark: {
      base: "#2e2e2e",
      ramp: ["#404040", "#7d7d7d", "#b8b8b8", "#ededed"] as const,
      hover: "#ffffff",
    },
  },
} satisfies Record<string, unknown>

const COUNTRY_ALIASES: Record<string, string> = {
  ae: "United Arab Emirates",
  au: "Australia",
  br: "Brazil",
  ca: "Canada",
  cn: "China",
  de: "Germany",
  es: "Spain",
  fr: "France",
  gb: "United Kingdom",
  in: "India",
  it: "Italy",
  jp: "Japan",
  mx: "Mexico",
  nl: "Netherlands",
  pl: "Poland",
  se: "Sweden",
  uk: "United Kingdom",
  us: "United States",
  usa: "United States",
}

function normalizeCountryKey(value: string) {
  const normalized = value.trim().toLowerCase()
  return COUNTRY_ALIASES[normalized] ?? normalized
}

function buildScaleStops(max: number) {
  return [0, 1, Math.max(2, Math.ceil(max * 0.33)), Math.max(3, Math.ceil(max * 0.66)), Math.max(4, max)]
}

function buildFillColor(theme: Theme, max: number): unknown[] {
  const colors = mapConfig.colors[theme]
  const [s0, s1, s2, s3, s4] = buildScaleStops(max)
  const ramped = [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "value"], 0],
    s0,
    colors.base,
    s1,
    colors.ramp[0],
    s2,
    colors.ramp[1],
    s3,
    colors.ramp[2],
    s4,
    colors.ramp[3],
  ]

  return [
    "case",
    ["all", ["boolean", ["feature-state", "hover"], false], [">", ["coalesce", ["get", "value"], 0], 0]],
    colors.hover,
    ramped,
  ]
}

function Legend({ theme }: { theme: Theme }) {
  const gradient = `linear-gradient(to right, ${mapConfig.colors[theme].ramp.join(", ")})`

  return (
    <div className="absolute bottom-4 left-4 z-10 rounded-md border bg-card/90 px-3 py-2.5 backdrop-blur-sm">
      <p className="text-xs font-medium text-foreground">Conversions by country</p>
      <div className="mt-2 h-2 w-40 rounded-full" style={{ backgroundImage: gradient }} />
      <div className="flex items-center justify-between pt-1.5 text-[10px] text-muted-foreground">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  )
}

export function CountryAnalyticsMap({
  data,
  className,
}: {
  data: CountryMapDatum[]
  className?: string
}) {
  const { theme } = useTheme()
  const world = useWorldData()
  const [hover, setHover] = useState<HoverInfo | null>(null)
  const resolvedTheme: Theme = theme === "light" ? "light" : "dark"

  const dataByCountry = useMemo(() => {
    const map = new globalThis.Map<string, CountryMapDatum>()
    for (const item of data) {
      map.set(normalizeCountryKey(item.country), item)
    }
    return map
  }, [data])

  const max = useMemo(() => Math.max(...data.map((item) => item.value), 0), [data])

  const countries = useMemo<CountryFeatureCollection | null>(() => {
    if (!world) return null

    return {
      type: "FeatureCollection",
      features: world.features.map((feature) => {
        const name = feature.properties.NAME_LONG
        const datum = dataByCountry.get(normalizeCountryKey(name))

        return {
          ...feature,
          properties: {
            NAME_LONG: name,
            clicks: datum?.clicks ?? 0,
            conversions: datum?.conversions ?? 0,
            commission: datum?.commission ?? 0,
            value: datum?.value ?? 0,
          },
        }
      }),
    }
  }, [dataByCountry, world])

  const fillPaint = useMemo(
    () => ({
      "fill-color": buildFillColor(resolvedTheme, max) as never,
      "fill-opacity": 0.92,
    }),
    [max, resolvedTheme],
  )

  return (
    <div className={cn("overflow-hidden rounded-md border bg-card", className)}>
      <div className="relative h-[340px] w-full">
        <AnalyticsMap
          blank
          center={mapConfig.view.center}
          zoom={mapConfig.view.zoom}
          minZoom={mapConfig.view.minZoom}
          maxZoom={mapConfig.view.maxZoom}
          dragRotate={false}
          pitchWithRotate={false}
          attributionControl={false}
          loading={!countries}
        >
          {countries ? (
            <MapGeoJSON<CountryProperties>
              data={countries}
              promoteId="NAME_LONG"
              fillPaint={fillPaint}
              interactive
              onHover={(event) => {
                const value = event?.feature.properties.value ?? 0
                if (!event || value <= 0) {
                  setHover(null)
                  return
                }

                setHover({
                  name: event.feature.properties.NAME_LONG,
                  clicks: event.feature.properties.clicks,
                  conversions: event.feature.properties.conversions,
                  commission: event.feature.properties.commission,
                  value,
                  lng: event.longitude,
                  lat: event.latitude,
                })
              }}
            />
          ) : null}
          <MapControls className="bottom-2" />
          {hover ? (
            <MapPopup
              longitude={hover.lng}
              latitude={hover.lat}
              offset={12}
              closeOnClick={false}
              className="pointer-events-none p-2"
            >
              <p className="text-xs font-medium">{hover.name}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 text-[11px]">
                <span className="text-muted-foreground">Conversions</span>
                <span className="text-right font-semibold tabular-nums">{formatNumber(hover.conversions)}</span>
                <span className="text-muted-foreground">Clicks</span>
                <span className="text-right font-semibold tabular-nums">{formatNumber(hover.clicks)}</span>
                <span className="text-muted-foreground">Commission</span>
                <span className="text-right font-semibold tabular-nums">{formatCurrency(hover.commission)}</span>
              </div>
            </MapPopup>
          ) : null}
        </AnalyticsMap>
        <Legend theme={resolvedTheme} />
      </div>
      <div className="border-t bg-background/95 px-3 py-2 text-xs text-muted-foreground">
        Map component from <code>design/map/components/ui/map.tsx</code>. Country boundaries from Natural Earth via{" "}
        <code>{WORLD_GEOJSON}</code>.
      </div>
    </div>
  )
}
