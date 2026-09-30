'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useTopSeverityDistricts, useLowestSeverityDistricts } from '@/hooks/use-drought-data'
import { formatSeverity, getSeverityColor } from '@/lib/severity'
import type { DistrictSummary, SeverityClass } from '@/lib/types'

interface DistrictRankingsProps {
  month?: string
  onDistrictClick?: (district: string) => void
  selectedDistrict?: string | null
}

export function DistrictRankings({ month, onDistrictClick, selectedDistrict }: DistrictRankingsProps) {
  const { data: topDistricts, isLoading: topLoading } = useTopSeverityDistricts(month)
  const { data: bottomDistricts, isLoading: bottomLoading } = useLowestSeverityDistricts(month)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            Highest Drought Risk
          </CardTitle>
          <CardDescription>
            Top 20 districts with highest severity index
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topLoading ? (
            <RankingsTableSkeleton />
          ) : (
            <RankingsTable 
              districts={topDistricts || []} 
              onDistrictClick={onDistrictClick}
              selectedDistrict={selectedDistrict}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            Lowest Drought Risk
          </CardTitle>
          <CardDescription>
            Top 20 districts with lowest severity index
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bottomLoading ? (
            <RankingsTableSkeleton />
          ) : (
            <RankingsTable 
              districts={bottomDistricts || []} 
              onDistrictClick={onDistrictClick}
              selectedDistrict={selectedDistrict}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface RankingsTableProps {
  districts: DistrictSummary[]
  onDistrictClick?: (district: string) => void
  selectedDistrict?: string | null
}

function RankingsTable({ districts, onDistrictClick, selectedDistrict }: RankingsTableProps) {
  if (districts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available. Upload CSV data to see rankings.
      </div>
    )
  }

  return (
    <div className="max-h-[400px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card border-b">
          <tr className="text-left">
            <th className="py-2 pr-2 font-medium text-muted-foreground">#</th>
            <th className="py-2 pr-2 font-medium text-muted-foreground">District</th>
            <th className="py-2 pr-2 font-medium text-muted-foreground">State</th>
            <th className="py-2 font-medium text-muted-foreground text-right">Severity</th>
          </tr>
        </thead>
        <tbody>
          {districts.map((district, index) => (
            <tr 
              key={district.district}
              onClick={() => onDistrictClick?.(district.district)}
              className={`
                border-b border-border/50 cursor-pointer transition-colors
                hover:bg-muted/50
                ${selectedDistrict?.toLowerCase() === district.district.toLowerCase() ? 'bg-primary/10' : ''}
              `}
            >
              <td className="py-2 pr-2 text-muted-foreground">{index + 1}</td>
              <td className="py-2 pr-2 font-medium">{district.district}</td>
              <td className="py-2 pr-2 text-muted-foreground">{(district as any).state || '-'}</td>
              <td className="py-2 text-right">
                <SeverityBadge 
                  severity={(district as any).severity_index || 0} 
                  severityClass={(district as any).severity_class || 'Low'} 
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SeverityBadge({ severity, severityClass }: { severity: number; severityClass: SeverityClass }) {
  const variant = severityClass === 'High' 
    ? 'destructive' 
    : severityClass === 'Moderate' 
    ? 'secondary' 
    : 'outline'

  return (
    <Badge 
      variant={variant}
      className="font-mono"
      style={{
        backgroundColor: getSeverityColor(severity),
        color: severityClass === 'Moderate' ? '#000' : '#fff',
        borderColor: 'transparent'
      }}
    >
      {formatSeverity(severity)}
    </Badge>
  )
}

function RankingsTableSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-16 ml-auto" />
        </div>
      ))}
    </div>
  )
}
