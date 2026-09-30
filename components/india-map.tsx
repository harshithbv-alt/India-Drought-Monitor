"use client"

import { useEffect, useRef, useState } from "react"
import { getSeverityGradientColor, classifySeverity } from "@/lib/severity"
import type { DistrictSummary } from "@/lib/types"

const INDIA_STATE_GEOJSON_URL =
  "https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson"
const INDIA_DISTRICT_GEOJSON_URL = 
  "https://raw.githubusercontent.com/geohacker/india/master/district/india_district.geojson"

interface IndiaMapProps {
  data: DistrictSummary[]
  onDistrictClick?: (district: string) => void
  selectedDistrict?: string | null
}

export function IndiaMap({
  data,
  onDistrictClick,
  selectedDistrict,
}: IndiaMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const stateGeoLayerRef = useRef<any>(null)
  const distGeoLayerRef = useRef<any>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Supabase stores values such as "Adilabad, Andhra Pradesh", while GeoJSON uses
  // NAME_2="Adilabad" and NAME_1="Andhra Pradesh".
  const normalizeName = (value: string) => value.toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()
  const getDistrictParts = (value: string) => {
    const parts = value.split(",").map(p => p.trim()).filter(Boolean)
    return { district: parts[0] || "", state: parts.slice(1).join(", ") }
  }
  const stateAliases: Record<string, string> = {
    "orissa": "odisha", "uttaranchal": "uttarakhand",
    "pondicherry": "puducherry", "jammu kashmir": "jammu and kashmir"
  }
  const normalizeState = (value: string) => stateAliases[normalizeName(value)] || normalizeName(value)
  const makeDistrictKey = (district: string, state?: string) => {
    const d = normalizeName(district)
    const st = normalizeState(state || "")
    return st ? `${d}|${st}` : d
  }

  useEffect(() => {
    let isMounted = true

    const initMap = async () => {
      try {
        const L = (await import("leaflet")).default
        await import("leaflet/dist/leaflet.css")

        // ✅ ensure DOM exists AFTER render
        requestAnimationFrame(async () => {
          if (!isMounted) return
          if (!mapContainerRef.current) return
          if (mapRef.current) return // prevent double init

          const map = L.map(mapContainerRef.current, {
            center: [22.5937, 78.9629],
            zoom: 5,
            minZoom: 4,
            maxZoom: 8,
          })

          mapRef.current = map

          L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
            { opacity: 0.5 }
          ).addTo(map)

          const [stateRes, distRes] = await Promise.all([
            fetch(INDIA_STATE_GEOJSON_URL),
            fetch(INDIA_DISTRICT_GEOJSON_URL)
          ])

          if (!stateRes.ok || !distRes.ok) throw new Error("GeoJSON failed")

          const stateGeoData = await stateRes.json()
          const distGeoData = await distRes.json()

          if (!mapRef.current || !isMounted) return

          const getAggregatedData = () => {
            const stateMap = new Map<string, { avg: number; count: number; districts: any[] }>()
            const distMap = new Map<string, any>()
            const baseDistrictMap = new Map<string, any[]>()

            data.forEach((d: any) => {
              const parts = getDistrictParts(String(d.district || ""))
              const dName = parts.district
              const sName = parts.state
              const sev = Number(d.severity_index) || 0

              if (dName && sName) distMap.set(makeDistrictKey(dName, sName), d)

              const baseKey = makeDistrictKey(dName)
              const rows = baseDistrictMap.get(baseKey) || []
              rows.push(d)
              baseDistrictMap.set(baseKey, rows)

              const stateKey = normalizeState(sName)
              if (stateKey) {
                const ex = stateMap.get(stateKey)
                if (ex) {
                  ex.avg = (ex.avg * ex.count + sev) / (ex.count + 1)
                  ex.count++
                  ex.districts.push(d)
                } else {
                  stateMap.set(stateKey, { avg: sev, count: 1, districts: [d] })
                }
              }
            })

            baseDistrictMap.forEach((rows, key) => {
              if (rows.length === 1 && !distMap.has(key)) distMap.set(key, rows[0])
            })
            return { stateMap, distMap }
          }

          const { stateMap, distMap } = getAggregatedData()

          // State Layer
          const stateLayer = L.geoJSON(stateGeoData, {
            style: (feature: any) => {
              const state = feature?.properties?.NAME_1 || feature?.properties?.name || ""
              const sData = stateMap.get(normalizeState(state))
              return {
                fillColor: getSeverityGradientColor(sData?.avg ?? null),
                weight: 1,
                color: "#9CA3AF",
                fillOpacity: 0.8,
              }
            },
            onEachFeature: (feature: any, layer: any) => {
              const state = feature?.properties?.NAME_1 || feature?.properties?.name || "Unknown"
              const sData = stateMap.get(normalizeState(state))
              const tooltip = sData
                ? `${state} &ndash; ${(sData.avg * 100).toFixed(0)}% &ndash; ${classifySeverity(sData.avg)} Severity`
                : `${state} &ndash; No data`
              layer.bindTooltip(tooltip)
            }
          })

          // District Layer
          const distLayer = L.geoJSON(distGeoData, {
            style: (feature: any) => {
              const dist = feature?.properties?.NAME_2 || ""
              const state = feature?.properties?.NAME_1 || ""
              const dData = distMap.get(makeDistrictKey(dist, state)) ?? distMap.get(makeDistrictKey(dist))
              const sev = dData ? (dData.severity_index || 0) : null
              return {
                fillColor: getSeverityGradientColor(sev),
                weight: 0.5,
                color: "#9CA3AF",
                fillOpacity: 0.8,
              }
            },
            onEachFeature: (feature: any, layer: any) => {
              const dist = feature?.properties?.NAME_2 || "Unknown"
              const state = feature?.properties?.NAME_1 || ""
              const dData = distMap.get(makeDistrictKey(dist, state)) ?? distMap.get(makeDistrictKey(dist))
              const sev = dData ? (dData.severity_index || 0) : null
              const tooltip = dData
                ? `${dist} &ndash; ${(sev! * 100).toFixed(0)}% &ndash; ${classifySeverity(sev!)} Severity`
                : `${dist} &ndash; No data`
              layer.bindTooltip(tooltip)

              layer.on("click", () => {
                if (dData) onDistrictClick?.(dData.district)
              })
            }
          })

          stateGeoLayerRef.current = stateLayer
          distGeoLayerRef.current = distLayer

          const updateLayers = () => {
            if (!mapRef.current) return
            const zoom = mapRef.current.getZoom()
            if (zoom >= 6) {
              if (mapRef.current.hasLayer(stateLayer)) mapRef.current.removeLayer(stateLayer)
              if (!mapRef.current.hasLayer(distLayer)) mapRef.current.addLayer(distLayer)
            } else {
              if (mapRef.current.hasLayer(distLayer)) mapRef.current.removeLayer(distLayer)
              if (!mapRef.current.hasLayer(stateLayer)) mapRef.current.addLayer(stateLayer)
            }
          }

          map.on('zoomend', updateLayers)
          updateLayers()

          setIsLoading(false)
        })
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Map failed")
        setIsLoading(false)
      }
    }

    initMap()

    return () => {
      isMounted = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, []) // Initialize map and layers only once

  // 🔄 update colors on data change
  useEffect(() => {
    if (!stateGeoLayerRef.current || !distGeoLayerRef.current) return

    const getAggregatedData = () => {
      const stateMap = new Map<string, { avg: number; count: number; districts: any[] }>()
      const distMap = new Map<string, any>()
      const baseDistrictMap = new Map<string, any[]>()

      data.forEach((d: any) => {
        const parts = getDistrictParts(String(d.district || ""))
        const dName = parts.district
        const sName = parts.state
        const sev = Number(d.severity_index) || 0

        if (dName && sName) distMap.set(makeDistrictKey(dName, sName), d)

        const baseKey = makeDistrictKey(dName)
        const rows = baseDistrictMap.get(baseKey) || []
        rows.push(d)
        baseDistrictMap.set(baseKey, rows)

        const stateKey = normalizeState(sName)
        if (stateKey) {
          const ex = stateMap.get(stateKey)
          if (ex) {
            ex.avg = (ex.avg * ex.count + sev) / (ex.count + 1)
            ex.count++
            ex.districts.push(d)
          } else {
            stateMap.set(stateKey, { avg: sev, count: 1, districts: [d] })
          }
        }
      })

      baseDistrictMap.forEach((rows, key) => {
        if (rows.length === 1 && !distMap.has(key)) distMap.set(key, rows[0])
      })
      return { stateMap, distMap }
    }

    const { stateMap, distMap } = getAggregatedData()

    stateGeoLayerRef.current.setStyle((feature: any) => {
      const state = feature?.properties?.NAME_1 || feature?.properties?.name || ""
      const sData = stateMap.get(normalizeState(state))
      return {
        fillColor: getSeverityGradientColor(sData?.avg ?? null),
        weight: 1,
        color: "#9CA3AF",
        fillOpacity: 0.8,
      }
    })

    stateGeoLayerRef.current.eachLayer((layer: any) => {
      const feature = layer.feature
      const state = feature?.properties?.NAME_1 || feature?.properties?.name || "Unknown"
      const sData = stateMap.get(normalizeState(state))
      const tooltip = sData
        ? `${state} &ndash; ${(sData.avg * 100).toFixed(0)}% &ndash; ${classifySeverity(sData.avg)} Severity`
        : `${state} &ndash; No data`
      
      if (layer.getTooltip()) {
        layer.setTooltipContent(tooltip)
      } else {
        layer.bindTooltip(tooltip)
      }
    })

    distGeoLayerRef.current.setStyle((feature: any) => {
      const dist = feature?.properties?.NAME_2 || ""
      const state = feature?.properties?.NAME_1 || ""
      const dData = distMap.get(makeDistrictKey(dist, state)) ?? distMap.get(makeDistrictKey(dist))
      const sev = dData ? (dData.severity_index || 0) : null
      
      // Highlight selected district
      const isSelected = !!selectedDistrict && normalizeName(dData?.district || "") === normalizeName(selectedDistrict)
      
      return {
        fillColor: getSeverityGradientColor(sev),
        weight: isSelected ? 3 : 0.5,
        color: isSelected ? "#FFFFFF" : "#9CA3AF",
        fillOpacity: 0.8,
      }
    })

    distGeoLayerRef.current.eachLayer((layer: any) => {
      const feature = layer.feature
      const dist = feature?.properties?.NAME_2 || "Unknown"
      const state = feature?.properties?.NAME_1 || ""
      const dData = distMap.get(makeDistrictKey(dist, state)) ?? distMap.get(makeDistrictKey(dist))
      const sev = dData ? (dData.severity_index || 0) : null
      const tooltip = dData
        ? `${dist} &ndash; ${(sev! * 100).toFixed(0)}% &ndash; ${classifySeverity(sev!)} Severity`
        : `${dist} &ndash; No data`
        
      if (layer.getTooltip()) {
        layer.setTooltipContent(tooltip)
      } else {
        layer.bindTooltip(tooltip)
      }
    })

  }, [data, selectedDistrict, isLoading])

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>
  }

  return (
    <div className="relative w-full h-[500px] border rounded-lg overflow-hidden shadow-sm">
      <div ref={mapContainerRef} className="w-full h-full" />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600 font-medium">Loading maps...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export function IndiaMapSkeleton() {
  return (
    <div className="relative w-full h-[500px] bg-gray-100/50 rounded-lg border animate-pulse flex items-center justify-center">
      <p className="text-gray-500 text-sm">Loading map...</p>
    </div>
  )
}