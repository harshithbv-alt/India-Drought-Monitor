// Severity calculation utilities for drought assessment

import { SEVERITY_WEIGHTS, LAND_COVER_ENCODING, type SeverityClass } from './types'

// Normalization ranges rebalanced for realistic severity distribution
const FEATURE_RANGES = {
  ndvi: { min: 0.1, max: 0.7 },      // Adjusted to prevent severe penalty on normal vegetation
  rainfall: { min: 0, max: 250 },      // Capped at 250mm to prevent massive penalties during non-monsoon
  soil_moisture: { min: 0.05, max: 0.35 }, // Adjusted for typical variations
  temperature: { min: 15, max: 45 },   // Temperature in Celsius
  evapotranspiration: { min: 1, max: 10 } // ET in mm/day
}

/**
 * Normalize a value to 0-1 range
 * For drought severity: lower NDVI, rainfall, soil_moisture = higher drought risk
 * Higher temperature, evapotranspiration = higher drought risk
 */
function normalizeFeature(
  value: number | null | undefined,
  feature: keyof typeof FEATURE_RANGES
): number {
  if (value === null || value === undefined || isNaN(value)) {
    return 0.5 // Neutral if missing
  }
  
  const { min, max } = FEATURE_RANGES[feature]
  const clamped = Math.max(min, Math.min(max, value))
  return (clamped - min) / (max - min)
}

/**
 * Calculate drought severity index (0 to 1, where 1 is most severe)
 * Uses weighted combination of normalized features
 */
export function calculateSeverityIndex(data: {
  ndvi?: number | null
  rainfall?: number | null
  soil_moisture?: number | null
  temperature?: number | null
  evapotranspiration?: number | null
}): number {
  // Normalize each feature
  const ndviNorm = normalizeFeature(data.ndvi, 'ndvi')
  const rainfallNorm = normalizeFeature(data.rainfall, 'rainfall')
  const soilMoistureNorm = normalizeFeature(data.soil_moisture, 'soil_moisture')
  const tempNorm = normalizeFeature(data.temperature, 'temperature')
  const etNorm = normalizeFeature(data.evapotranspiration, 'evapotranspiration')
  
  // For drought severity:
  // - Low NDVI = high drought (invert: 1 - normalized)
  // - Low rainfall = high drought (invert)
  // - Low soil moisture = high drought (invert)
  // - High temperature = high drought (don't invert)
  // - High ET = high drought (don't invert)
  
  const severity = 
    SEVERITY_WEIGHTS.ndvi * (1 - ndviNorm) +
    SEVERITY_WEIGHTS.rainfall * (1 - rainfallNorm) +
    SEVERITY_WEIGHTS.soil_moisture * (1 - soilMoistureNorm) +
    SEVERITY_WEIGHTS.temperature * tempNorm +
    SEVERITY_WEIGHTS.evapotranspiration * etNorm
  
  // Clamp to 0-1 range
  return Math.max(0, Math.min(1, severity))
}

/**
 * Classify severity into categories
 * Rebalanced thresholds to match the mathematical reality of the formula
 */
export function classifySeverity(severityIndex: number): SeverityClass {
  if (severityIndex <= 0.20) return 'No Drought'
  if (severityIndex <= 0.40) return 'Mild'
  if (severityIndex <= 0.60) return 'Moderate'
  if (severityIndex <= 0.80) return 'Severe'
  return 'Extreme'
}

/**
 * Get color for severity level
 */
export function getSeverityColor(severityIndex: number | null): string {
  if (severityIndex === null) return '#E5E7EB' // Gray for no data
  
  if (severityIndex <= 0.20) return '#22C55E' // Green for No Drought
  if (severityIndex <= 0.40) return '#EAB308' // Yellow for Mild
  if (severityIndex <= 0.60) return '#F97316' // Orange for Moderate
  if (severityIndex <= 0.80) return '#EF4444' // Red for Severe
  return '#991B1B' // Dark Red for Extreme
}

/**
 * Get gradient color based on severity (for smoother visualization)
 * Now returning solid colors as requested
 */
export function getSeverityGradientColor(severityIndex: number | null): string {
  return getSeverityColor(severityIndex)
}

/**
 * Encode land cover category to numeric value
 */
export function encodeLandCover(landCover: string | null | undefined): number {
  if (!landCover) return LAND_COVER_ENCODING['Other']
  return LAND_COVER_ENCODING[landCover] ?? LAND_COVER_ENCODING['Other']
}

/**
 * Format severity for display
 */
export function formatSeverity(severityIndex: number | null): string {
  if (severityIndex === null) return 'N/A'
  return `${(severityIndex * 100).toFixed(1)}%`
}
