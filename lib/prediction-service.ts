/**
 * Prediction Service
 * Manages LSTM model training and predictions for drought forecasting
 */

import * as tf from '@tensorflow/tfjs'
import { createClient } from '@/lib/supabase/client'
import {
  buildModel,
  trainModel,
  predict,
  prepareSequences,
  normalizeData,
  getModelWeights,
  loadModelWeights,
  type TrainingData,
  type NormalizationStats
} from './lstm-model'
import { calculateSeverityIndex, classifySeverity } from './severity'
import type { DroughtData } from './types'

const supabase = createClient()

export interface PredictionResult {
  district: string
  predicted_month: string
  severity_index: number
  severity_class: string
  confidence?: number
}

export interface TrainingProgress {
  epoch: number
  totalEpochs: number
  loss: number
  valLoss?: number
  mae?: number
}

/**
 * Fetch historical data for a district and prepare for prediction
 */
async function fetchDistrictHistory(district: string): Promise<number[][] | null> {
  const { data, error } = await supabase
    .from('drought_data')
    .select('month, ndvi, rainfall, soil_moisture, temperature, evapotranspiration')
    .eq('district', district)
    .order('month', { ascending: true })
  
  if (error || !data || data.length < 12) {
    return null
  }
  
  // Convert to array format: [NDVI, Rainfall, SoilMoisture, Temperature, ET, Severity]
  return data.map(row => [
    row.ndvi ?? 0,
    row.rainfall ?? 0,
    row.soil_moisture ?? 0,
    row.temperature ?? 0,
    row.evapotranspiration ?? 0,
    calculateSeverityIndex({
      ndvi: row.ndvi,
      rainfall: row.rainfall,
      soil_moisture: row.soil_moisture,
      temperature: row.temperature,
      evapotranspiration: row.evapotranspiration
    })
  ])
}

/**
 * Fetch all training data from database
 */
export async function fetchAllTrainingData(): Promise<{
  data: Map<string, number[][]>
  districts: string[]
}> {
  const { data, error } = await supabase
    .from('drought_data')
    .select('district, month, ndvi, rainfall, soil_moisture, temperature, evapotranspiration')
    .order('district', { ascending: true })
    .order('month', { ascending: true })
  
  if (error) throw error
  
  // Group by district
  const districtData = new Map<string, number[][]>()
  
  for (const row of data || []) {
    if (!districtData.has(row.district)) {
      districtData.set(row.district, [])
    }
    
    districtData.get(row.district)!.push([
      row.ndvi ?? 0,
      row.rainfall ?? 0,
      row.soil_moisture ?? 0,
      row.temperature ?? 0,
      row.evapotranspiration ?? 0,
      calculateSeverityIndex({
        ndvi: row.ndvi,
        rainfall: row.rainfall,
        soil_moisture: row.soil_moisture,
        temperature: row.temperature,
        evapotranspiration: row.evapotranspiration
      })
    ])
  }
  
  return {
    data: districtData,
    districts: Array.from(districtData.keys())
  }
}

/**
 * Prepare combined training data from all districts
 */
export function combineDistrictData(
  districtData: Map<string, number[][]>,
  sequenceLength: number = 12
): { trainingData: TrainingData; normStats: NormalizationStats } {
  const allData: number[][] = []
  
  // Combine all district data
  districtData.forEach((data) => {
    if (data.length >= sequenceLength + 1) {
      allData.push(...data)
    }
  })
  
  // Normalize
  const { normalized, stats } = normalizeData(allData)
  
  // Prepare sequences
  const allSequences: number[][][] = []
  const allLabels: number[] = []
  
  districtData.forEach((data) => {
    if (data.length >= sequenceLength + 1) {
      // Normalize this district's data
      const { normalized: normDistrictData } = normalizeData(data, stats)
      
      // Create sequences
      for (let i = 0; i <= normDistrictData.length - sequenceLength - 1; i++) {
        const sequence = normDistrictData.slice(i, i + sequenceLength).map(row => row.slice(0, 5))
        const label = normDistrictData[i + sequenceLength][5] // Normalized severity
        
        if (sequence.every(s => s.every(v => !isNaN(v))) && !isNaN(label)) {
          allSequences.push(sequence)
          allLabels.push(label)
        }
      }
    }
  })
  
  return {
    trainingData: { sequences: allSequences, labels: allLabels },
    normStats: stats
  }
}

