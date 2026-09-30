'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { DistrictSummary, TimeSeriesDataPoint } from '@/lib/types'
import { getStoredPredictions } from '@/lib/prediction-service'
import { calculateSeverityIndex, classifySeverity } from '@/lib/severity'

const supabase = createClient()

/**
 * Hook to fetch latest drought data for all districts
 */
export function useLatestDroughtData(month?: string) {
  return useSWR<DistrictSummary[]>(
    ['latest-drought-data', month],
    async () => {
      let query = supabase
        .from('drought_data')
        .select('district, month, ndvi, rainfall, soil_moisture, temperature, evapotranspiration, land_cover')

      if (month) {
        query = query.eq('month', month)
      } else {
        const { data: latestMonth } = await supabase
          .from('drought_data')
          .select('month')
          .order('month', { ascending: false })
          .limit(1)
          .single()

        if (latestMonth) {
          query = query.eq('month', latestMonth.month)
        }
      }

      const { data, error } = await query
      if (error) throw error

      return (data || []).map((row: any) => {
        const severity = calculateSeverityIndex(row)
        return {
          ...row,
          severity_index: severity,
          severity_class: classifySeverity(severity)
        }
      }) as DistrictSummary[]
    },
    { refreshInterval: 60000 }
  )
}

/**
 * Hook to fetch available months
 */
export function useAvailableMonths() {
  return useSWR<string[]>(
    'available-months',
    async () => {
      const { data, error } = await supabase
        .from('drought_data')
        .select('month')
        .order('month', { ascending: false })

      if (error) throw error

      const months = [...new Set((data || []).map(d => d.month))]
      return months
    }
  )
}

/**
 * Hook to fetch time series data for a district
 */
export function useDistrictTimeSeries(district: string | null) {
  return useSWR<TimeSeriesDataPoint[]>(
    district ? ['district-time-series', district] : null,
    async () => {
      if (!district) return []

      const { data, error } = await supabase
        .from('drought_data')
        .select('month, ndvi, rainfall, soil_moisture, temperature, evapotranspiration')
        .eq('district', district)
        .order('month', { ascending: true })

      if (error) throw error

      return (data || []).map(row => {
        const severity = calculateSeverityIndex(row)
        return {
          ...row,
          severity_index: severity
        }
      }) as TimeSeriesDataPoint[]
    }
  )
}

/**
 * Get top 20 districts with highest severity
 */
export function useTopSeverityDistricts(month?: string) {
  const { data, isLoading, error } = useLatestDroughtData(month)
  
  return {
    data: data ? [...data].sort((a, b) => ((b as any).severity_index || 0) - ((a as any).severity_index || 0)).slice(0, 20) : [],
    isLoading,
    error
  }
}

/**
 * Get top 20 districts with lowest severity
 */
export function useLowestSeverityDistricts(month?: string) {
  const { data, isLoading, error } = useLatestDroughtData(month)
  
  return {
    data: data ? [...data].sort((a, b) => ((a as any).severity_index || 0) - ((b as any).severity_index || 0)).slice(0, 20) : [],
    isLoading,
    error
  }
}

/**
 * Search districts
 */
export function useSearchDistricts(searchTerm: string) {
  return useSWR<string[]>(
    searchTerm.length >= 2 ? ['search-districts', searchTerm] : null,
    async () => {
      const { data, error } = await supabase
        .from('drought_data')
        .select('district')
        .ilike('district', `%${searchTerm}%`)
        .limit(10)

      if (error) throw error

      const districts = [...new Set((data || []).map(d => d.district))]
      return districts
    }
  )
}

/**
 * Summary stats for the given month
 */
export function useSummaryStats(month?: string) {
  const { data, isLoading, error } = useLatestDroughtData(month)
  
  return {
    data: data ? {
      total: data.length,
      extreme: data.filter(d => (d as any).severity_class === 'Extreme').length,
      severe: data.filter(d => (d as any).severity_class === 'Severe').length,
      moderate: data.filter(d => (d as any).severity_class === 'Moderate').length,
      mild: data.filter(d => (d as any).severity_class === 'Mild').length,
      noDrought: data.filter(d => (d as any).severity_class === 'No Drought').length,
      avgSeverity: data.length > 0 ? data.reduce((acc, d) => acc + ((d as any).severity_index || 0), 0) / data.length : 0
    } : { total: 0, extreme: 0, severe: 0, moderate: 0, mild: 0, noDrought: 0, avgSeverity: 0 },
    isLoading,
    error
  }
}

/**
 * Fetch stored LSTM predictions
 */
export function useStoredPredictions() {
  return useSWR('stored-predictions', getStoredPredictions, {
    refreshInterval: 60000
  })
}