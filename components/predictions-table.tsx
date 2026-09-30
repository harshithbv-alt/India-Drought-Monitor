'use client'

import { useStoredPredictions } from '@/hooks/use-drought-data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function PredictionsTable() {
  const { data, isLoading, error } = useStoredPredictions()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Predictions for Next Month</CardTitle>
          <CardDescription>Loading LSTM forecasts...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Predictions for Next Month</CardTitle>
          <CardDescription>No predictions found. Train a model and generate predictions in the Admin Panel.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Predictions for Next Month</CardTitle>
        <CardDescription>LSTM-based drought severity forecast</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3 rounded-tl-md">District</th>
                <th className="px-4 py-3">Predicted Month</th>
                <th className="px-4 py-3">Severity Class</th>
                <th className="px-4 py-3 rounded-tr-md">Index</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 10).map((p, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{p.district}</td>
                  <td className="px-4 py-3">{p.predicted_month}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.severity_class === 'High' ? 'destructive' : p.severity_class === 'Moderate' ? 'default' : 'secondary'}>
                      {p.severity_class}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{(p.severity_index * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
