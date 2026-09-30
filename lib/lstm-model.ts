/**
 * LSTM Model for Drought Severity Prediction
 * Uses TensorFlow.js for browser-based training and inference
 */

import * as tf from '@tensorflow/tfjs'

// Model configuration
const SEQUENCE_LENGTH = 12 // 12 months of historical data
const NUM_FEATURES = 5 // NDVI, Rainfall, Soil Moisture, Temperature, ET
const HIDDEN_UNITS = 64
const OUTPUT_UNITS = 1 // Predicted severity index

export interface TrainingData {
  sequences: number[][][] // [samples][timesteps][features]
  labels: number[] // Target severity for next month
}

export interface NormalizationStats {
  min: number[]
  max: number[]
  mean: number[]
  std: number[]
}

export interface ModelTrainingResult {
  model: tf.LayersModel
  history: tf.History
  normStats: NormalizationStats
}

/**
 * Normalize features using min-max scaling
 */
export function normalizeData(
  data: number[][],
  stats?: NormalizationStats
): { normalized: number[][]; stats: NormalizationStats } {
  const numFeatures = data[0]?.length || NUM_FEATURES
  
  // Calculate statistics if not provided
  const min: number[] = []
  const max: number[] = []
  const mean: number[] = []
  const std: number[] = []
  
  if (stats) {
    min.push(...stats.min)
    max.push(...stats.max)
    mean.push(...stats.mean)
    std.push(...stats.std)
  } else {
    for (let f = 0; f < numFeatures; f++) {
      const values = data.map(row => row[f]).filter(v => !isNaN(v) && v !== null)
      min[f] = Math.min(...values)
      max[f] = Math.max(...values)
      mean[f] = values.reduce((a, b) => a + b, 0) / values.length
      std[f] = Math.sqrt(
        values.reduce((sum, v) => sum + Math.pow(v - mean[f], 2), 0) / values.length
      )
    }
  }
  
  // Normalize using min-max scaling
  const normalized = data.map(row => 
    row.map((val, f) => {
      const range = max[f] - min[f]
      if (range === 0) return 0
      return (val - min[f]) / range
    })
  )
  
  return {
    normalized,
    stats: { min, max, mean, std }
  }
}

/**
 * Denormalize a value back to original scale
 */
export function denormalize(
  value: number,
  featureIndex: number,
  stats: NormalizationStats
): number {
  const range = stats.max[featureIndex] - stats.min[featureIndex]
  return value * range + stats.min[featureIndex]
}

/**
 * Prepare training sequences from time series data
 * Each sequence is SEQUENCE_LENGTH months, predicting the next month's severity
 */
export function prepareSequences(
  data: number[][], // [timepoints][features + severity]
  sequenceLength: number = SEQUENCE_LENGTH
): TrainingData {
  const sequences: number[][][] = []
  const labels: number[] = []
  
  // Features are columns 0-4, severity is column 5
  for (let i = 0; i <= data.length - sequenceLength - 1; i++) {
    const sequence = data.slice(i, i + sequenceLength).map(row => row.slice(0, NUM_FEATURES))
    const label = data[i + sequenceLength][NUM_FEATURES] // Severity of next month
    
    // Only include if we have valid data
    if (sequence.every(s => s.every(v => !isNaN(v) && v !== null)) && !isNaN(label)) {
      sequences.push(sequence)
      labels.push(label)
    }
  }
  
  return { sequences, labels }
}

/**
 * Build the LSTM model architecture
 */
export function buildModel(): tf.LayersModel {
  const model = tf.sequential()
  
  // LSTM layer
  model.add(tf.layers.lstm({
    units: HIDDEN_UNITS,
    inputShape: [SEQUENCE_LENGTH, NUM_FEATURES],
    returnSequences: false,
    recurrentDropout: 0.1,
    dropout: 0.2
  }))
  
  // Dense layers for prediction
  model.add(tf.layers.dense({
    units: 32,
    activation: 'relu'
  }))
  
  model.add(tf.layers.dropout({ rate: 0.2 }))
  
  model.add(tf.layers.dense({
    units: OUTPUT_UNITS,
    activation: 'sigmoid' // Output between 0 and 1 for severity
  }))
  
  // Compile with Adam optimizer
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError',
    metrics: ['mae']
  })
  
  return model
}

