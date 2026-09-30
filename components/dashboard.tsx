'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatsCards } from './stats-cards'
import { TimeSeriesChart } from './time-series-chart'
import { DistrictSearch } from './district-search'
import { FuturePrediction } from './future-prediction'
import { TopHighSeverityDistricts, TopLowSeverityDistricts } from './severity-rankings'
import { IndiaMapSkeleton } from "./india-map"
import { useLatestDroughtData } from '@/hooks/use-drought-data'
import Link from 'next/link'

// Dynamically import the map to avoid SSR issues with react-simple-maps
const IndiaMap = dynamic(() => import('./india-map').then(mod => ({ default: mod.IndiaMap })), {
  ssr: false,
  loading: () => <IndiaMapSkeleton />
})

export function Dashboard() {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>()

  const { data: droughtData, isLoading } = useLatestDroughtData(selectedMonth)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">
              India Drought Monitor
            </h1>
            <span className="hidden sm:inline text-sm text-muted-foreground">
              District-Level Severity Analysis
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                Admin Panel
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6 space-y-6">
        {/* Stats Overview */}
        <StatsCards month={selectedMonth} />

        {/* Map and Search Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Map - Left Side */}
          <Card className="lg:col-span-2 overflow-hidden shadow-sm hover:shadow-md transition-shadow border-2">
            <CardHeader className="pb-2 bg-muted/30">
              <CardTitle className="text-lg">Current Drought Severity Map</CardTitle>
              <CardDescription>
                Color indicates current drought severity level. Click on a district for detailed forecasting.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <IndiaMap
                data={droughtData || []}
                onDistrictClick={setSelectedDistrict}
                selectedDistrict={selectedDistrict}
              />
            </CardContent>
          </Card>

          {/* Search and Quick Info - Right Side */}
          <div className="space-y-6">
            <Card className="border-2 shadow-sm">
              <CardHeader className="pb-2 bg-muted/30">
                <CardTitle className="text-lg">Find District</CardTitle>
                <CardDescription>
                  Search by district name
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <DistrictSearch
                  onSelect={setSelectedDistrict}
                  selectedDistrict={selectedDistrict}
                />
              </CardContent>
            </Card>

            {/* Selected District Info */}
            {selectedDistrict && (
              <Card className="border-2 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
                <CardHeader className="pb-2 bg-muted/30">
                  <CardTitle className="text-lg">Current Parameters</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <p className="font-bold text-xl text-primary">{selectedDistrict}</p>
                    {droughtData && (() => {
                      const district = droughtData.find(
                        d => d.district.toLowerCase() === selectedDistrict.toLowerCase()
                      )
                      if (!district) return <p className="text-sm text-muted-foreground">No data available for selected month</p>
                      
                      const sevClass = (district as any).severity_class || 'N/A'
                      const isExtreme = sevClass === 'Extreme'
                      const isSevere = sevClass === 'Severe'
                      const isMod = sevClass === 'Moderate'
                      const isMild = sevClass === 'Mild'
                      
                      const boxStyle = isExtreme ? 'bg-red-950/10 border-red-900 text-red-950' :
                                       isSevere ? 'bg-red-50 border-red-200 text-red-900' : 
                                       isMod ? 'bg-orange-50 border-orange-200 text-orange-900' :
                                       isMild ? 'bg-yellow-50 border-yellow-200 text-yellow-900' :
                                       'bg-green-50 border-green-200 text-green-900'
                      
                      return (
                        <div className="space-y-3 text-sm">
                          <div className={`p-3 rounded-md border ${boxStyle}`}>
                            <p className="flex justify-between items-center font-bold mb-1">
                              <span>Severity Class:</span>
                              <span className="text-base uppercase tracking-wider">{sevClass}</span>
                            </p>
                            <p className="flex justify-between font-medium">
                              <span>Current Severity Index:</span>
                              <span>{(((district as any).severity_index || 0) * 100).toFixed(1)}%</span>
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
                            <p className="flex flex-col">
                              <span className="text-muted-foreground text-xs uppercase font-medium tracking-wider">NDVI</span>
                              <span className="font-semibold">{district.ndvi?.toFixed(3) || 'N/A'}</span>
                            </p>
                            <p className="flex flex-col">
                              <span className="text-muted-foreground text-xs uppercase font-medium tracking-wider">Rainfall</span>
                              <span className="font-semibold">{district.rainfall?.toFixed(1) || '0'} mm</span>
                            </p>
                            <p className="flex flex-col">
                              <span className="text-muted-foreground text-xs uppercase font-medium tracking-wider">Soil Moisture</span>
                              <span className="font-semibold">{district.soil_moisture?.toFixed(3) || 'N/A'}</span>
                            </p>
                            <p className="flex flex-col">
                              <span className="text-muted-foreground text-xs uppercase font-medium tracking-wider">Temperature</span>
                              <span className="font-semibold">{district.temperature?.toFixed(1) || 'N/A'} °C</span>
                            </p>
                            <p className="flex flex-col col-span-2 mt-1">
                              <span className="text-muted-foreground text-xs uppercase font-medium tracking-wider">Evapotranspiration</span>
                              <span className="font-semibold">{district.evapotranspiration?.toFixed(2) || 'N/A'} mm/day</span>
                            </p>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Legend Card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Severity Index Reference</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2 pt-0">
                <p className="text-muted-foreground">
                  Index (0-100%) calculated using:
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> 0 - 20% : No Drought</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> 21 - 40% : Mild</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500"></span> 41 - 60% : Moderate</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> 61 - 80% : Severe</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#991B1B]"></span> 81 - 100% : Extreme</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Section: Trend Graph & Future Prediction */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Historical Trend Graph - Bottom Left */}
          <div className="flex flex-col">
            <TimeSeriesChart district={selectedDistrict} />
          </div>

          {/* Future Prediction Section - Bottom Right */}
          <div className="flex flex-col">
            <FuturePrediction district={selectedDistrict} />
          </div>
        </div>

        {/* Top 20 Rankings Section */}
        <div className="grid gap-6 lg:grid-cols-2 mt-2">
          <div className="flex flex-col">
            <TopHighSeverityDistricts month={selectedMonth} onDistrictClick={setSelectedDistrict} />
          </div>
          <div className="flex flex-col">
            <TopLowSeverityDistricts month={selectedMonth} onDistrictClick={setSelectedDistrict} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-8 bg-muted/20">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          <p>India Drought Monitoring System - District-Level Analysis with LSTM Predictions</p>
        </div>
      </footer>
    </div>
  )
}
