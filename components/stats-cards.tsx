'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSummaryStats, useLatestDroughtData } from '@/hooks/use-drought-data'
import {
  Map,
  AlertOctagon,
  AlertTriangle,
  Activity,
  CloudRain,
  CheckCircle2,
  X,
} from 'lucide-react'

// Custom hook for smooth animated count up
function useCountUp(end: number, duration: number = 1500) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTimestamp: number | null = null

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp

      const progress = Math.min(
        (timestamp - startTimestamp) / duration,
        1
      )

      // Ease out expo for snappy but smooth ending
      const easeProgress =
        progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)

      setCount(Math.floor(easeProgress * end))

      if (progress < 1) {
        window.requestAnimationFrame(step)
      }
    }

    window.requestAnimationFrame(step)
  }, [end, duration])

  return count
}

function AnimatedNumber({ value }: { value: number }) {
  const count = useCountUp(value)
  return <>{count}</>
}

const statsConfig = [
  {
    key: 'total',
    label: 'Total Districts',
    desc: 'Monitored across India',
    icon: Map,
    color: 'text-slate-500 dark:text-slate-400',
    bg: 'from-slate-500/20 to-transparent',
    border:
      'border-slate-500/20 hover:border-slate-500/50',
    shadow:
      'hover:shadow-[0_0_20px_-5px_rgba(100,116,139,0.3)]',
  },
  {
    key: 'extreme',
    label: 'Extreme',
    desc: 'Critical water scarcity',
    icon: AlertOctagon,
    color: 'text-[#991B1B] dark:text-[#FCA5A5]',
    bg: 'from-[#991B1B]/30 to-transparent',
    border:
      'border-[#991B1B]/30 hover:border-[#991B1B]/60',
    shadow:
      'hover:shadow-[0_0_20px_-5px_rgba(153,27,27,0.4)]',
  },
  {
    key: 'severe',
    label: 'Severe',
    desc: 'Major crop stress',
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'from-red-500/20 to-transparent',
    border:
      'border-red-500/30 hover:border-red-500/60',
    shadow:
      'hover:shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)]',
  },
  {
    key: 'moderate',
    label: 'Moderate',
    desc: 'Elevated risk levels',
    icon: Activity,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'from-orange-500/20 to-transparent',
    border:
      'border-orange-500/30 hover:border-orange-500/60',
    shadow:
      'hover:shadow-[0_0_20px_-5px_rgba(249,115,22,0.3)]',
  },
  {
    key: 'mild',
    label: 'Mild',
    desc: 'Early warning signs',
    icon: CloudRain,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'from-yellow-500/20 to-transparent',
    border:
      'border-yellow-500/30 hover:border-yellow-500/60',
    shadow:
      'hover:shadow-[0_0_20px_-5px_rgba(234,179,8,0.3)]',
  },
  {
    key: 'noDrought',
    label: 'No Drought',
    desc: 'Optimal conditions',
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bg: 'from-green-500/20 to-transparent',
    border:
      'border-green-500/30 hover:border-green-500/60',
    shadow:
      'hover:shadow-[0_0_20px_-5px_rgba(34,197,94,0.3)]',
  },
]

interface StatsCardsProps {
  month?: string
}

