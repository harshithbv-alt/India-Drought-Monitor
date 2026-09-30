/**
 * CSV Parser utilities for drought data import
 */

import Papa from 'papaparse'
import { calculateSeverityIndex, classifySeverity, encodeLandCover } from './severity'
import type { CSVRow } from './types'

export interface ParsedDroughtRecord {
  district: string
  month: string // ISO date (YYYY-MM-01)
  ndvi: number | null
  rainfall: number | null
  soil_moisture: number | null
  temperature: number | null
  evapotranspiration: number | null
  land_cover: number | null
}

export interface ParseResult {
  success: boolean
  records: ParsedDroughtRecord[]
  errors: string[]
  warnings: string[]
}

/**
 * Parse CSV file content
 */
export function parseCSV(fileContent: string): Promise<ParseResult> {
  return new Promise((resolve) => {
    const records: ParsedDroughtRecord[] = []
    const errors: string[] = []
    const warnings: string[] = []
    
    Papa.parse<CSVRow>(fileContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        for (let i = 0; i < results.data.length; i++) {
          const row = results.data[i]
          const lineNum = i + 2 // +2 for header and 1-based indexing
          
          // Validate required fields
          if (!row.District) {
            errors.push(`Line ${lineNum}: Missing District name`)
            continue
          }
          
          if (!row.Month) {
            errors.push(`Line ${lineNum}: Missing Month`)
            continue
          }
          
          // Parse month - expect YYYY-MM format
          let monthDate: string
          try {
            const monthStr = String(row.Month)
            if (monthStr.match(/^\d{4}-\d{2}$/)) {
              monthDate = `${monthStr}-01`
            } else if (monthStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // Already full date, use first of month
              monthDate = monthStr.substring(0, 7) + '-01'
            } else {
              throw new Error(`Invalid format: ${monthStr}`)
            }
            
            // Validate date
            const testDate = new Date(monthDate)
            if (isNaN(testDate.getTime())) {
              throw new Error('Invalid date')
            }
          } catch {
            errors.push(`Line ${lineNum}: Invalid Month format "${row.Month}". Expected YYYY-MM`)
            continue
          }
          
          // Parse numeric values
          const ndvi = parseNumericValue(row.NDVI)
          const rainfall = parseNumericValue(row.Rainfall)
          const soilMoisture = parseNumericValue(row.Soil_Moisture)
          const temperature = parseNumericValue(row.Temperature)
          const evapotranspiration = parseNumericValue(row.Evapotranspiration)
          
          // Validate ranges and add warnings
          if (ndvi !== null && (ndvi < -1 || ndvi > 1)) {
            warnings.push(`Line ${lineNum}: NDVI ${ndvi} outside typical range [-1, 1]`)
          }
          
          if (soilMoisture !== null && (soilMoisture < 0 || soilMoisture > 1)) {
            warnings.push(`Line ${lineNum}: Soil Moisture ${soilMoisture} outside typical range [0, 1]`)
          }
          
          // Calculate severity
          const severityIndex = calculateSeverityIndex({
            ndvi,
            rainfall,
            soil_moisture: soilMoisture,
            temperature,
            evapotranspiration
          })
          
          const severityClass = classifySeverity(severityIndex)
          
          // Land cover encoding
          const landCover = row.Land_Cover || null
          const landCoverEncoded = landCover ? encodeLandCover(landCover) : null
          
          records.push({
            district: String(row.District).trim(),
            month: monthDate,
            ndvi,
            rainfall,
            soil_moisture: soilMoisture,
            temperature,
            evapotranspiration,
            land_cover: landCoverEncoded
          })
        }
        
        resolve({
          success: errors.length === 0,
          records,
          errors,
          warnings
        })
      },
      error: (error: any) => {
        resolve({
          success: false,
          records: [],
          errors: [`CSV parsing error: ${error.message}`],
          warnings: []
        })
      }
    })
  })
}

/**
 * Parse a potentially string numeric value
 */
function parseNumericValue(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null || value === '') {
    return null
  }
  
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  return isNaN(num) ? null : num
}

export function generateSampleCSV(): string {
  const headers = ['District', 'Month', 'NDVI', 'Rainfall', 'Soil_Moisture', 'Temperature', 'Evapotranspiration', 'Land_Cover']
  const districts = ['Mumbai', 'Pune', 'Chennai', 'Delhi', 'Bangalore']
  const sampleData: string[][] = []
  
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 23)
  startDate.setDate(1)
  
  for (const district of districts) {
    // Give each district a distinct profile so the AI model learns correct trends
    const isDry = district === 'Chennai' || district === 'Delhi'
    
    for (let monthOffset = 0; monthOffset < 24; monthOffset++) {
      const currentDate = new Date(startDate)
      currentDate.setMonth(startDate.getMonth() + monthOffset)
      const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      
      // Base values depending on district profile
      const ndviBase = isDry ? 0.2 : 0.6
      const rainBase = isDry ? 10 : 80
      const soilBase = isDry ? 0.15 : 0.35
      const tempBase = isDry ? 35 : 25
      const etBase = isDry ? 6 : 3
      
      // Add slight random variations
      const ndvi = (ndviBase + (Math.random() * 0.1 - 0.05)).toFixed(3)
      const rainfall = Math.max(0, rainBase + (Math.random() * 20 - 10)).toFixed(1)
      const soilMoisture = (soilBase + (Math.random() * 0.05 - 0.025)).toFixed(3)
      const temp = (tempBase + (Math.random() * 4 - 2)).toFixed(1)
      const et = (etBase + (Math.random() * 1 - 0.5)).toFixed(1)
      const landCover = isDry ? 'Urban' : 'Forest'
      
      sampleData.push([district, monthStr, ndvi, rainfall, soilMoisture, temp, et, landCover])
    }
  }
  
  const rows = [headers.join(','), ...sampleData.map(row => row.join(','))]
  return rows.join('\n')
}