/**
 * Train the LSTM model with all available data
 */
export async function trainPredictionModel(
  onProgress?: (progress: TrainingProgress) => void,
  epochs: number = 50
): Promise<{
  modelId: string
  loss: number
  valLoss: number
  trainingSamples: number
}> {
  // Fetch all data
  const { data: districtData } = await fetchAllTrainingData()
  
  // Prepare training data
  const { trainingData, normStats } = combineDistrictData(districtData)
  
  if (trainingData.sequences.length < 10) {
    throw new Error(`Insufficient training data. Found ${trainingData.sequences.length} samples. Need at least 10 valid 12-month sequences. (Download the new Sample CSV and upload it)`)
  }
  
  // Train the model
  const { model, history } = await trainModel(
    trainingData,
    epochs,
    32,
    0.2,
    (epoch, logs) => {
      if (onProgress) {
        onProgress({
          epoch: epoch + 1,
          totalEpochs: epochs,
          loss: logs?.loss as number || 0,
          valLoss: logs?.val_loss as number,
          mae: logs?.mae as number
        })
      }
    }
  )
  
  // Get final metrics
  const finalLoss = history.history.loss[history.history.loss.length - 1] as number
  const finalValLoss = history.history.val_loss?.[history.history.val_loss.length - 1] as number
  
  // Save model weights to database
  const weights = await getModelWeights(model)
  
  // First, deactivate any existing active models
  await supabase
    .from('model_metadata')
    .update({ is_active: false })
    .eq('is_active', true)
  
  // Save new model
  const { data: modelData, error } = await supabase
    .from('model_metadata')
    .insert({
      training_samples: trainingData.sequences.length,
      epochs,
      loss: finalLoss,
      val_loss: finalValLoss,
      model_weights: weights,
      normalization_params: normStats,
      is_active: true
    })
    .select()
    .single()
  
  if (error) throw error
  
  // Clean up
  model.dispose()
  
  return {
    modelId: modelData.id,
    loss: finalLoss,
    valLoss: finalValLoss,
    trainingSamples: trainingData.sequences.length
  }
}

/**
 * Load the active model from database
 */
export async function loadActiveModel(): Promise<{
  model: tf.LayersModel
  normStats: NormalizationStats
  modelId: string
} | null> {
  const { data: modelData, error } = await supabase
    .from('model_metadata')
    .select('*')
    .eq('is_active', true)
    .single()
  
  if (error || !modelData) {
    console.log('[v0] No active model found in database')
    return null
  }
  
  if (!modelData.model_weights || !modelData.normalization_params) {
    console.log('[v0] Model data is incomplete - missing weights or normalization params')
    return null
  }
  
  const model = buildModel()
  
  try {
    await loadModelWeights(model, modelData.model_weights as Record<string, unknown>)
  } catch (err) {
    console.error('[v0] Failed to load model weights:', err)
    model.dispose()
    throw err
  }
  
  return {
    model,
    normStats: modelData.normalization_params as NormalizationStats,
    modelId: modelData.id
  }
}

/**
 * Generate predictions for all districts
 */
export async function generatePredictions(
  model: tf.LayersModel,
  normStats: NormalizationStats,
  modelId: string
): Promise<PredictionResult[]> {
  const { data: districtData } = await fetchAllTrainingData()
  const predictions: PredictionResult[] = []
  
  for (const [district, data] of districtData) {
    if (data.length < 12) continue
    
    // Get last 12 months
    const recentData = data.slice(-12)
    
    // Normalize
    const { normalized } = normalizeData(recentData, normStats)
    const sequence = normalized.map(row => row.slice(0, 5))
    
    // Predict
    const input = tf.tensor3d([sequence])
    const prediction = model.predict(input) as tf.Tensor
    const severityPredicted = (await prediction.data())[0]
    
    input.dispose()
    prediction.dispose()
    
    // Calculate next month
    const lastMonth = new Date(data[data.length - 1][0])
    const nextMonth = new Date(lastMonth)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    
    // Since we don't have the actual date in the data array, use current date + 1 month
    const now = new Date()
    const predictedMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    
    predictions.push({
      district,
      predicted_month: predictedMonth.toISOString().split('T')[0],
      severity_index: severityPredicted,
      severity_class: classifySeverity(severityPredicted)
    })
  }
  
  // Save predictions to database
  if (predictions.length > 0) {
    // Delete old predictions for this model
    await supabase
      .from('predictions')
      .delete()
      .eq('model_id', modelId)
    
    // Insert new predictions
    const { error } = await supabase
      .from('predictions')
      .insert(
        predictions.map(p => ({
          district: p.district,
          predicted_month: p.predicted_month,
          severity_index_predicted: p.severity_index,
          severity_class_predicted: p.severity_class,
          model_id: modelId
        }))
      )
    
    if (error) {
      console.error('Error saving predictions:', error)
    }
  }
  
  return predictions
}

