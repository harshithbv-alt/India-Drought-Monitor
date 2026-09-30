// Drought data types for the mapping system

export interface DroughtData {
  id: string
  district: string
  state: string | null
  month: string // ISO date string (YYYY-MM-DD)
  ndvi: number | null
  rainfall: number | null
  soil_moisture: number | null
  temperature: number | null
  evapotranspiration: number | null
  land_cover: string | null
  land_cover_encoded: number | null
  severity_index: number | null
  severity_class: SeverityClass | null
  created_at: string
  updated_at: string
}

export type SeverityClass = 'No Drought' | 'Mild' | 'Moderate' | 'Severe' | 'Extreme'

export interface ModelMetadata {
  id: string
  trained_at: string
  training_samples: number
  epochs: number
  loss: number
  val_loss: number
  model_weights: Record<string, unknown> | null
  normalization_params: NormalizationParams | null
  is_active: boolean
}

export interface NormalizationParams {
  [feature: string]: {
    min: number
    max: number
    mean: number
    std: number
  }
}

export interface Prediction {
  id: string
  district: string
  predicted_month: string
  ndvi_predicted: number | null
  rainfall_predicted: number | null
  soil_moisture_predicted: number | null
  temperature_predicted: number | null
  evapotranspiration_predicted: number | null
  severity_index_predicted: number | null
  severity_class_predicted: SeverityClass | null
  model_id: string
  created_at: string
}
export interface DistrictSummary {
  district: string
  month: string
  ndvi: number
  rainfall: number
  soil_moisture: number
  temperature: number
  evapotranspiration: number
  land_cover: number
}
// export interface DistrictSummary {
//   district: string
//   state: string | null
//   severity_index: number
//   severity_class: SeverityClass
//   ndvi: number | null
//   rainfall: number | null
//   soil_moisture: number | null
//   temperature: number | null
// }

export interface TimeSeriesDataPoint {
  month: string
  ndvi: number | null
  rainfall: number | null
  soil_moisture: number | null
  temperature: number | null
  evapotranspiration: number | null
  severity_index: number | null
}

// CSV import types
export interface CSVRow {
  District: string
  State?: string
  Month: string // YYYY-MM format expected
  NDVI?: string | number
  Rainfall?: string | number
  Soil_Moisture?: string | number
  Temperature?: string | number
  Evapotranspiration?: string | number
  Land_Cover?: string
}

// Feature weights for severity calculation
export const SEVERITY_WEIGHTS = {
  ndvi: 0.30,      // Higher weight - direct vegetation health indicator
  rainfall: 0.25,   // Precipitation deficit is key drought indicator
  soil_moisture: 0.25, // Critical for agricultural drought
  temperature: 0.10,   // Higher temps increase drought stress
  evapotranspiration: 0.10 // Water loss indicator
} as const

// Land cover encoding
export const LAND_COVER_ENCODING: Record<string, number> = {
  'Cropland': 0,
  'Forest': 1,
  'Grassland': 2,
  'Shrubland': 3,
  'Wetland': 4,
  'Urban': 5,
  'Barren': 6,
  'Water': 7,
  'Other': 8
}