export function StatsCards({ month }: StatsCardsProps) {
  const { data: stats, isLoading } = useSummaryStats(month)

  const {
    data: districts,
    isLoading: isDistrictsLoading,
  } = useLatestDroughtData(month)

  const [selectedCategory, setSelectedCategory] =
    useState<string | null>(null)

  if (isLoading) {
    return <StatsCardsSkeleton />
  }

  // Filter districts according to selected card
  const filteredDistricts =
    districts?.filter((district: any) => {
      if (selectedCategory === 'total') {
        return true
      }

      if (!selectedCategory) {
        return false
      }

      const categoryMap: Record<string, string> = {
        extreme: 'Extreme',
        severe: 'Severe',
        moderate: 'Moderate',
        mild: 'Mild',
        noDrought: 'No Drought',
      }

      return (
        district.severity_class ===
        categoryMap[selectedCategory]
      )
    }) || []

  const selectedLabel =
    selectedCategory === 'total'
      ? 'All Districts'
      : statsConfig.find(
          (config) => config.key === selectedCategory
        )?.label || 'Districts'

  return (
    <div className="space-y-4">
      {/* STATISTICS CARDS */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {statsConfig.map((config) => {
          const Icon = config.icon

          const value = stats
            ? (stats as any)[config.key] || 0
            : 0

          const isSelected =
            selectedCategory === config.key

          return (
            <Card
              key={config.key}
              onClick={() =>
                setSelectedCategory(
                  isSelected ? null : config.key
                )
              }
              className={`relative overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-1 ${
                config.shadow
              } bg-gradient-to-br ${config.bg} border ${
                config.border
              } backdrop-blur-sm group ${
                isSelected
                  ? 'ring-2 ring-white/40'
                  : ''
              }`}
            >
              {/* Subtle inner top highlight */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <CardHeader className="flex flex-row items-start justify-between pb-2 pt-4 px-4">
                <div className="space-y-1 z-10">
                  <CardTitle className="text-sm font-semibold tracking-tight text-foreground/90">
                    {config.label}
                  </CardTitle>

                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/80 font-semibold">
                    {config.desc}
                  </p>
                </div>

                <div
                  className={`p-2 rounded-xl bg-background/60 backdrop-blur-md border border-white/5 shadow-sm transition-transform duration-300 group-hover:scale-110 ${config.color} z-10`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </CardHeader>

              <CardContent className="px-4 pb-4 pt-1">
                <div
                  className={`text-4xl font-black tracking-tighter ${config.color}`}
                >
                  <AnimatedNumber value={value} />
                </div>
              </CardContent>

              {/* Soft background glow tied to icon */}
              <div className="absolute -bottom-6 -right-6 opacity-10 blur-2xl group-hover:opacity-20 transition-opacity duration-500 pointer-events-none">
                <Icon
                  className={`w-24 h-24 ${config.color}`}
                />
              </div>
            </Card>
          )
        })}
      </div>

      {/* DISTRICT POPUP / DROPDOWN */}
      {selectedCategory && (
        <Card className="w-full border border-white/10 bg-background/95 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {selectedLabel}
              </CardTitle>

              <p className="text-sm text-muted-foreground mt-1">
                {isDistrictsLoading
                  ? 'Loading districts...'
                  : `${filteredDistricts.length} districts`}
              </p>
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setSelectedCategory(null)
              }}
              className="rounded-md p-2 hover:bg-white/10 transition-colors"
              aria-label="Close district list"
            >
              <X className="h-5 w-5" />
            </button>
          </CardHeader>

          <CardContent>
            {isDistrictsLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(
                  (item) => (
                    <div
                      key={item}
                      className="rounded-lg border border-white/10 p-4"
                    >
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  )
                )}
              </div>
            ) : filteredDistricts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No districts found for this category.
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto pr-2">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredDistricts
                    .slice()
                    .sort((a: any, b: any) =>
                      String(a.district).localeCompare(
                        String(b.district)
                      )
                    )
                    .map(
                      (
                        district: any,
                        index: number
                      ) => (
                        <div
                          key={`${district.district}-${index}`}
                          className="rounded-lg border border-white/10 bg-white/[0.03] p-3 hover:bg-white/[0.06] transition-colors"
                        >
                          <div className="font-semibold text-sm">
                            {district.district}
                          </div>

                          <div className="mt-2 text-xs text-muted-foreground">
                            Severity:{' '}
                            <span className="text-foreground">
                              {district.severity_class}
                            </span>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Severity Index:{' '}
                            <span className="text-foreground">
                              {(
                                (district.severity_index ||
                                  0) * 100
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                        </div>
                      )
                    )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card
          key={i}
          className="overflow-hidden border-muted/50"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-2 w-24" />
            </div>

            <Skeleton className="h-8 w-8 rounded-xl" />
          </CardHeader>

          <CardContent className="px-4 pb-4 pt-1">
            <Skeleton className="h-10 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}