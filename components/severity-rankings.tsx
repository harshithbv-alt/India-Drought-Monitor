'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useTopSeverityDistricts, useLowestSeverityDistricts } from '@/hooks/use-drought-data'

export function TopHighSeverityDistricts({ month, onDistrictClick }: { month?: string, onDistrictClick?: (d: string) => void }) {
  const { data, isLoading, error } = useTopSeverityDistricts(month)

  if (error) {
    return (
      <Card className="border-2 shadow-sm border-red-200">
        <CardHeader className="pb-2 bg-red-50">
          <CardTitle className="text-lg text-red-900">Top 20 High Severity Districts</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 text-sm text-red-500">Failed to load ranking data.</CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 bg-muted/30">
        <CardTitle className="text-lg">Top 20 High Severity Districts</CardTitle>
        <CardDescription>Districts with the most critical drought conditions (Highest to Lowest)</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 p-0">
        {isLoading ? (
          <div className="p-4 space-y-4">
             <Skeleton className="h-8 w-full" />
             <Skeleton className="h-8 w-full" />
             <Skeleton className="h-8 w-full" />
             <Skeleton className="h-8 w-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">No data available.</div>
        ) : (
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="font-semibold text-center w-12">Rank</TableHead>
                  <TableHead className="font-semibold">District</TableHead>
                  <TableHead className="font-semibold text-right">Severity Index</TableHead>
                  <TableHead className="font-semibold text-center w-32">Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d: any, index: number) => {
                  const severityClass = d.severity_class || 'N/A'
                  return (
                    <TableRow 
                      key={d.district} 
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => onDistrictClick && onDistrictClick(d.district)}
                    >
                      <TableCell className="text-center font-bold text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{d.district}</TableCell>
                      <TableCell className="text-right">{((d.severity_index || 0) * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={severityClass === 'Extreme' || severityClass === 'Severe' ? 'destructive' : severityClass === 'Moderate' ? 'default' : 'secondary'}
                          className={`
                            ${severityClass === 'Extreme' ? 'bg-[#991B1B] hover:bg-[#7f1d1d] text-white' : ''}
                            ${severityClass === 'Severe' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
                            ${severityClass === 'Moderate' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}
                            ${severityClass === 'Mild' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
                            ${severityClass === 'No Drought' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                          `}
                        >
                          {severityClass}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function TopLowSeverityDistricts({ month, onDistrictClick }: { month?: string, onDistrictClick?: (d: string) => void }) {
  const { data, isLoading, error } = useLowestSeverityDistricts(month)

  if (error) {
    return (
      <Card className="border-2 shadow-sm border-red-200">
        <CardHeader className="pb-2 bg-red-50">
          <CardTitle className="text-lg text-red-900">Top 20 Low Severity Districts</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 text-sm text-red-500">Failed to load ranking data.</CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 bg-muted/30">
        <CardTitle className="text-lg">Top 20 Low Severity Districts</CardTitle>
        <CardDescription>Districts with the least drought conditions (Lowest to Highest)</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 p-0">
        {isLoading ? (
          <div className="p-4 space-y-4">
             <Skeleton className="h-8 w-full" />
             <Skeleton className="h-8 w-full" />
             <Skeleton className="h-8 w-full" />
             <Skeleton className="h-8 w-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">No data available.</div>
        ) : (
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="font-semibold text-center w-12">Rank</TableHead>
                  <TableHead className="font-semibold">District</TableHead>
                  <TableHead className="font-semibold text-right">Severity Index</TableHead>
                  <TableHead className="font-semibold text-center w-32">Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d: any, index: number) => {
                  const severityClass = d.severity_class || 'N/A'
                  return (
                    <TableRow 
                      key={d.district} 
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => onDistrictClick && onDistrictClick(d.district)}
                    >
                      <TableCell className="text-center font-bold text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{d.district}</TableCell>
                      <TableCell className="text-right">{((d.severity_index || 0) * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={severityClass === 'Extreme' || severityClass === 'Severe' ? 'destructive' : severityClass === 'Moderate' ? 'default' : 'secondary'}
                          className={`
                            ${severityClass === 'Extreme' ? 'bg-[#991B1B] hover:bg-[#7f1d1d] text-white' : ''}
                            ${severityClass === 'Severe' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
                            ${severityClass === 'Moderate' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}
                            ${severityClass === 'Mild' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
                            ${severityClass === 'No Drought' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                          `}
                        >
                          {severityClass}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