/**
 * Train the LSTM model
 */
export async function trainModel(
  trainingData: TrainingData,
  epochs: number = 50,
  batchSize: number = 32,
  validationSplit: number = 0.2,
  onEpochEnd?: (epoch: number, logs: tf.Logs) => void
): Promise<{ history: tf.History; model: tf.LayersModel }> {
  const model = buildModel()
  
  // Convert to tensors
  const xs = tf.tensor3d(trainingData.sequences)
  const ys = tf.tensor2d(trainingData.labels.map(l => [l]))
  
  try {
    const history = await model.fit(xs, ys, {
      epochs,
      batchSize,
      validationSplit,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (onEpochEnd && logs) {
            onEpochEnd(epoch, logs)
          }
        }
      }
    })
    
    return { history, model }
  } finally {
    // Clean up tensors
    xs.dispose()
    ys.dispose()
  }
}

/**
 * Make prediction for a single sequence
 */
export async function predict(
  model: tf.LayersModel,
  sequence: number[][], // [SEQUENCE_LENGTH][NUM_FEATURES]
  normStats: NormalizationStats
): Promise<number> {
  // Normalize the input sequence
  const { normalized } = normalizeData(sequence, normStats)
  
  // Create tensor and predict
  const input = tf.tensor3d([normalized])
  
  try {
    const prediction = model.predict(input) as tf.Tensor
    const result = await prediction.data()
    prediction.dispose()
    
    // The output is already in 0-1 range (severity index)
    return result[0]
  } finally {
    input.dispose()
  }
}

/**
 * Save model weights to JSON (for storage in database)
 * Uses index-based storage to avoid name mismatches across model instances
 */
export async function getModelWeights(model: tf.LayersModel): Promise<Record<string, unknown>> {
  const weights: { index: number; shape: number[]; data: number[] }[] = []
  
  for (let i = 0; i < model.weights.length; i++) {
    const weight = model.weights[i]
    const data = await weight.read().data()
    weights.push({
      index: i,
      shape: weight.shape as number[],
      data: Array.from(data)
    })
  }
  
  return { weights, count: model.weights.length }
}

/**
 * Load model weights from JSON
 * Uses index-based loading to match weights correctly
 */
export async function loadModelWeights(
  model: tf.LayersModel,
  savedWeights: Record<string, unknown>
): Promise<void> {
  const weightsData = savedWeights as { 
    weights: { index: number; shape: number[]; data: number[] }[]
    count: number 
  }
  
  if (!weightsData.weights || !Array.isArray(weightsData.weights)) {
    throw new Error('Invalid model weights format. Please retrain the model.')
  }
  
  if (weightsData.count !== model.weights.length) {
    throw new Error(
      `Weight count mismatch: saved ${weightsData.count}, model expects ${model.weights.length}. Please retrain the model.`
    )
  }
  
  // Sort by index to ensure correct order
  const sortedWeights = [...weightsData.weights].sort((a, b) => a.index - b.index)
  
  const weightTensors: tf.Tensor[] = []
  
  try {
    for (const savedWeight of sortedWeights) {
      const tensor = tf.tensor(savedWeight.data, savedWeight.shape)
      weightTensors.push(tensor)
    }
    
    model.setWeights(weightTensors)
  } finally {
    // Clean up
    weightTensors.forEach(t => t.dispose())
  }
}

/**
 * Evaluate model performance
 */
export async function evaluateModel(
  model: tf.LayersModel,
  testData: TrainingData
): Promise<{ loss: number; mae: number }> {
  const xs = tf.tensor3d(testData.sequences)
  const ys = tf.tensor2d(testData.labels.map(l => [l]))
  
  try {
    const result = model.evaluate(xs, ys) as tf.Tensor[]
    const [loss, mae] = await Promise.all([
      result[0].data(),
      result[1].data()
    ])
    
    result.forEach(r => r.dispose())
    
    return {
      loss: loss[0],
      mae: mae[0]
    }
  } finally {
    xs.dispose()
    ys.dispose()
  }
}