/**
 * Get predictions for display
 */
export async function getStoredPredictions(): Promise<PredictionResult[]> {
  const { data, error } = await supabase
    .from('predictions')
    .select(`
      district,
      predicted_month,
      severity_index_predicted,
      severity_class_predicted,
      model_metadata!inner(is_active)
    `)
    .eq('model_metadata.is_active', true)
    .order('severity_index_predicted', { ascending: false })
  
  if (error) {
    console.error('Error fetching predictions:', error)
    return []
  }
  
  return (data || []).map(p => ({
    district: p.district,
    predicted_month: p.predicted_month,
    severity_index: p.severity_index_predicted || 0,
    severity_class: p.severity_class_predicted || 'Low'
  }))
}

/**
 * Predict multiple steps into the future for a specific district
 */
export async function predictMultiStep(
  district: string,
  steps: number = 6
): Promise<PredictionResult[]> {
  const modelData = await loadActiveModel()
  if (!modelData) throw new Error('No trained model found. Please train a model first.')
  const { model, normStats } = modelData

  // Fetch all history for district
  const { data, error } = await supabase
    .from('drought_data')
    .select('month, ndvi, rainfall, soil_moisture, temperature, evapotranspiration')
    .eq('district', district)
    .order('month', { ascending: true })

  if (error || !data || data.length < 12) {
    model.dispose()
    throw new Error('Insufficient historical data for this district (minimum 12 months required).')
  }

  // Convert to arrays
  const history = data.map(row => [
    row.ndvi ?? 0,
    row.rainfall ?? 0,
    row.soil_moisture ?? 0,
    row.temperature ?? 0,
    row.evapotranspiration ?? 0
  ])

  // Get last month
  const lastMonthStr = data[data.length - 1].month
  const lastMonthDate = new Date(lastMonthStr)

  const predictions: PredictionResult[] = []

  // Create a copy of the sequence we can append to.
  // Since we don't have future features, we'll use features from exactly 1 year ago for the next month's input
  const currentSequence = [...history]

  for (let step = 1; step <= steps; step++) {
    // We need 12 months of features to predict the next month's severity
    const sequenceToPredict = currentSequence.slice(-12)
    
    // Normalize this 12-month sequence
    const { normalized } = normalizeData(sequenceToPredict, normStats)
    const sequenceFeatures = normalized.map(row => row.slice(0, 5))

    const input = tf.tensor3d([sequenceFeatures])
    const predictionTensor = model.predict(input) as tf.Tensor
    const severityPredicted = (await predictionTensor.data())[0]
    
    input.dispose()
    predictionTensor.dispose()

    const predDate = new Date(lastMonthDate)
    predDate.setMonth(predDate.getMonth() + step)
    
    // Format YYYY-MM
    const predMonthStr = `${predDate.getFullYear()}-${String(predDate.getMonth() + 1).padStart(2, '0')}`

    predictions.push({
      district,
      predicted_month: predMonthStr,
      severity_index: severityPredicted,
      severity_class: classifySeverity(severityPredicted)
    })

    // To predict the next step after this, we need the features for `predMonthStr`.
    // We use the features from exactly 12 months before `predMonthStr` in our current sequence.
    const lastYearFeatures = currentSequence[currentSequence.length - 12]
    currentSequence.push(lastYearFeatures)
  }

  model.dispose()
  return predictions
}
