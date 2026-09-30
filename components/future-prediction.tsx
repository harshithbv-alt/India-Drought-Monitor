'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { predictMultiStep, type PredictionResult } from '@/lib/prediction-service'
import { useDistrictTimeSeries, useLatestDroughtData } from '@/hooks/use-drought-data'

interface FuturePredictionProps {
  district: string | null
}

const chartConfig: ChartConfig = {
  historical_severity: {
    label: 'Historical Severity',
    color: '#6B7280'
  },
  predicted_severity: {
    label: 'Predicted Severity',
    color: '#EF4444'
  }
}

export function FuturePrediction({ district }: FuturePredictionProps) {
  const [predictions, setPredictions] = useState<PredictionResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: historicalData } = useDistrictTimeSeries(district)
  const { data: latestData } = useLatestDroughtData()

  useEffect(() => {
    let isMounted = true

    async function fetchPredictions() {
      if (!district) {
        setPredictions([])
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const results = await predictMultiStep(district, 6)
        if (isMounted) setPredictions(results)
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to generate predictions')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchPredictions()

    return () => { isMounted = false }
  }, [district])

  if (!district) return null

  // Prepare chart data combining historical and predicted
  const chartData: any[] = []
  
  if (historicalData && historicalData.length > 0) {
    const last6Months = historicalData.slice(-6)
    last6Months.forEach((d, index) => {
      const monthsAgo = last6Months.length - 1 - index;
      let monthLabel = '';
      if (monthsAgo === 0) monthLabel = 'Current Month';
      else if (monthsAgo === 1) monthLabel = '1 Month Before';
      else monthLabel = `${monthsAgo} Months Before`;

      chartData.push({
        month: monthLabel,
        historical_severity: d.severity_index != null ? Number((d.severity_index * 100).toFixed(1)) : null,
        predicted_severity: null
      })
    })
    
    // Bridge point to connect solid and dashed line seamlessly
    chartData[chartData.length - 1].predicted_severity = chartData[chartData.length - 1].historical_severity
  }

  predictions.forEach((p, index) => {
    const monthsAhead = index + 1;
    const monthLabel = monthsAhead === 1 ? '1 Month Ahead' : `${monthsAhead} Months Ahead`;
    chartData.push({
      month: monthLabel,
      historical_severity: null,
      predicted_severity: Number((p.severity_index * 100).toFixed(1))
    })
  })

  // Generate AI Summary
  let summary = "Awaiting prediction data..."
  if (predictions.length > 0) {
    const avgPred = predictions.reduce((acc, p) => acc + p.severity_index, 0) / predictions.length
    const trend = predictions[predictions.length - 1].severity_index - predictions[0].severity_index
    const trendText = trend > 0.05 ? "increasing" : trend < -0.05 ? "decreasing" : "stable"
    const riskLevel = avgPred > 0.8 ? "EXTREME" : avgPred > 0.6 ? "SEVERE" : avgPred > 0.4 ? "MODERATE" : avgPred > 0.2 ? "MILD" : "NO DROUGHT"
    
    // Find latest params
    const distParams = latestData?.find(d => d.district.toLowerCase() === district.toLowerCase())
    let contextStr = ""
    if (distParams) {
       const reasons = []
       if (distParams.rainfall && distParams.rainfall < 50) reasons.push("low rainfall")
       if (distParams.ndvi && distParams.ndvi < 0.3) reasons.push("poor vegetation index")
       if (distParams.temperature && distParams.temperature > 35) reasons.push("high temperatures")
       if (reasons.length > 0) {
         contextStr = ` due to ${reasons.join(" and ")}.`
       } else {
         contextStr = ` based on current stable indicators.`
       }
    }
    
    summary = `${district} is expected to remain under ${riskLevel.toLowerCase()} drought risk with predicted severity averaging ${(avgPred * 100).toFixed(0)}% for upcoming months${contextStr}`
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="overflow-hidden border-2 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 bg-muted/50">
          <CardTitle className="text-lg">Future Drought Prediction &ndash; {district}</CardTitle>
          <CardDescription>
            AI-powered severity prediction for the next 6 months
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
             <div className="space-y-4">
               <Skeleton className="h-[250px] w-full" />
               <Skeleton className="h-16 w-full" />
               <Skeleton className="h-[200px] w-full" />
             </div>
          ) : error ? (
            <div className="text-red-500 text-sm p-4 bg-red-50 rounded border border-red-200">
              {error}
            </div>
          ) : predictions.length === 0 ? (
            <div className="text-muted-foreground p-4 text-center">
              No predictions available for this district. Please train the model.
            </div>
          ) : (
            <div className="space-y-8">
              {/* Chart */}
              <div className="h-[300px]">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis 
                      tick={{ fontSize: 11 }} 
                      tickLine={false} 
                      axisLine={false} 
                      domain={[0, 100]} 
                      label={{ value: 'Drought Severity (%)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6B7280' } }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend verticalAlign="top" height={36} />
                    <Line 
                      type="monotone" 
                      dataKey="historical_severity" 
                      stroke="#6B7280" 
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                      name="Historical Severity"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="predicted_severity" 
                      stroke="#EF4444" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                      name="Predicted Severity"
                    />
                  </LineChart>
                </ChartContainer>
              </div>

              {/* AI Summary */}
              <div className="bg-primary/5 p-5 rounded-lg border border-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                <h4 className="font-semibold text-sm mb-2 text-primary flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  AI Interpretation Summary
                </h4>
                <p className="text-sm text-foreground/80 leading-relaxed font-medium">{summary}</p>
              </div>

              {/* Table */}
              <div className="rounded-md border shadow-sm">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold">Month</TableHead>
                      <TableHead className="font-semibold">Predicted Index</TableHead>
                      <TableHead className="font-semibold">Severity Class</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {predictions.map((p, index) => (
                      <TableRow key={`${district}-${index}`} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">
                          {index === 0 ? '1 Month Ahead' : `${index + 1} Months Ahead`}
                        </TableCell>
                        <TableCell>{(p.severity_index * 100).toFixed(0)}%</TableCell>
                        <TableCell>
                          <Badge 
                            variant={p.severity_class === 'Extreme' || p.severity_class === 'Severe' ? 'destructive' : p.severity_class === 'Moderate' ? 'default' : 'secondary'}
                            className={`
                              ${p.severity_class === 'Extreme' ? 'bg-[#991B1B] hover:bg-[#7f1d1d] text-white' : ''}
                              ${p.severity_class === 'Severe' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
                              ${p.severity_class === 'Moderate' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}
                              ${p.severity_class === 'Mild' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
                              ${p.severity_class === 'No Drought' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                            `}
                          >
                            {p.severity_class}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
