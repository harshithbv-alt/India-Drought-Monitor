'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts'
import { useDistrictTimeSeries } from '@/hooks/use-drought-data'

interface TimeSeriesChartProps {
  district: string | null
}

const chartConfig: ChartConfig = {
  severity_index: {
    label: 'Severity Index',
    color: '#EF4444'
  },
  ndvi: {
    label: 'NDVI',
    color: '#22C55E'
  },
  rainfall: {
    label: 'Rainfall (mm)',
    color: '#3B82F6'
  },
  soil_moisture: {
    label: 'Soil Moisture',
    color: '#8B5CF6'
  },
  temperature: {
    label: 'Temperature (C)',
    color: '#F97316'
  }
}

export function TimeSeriesChart({ district }: TimeSeriesChartProps) {
  const { data: timeSeriesData, isLoading } = useDistrictTimeSeries(district)

  if (!district) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">District Time Series</CardTitle>
          <CardDescription>
            Select a district from the map or rankings to view historical data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No district selected
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">District Time Series</CardTitle>
          <CardDescription>Loading data for {district}...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const chartData = (timeSeriesData || []).map(d => ({
    ...d,
    month: new Date(d.month).toLocaleDateString('en-US', { year: '2-digit', month: 'short' }),
    severity_index: d.severity_index ? Number((d.severity_index * 100).toFixed(1)) : null
  }))

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">District Time Series: {district}</CardTitle>
          <CardDescription>
            No historical data available for this district
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No time series data
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">District Time Series: {district}</CardTitle>
        <CardDescription>
          Historical drought indicators over time ({chartData.length} months)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              label={{ value: 'Severity %', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="severity_index" 
              stroke="#EF4444" 
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Severity (%)"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="ndvi" 
              stroke="#22C55E" 
              strokeWidth={1.5}
              dot={false}
              name="NDVI"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="rainfall" 
              stroke="#3B82F6" 
              strokeWidth={1.5}
              dot={false}
              name="Rainfall"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
