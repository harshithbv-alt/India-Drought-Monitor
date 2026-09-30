'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { parseCSV, generateSampleCSV, type ParseResult } from '@/lib/csv-parser'
import { createClient } from '@/lib/supabase/client'
import { trainPredictionModel, loadActiveModel, generatePredictions, type TrainingProgress } from '@/lib/prediction-service'
import useSWR from 'swr'

const supabase = createClient()

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Back to Dashboard
            </Link>
            <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6">
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="upload">Data Upload</TabsTrigger>
            <TabsTrigger value="training">Model Training</TabsTrigger>
            <TabsTrigger value="status">System Status</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <CSVUploadSection />
          </TabsContent>

          <TabsContent value="training" className="space-y-6">
            <ModelTrainingSection />
          </TabsContent>

          <TabsContent value="status" className="space-y-6">
            <SystemStatusSection />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function CSVUploadSection() {
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    
    setFile(selectedFile)
    setParseResult(null)
    setUploadResult(null)
    
    const content = await selectedFile.text()
    const result = await parseCSV(content)
    setParseResult(result)
  }, [])

  const handleUpload = useCallback(async () => {
    if (!parseResult || parseResult.records.length === 0) return
    
    setIsUploading(true)
    setUploadProgress(0)
    setUploadResult(null)
    
    try {
      // Clear old data to prevent messy duplicates without needing a database constraint!
      await supabase.from('drought_data').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      // Also clear old predictions so they don't linger and confuse the user!
      await supabase.from('predictions').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      const records = parseResult.records
      const batchSize = 100
      let uploaded = 0
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize)
        
        const { error } = await supabase
          .from('drought_data')
          .insert(batch)
        
        if (error) throw error
        
        uploaded += batch.length
        setUploadProgress(Math.round((uploaded / records.length) * 100))
      }
      
      setUploadResult({ success: true, message: `Successfully uploaded ${records.length} records` })
    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadResult({ success: false, message: `Upload failed: ${error?.message || 'Unknown error'}` })
    } finally {
      setIsUploading(false)
    }
  }, [parseResult])

  const downloadSample = useCallback(() => {
    const csv = generateSampleCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'drought_data_sample.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Upload Drought Data</CardTitle>
          <CardDescription>Upload a CSV file with drought metrics for Indian districts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">CSV File</label>
            <Input type="file" accept=".csv" onChange={handleFileChange} disabled={isUploading} />
          </div>

          <Button variant="outline" size="sm" onClick={downloadSample}>Download Sample CSV</Button>

          {parseResult && (
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Badge variant={parseResult.success ? 'default' : 'destructive'}>
                  {parseResult.success ? 'Valid' : 'Has Errors'}
                </Badge>
                <span className="text-sm text-muted-foreground">{parseResult.records.length} records parsed</span>
              </div>

              {parseResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTitle>Errors ({parseResult.errors.length})</AlertTitle>
                  <AlertDescription className="max-h-32 overflow-y-auto text-sm">
                    <ul className="list-disc pl-4">
                      {parseResult.errors.slice(0, 10).map((err, i) => (<li key={i}>{err}</li>))}
                      {parseResult.errors.length > 10 && (<li>...and {parseResult.errors.length - 10} more errors</li>)}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {parseResult.warnings.length > 0 && (
                <Alert>
                  <AlertTitle>Warnings ({parseResult.warnings.length})</AlertTitle>
                  <AlertDescription className="max-h-32 overflow-y-auto text-sm">
                    <ul className="list-disc pl-4">
                      {parseResult.warnings.slice(0, 5).map((warn, i) => (<li key={i}>{warn}</li>))}
                      {parseResult.warnings.length > 5 && (<li>...and {parseResult.warnings.length - 5} more warnings</li>)}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-muted-foreground text-center">Uploading... {uploadProgress}%</p>
            </div>
          )}

          {uploadResult && (
            <Alert variant={uploadResult.success ? 'default' : 'destructive'}>
              <AlertDescription>{uploadResult.message}</AlertDescription>
            </Alert>
          )}

          <Button className="w-full" onClick={handleUpload} disabled={!parseResult || parseResult.records.length === 0 || isUploading}>
            {isUploading ? 'Uploading...' : 'Upload to Database'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CSV Format</CardTitle>
          <CardDescription>Required columns and data format</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium">Required Columns:</h4>
              <ul className="list-disc pl-4 text-muted-foreground">
                <li><code>District</code> - District name (required)</li>
                <li><code>Month</code> - Format: YYYY-MM (required)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium">Optional Columns:</h4>
              <ul className="list-disc pl-4 text-muted-foreground">
                <li><code>State</code> - State name</li>
                <li><code>NDVI</code> - Normalized Difference Vegetation Index (-1 to 1)</li>
                <li><code>Rainfall</code> - Monthly rainfall in mm</li>
                <li><code>Soil_Moisture</code> - Volumetric water content (0 to 1)</li>
                <li><code>Temperature</code> - Average temperature in Celsius</li>
                <li><code>Evapotranspiration</code> - ET in mm/day</li>
                <li><code>Land_Cover</code> - Cropland, Forest, Urban, etc.</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium">Notes:</h4>
              <ul className="list-disc pl-4 text-muted-foreground">
                <li>Severity index is calculated automatically</li>
                <li>Existing records are updated on re-upload</li>
                <li>Need 12+ months per district for LSTM predictions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ModelTrainingSection() {
  const [isTraining, setIsTraining] = useState(false)
  const [progress, setProgress] = useState<TrainingProgress | null>(null)
  const [trainingResult, setTrainingResult] = useState<{
    success: boolean
    message: string
    details?: { loss: number; valLoss: number; samples: number }
  } | null>(null)
  const [isPredicting, setIsPredicting] = useState(false)

  const handleTrain = useCallback(async () => {
    setIsTraining(true)
    setProgress(null)
    setTrainingResult(null)
    
    try {
      const result = await trainPredictionModel((p) => setProgress(p), 50)
      setTrainingResult({
        success: true,
        message: 'Model trained successfully!',
        details: { loss: result.loss, valLoss: result.valLoss, samples: result.trainingSamples }
      })
    } catch (error: any) {
      console.error('Training error:', error)
      setTrainingResult({ success: false, message: `Training failed: ${error?.message || 'Unknown error'}` })
    } finally {
      setIsTraining(false)
      setProgress(null)
    }
  }, [])

  const handleGeneratePredictions = useCallback(async () => {
    setIsPredicting(true)
    setTrainingResult(null)
    try {
      const modelData = await loadActiveModel()
      if (!modelData) {
        throw new Error('No trained model found. Please train a model first.')
      }
      
      const predictions = await generatePredictions(modelData.model, modelData.normStats, modelData.modelId)
      modelData.model.dispose()
      setTrainingResult({ success: true, message: `Generated ${predictions.length} predictions for next month` })
    } catch (error: any) {
      console.error('Prediction error:', error)
      const errorMessage = error?.message || 'Unknown error'
      // Check if it's a weight mismatch error - means model needs retraining
      if (errorMessage.includes('retrain') || errorMessage.includes('mismatch')) {
        setTrainingResult({ 
          success: false, 
          message: `Model weights are incompatible. Please retrain the model using the "Start Training" button above.` 
        })
      } else {
        setTrainingResult({ success: false, message: `Prediction failed: ${errorMessage}` })
      }
    } finally {
      setIsPredicting(false)
    }
  }, [])

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Train LSTM Model</CardTitle>
          <CardDescription>Train the deep learning model on historical drought data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-1">
            <p>The LSTM model uses 12 months of historical data to predict next month&apos;s drought severity.</p>
            <p>Training requires at least 100 valid sequences across all districts.</p>
          </div>

          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Epoch {progress.epoch} / {progress.totalEpochs}</span>
                <span>Loss: {progress.loss.toFixed(6)}</span>
              </div>
              <Progress value={(progress.epoch / progress.totalEpochs) * 100} />
            </div>
          )}

          {trainingResult && (
            <Alert variant={trainingResult.success ? 'default' : 'destructive'}>
              <AlertTitle>{trainingResult.success ? 'Success' : 'Error'}</AlertTitle>
              <AlertDescription>
                {trainingResult.message}
                {trainingResult.details && (
                  <div className="mt-2 text-sm">
                    <p>Training samples: {trainingResult.details.samples}</p>
                    <p>Final loss: {trainingResult.details.loss.toFixed(6)}</p>
                    <p>Validation loss: {trainingResult.details.valLoss.toFixed(6)}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Button className="w-full" onClick={handleTrain} disabled={isTraining || isPredicting}>
            {isTraining ? 'Training...' : 'Start Training'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate Predictions</CardTitle>
          <CardDescription>Use the trained model to predict next month&apos;s drought severity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-1">
            <p>After training, generate predictions for all districts.</p>
            <p>Predictions will be saved and displayed on the dashboard.</p>
          </div>
          <Button className="w-full" variant="outline" onClick={handleGeneratePredictions} disabled={isTraining || isPredicting}>
            {isPredicting ? 'Generating...' : 'Generate Predictions'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function SystemStatusSection() {
  const { data: dataStats, isLoading: dataLoading } = useSWR('data-stats', async () => {
    const { count } = await supabase.from('drought_data').select('*', { count: 'exact', head: true })
    const { data: districts } = await supabase.from('drought_data').select('district')
    const uniqueDistricts = new Set(districts?.map(d => d.district) || [])
    const { data: months } = await supabase.from('drought_data').select('month').order('month', { ascending: false }).limit(1)
    return { totalRecords: count || 0, uniqueDistricts: uniqueDistricts.size, latestMonth: months?.[0]?.month || 'N/A' }
  })

  const { data: modelStats, isLoading: modelLoading } = useSWR('model-stats', async () => {
    const { data } = await supabase.from('model_metadata').select('*').eq('is_active', true).single()
    return data
  })

  const { data: predictionStats, isLoading: predLoading } = useSWR('prediction-stats', async () => {
    const { count } = await supabase.from('predictions').select('*', { count: 'exact', head: true })
    return { totalPredictions: count || 0 }
  })

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader><CardTitle className="text-lg">Data Status</CardTitle></CardHeader>
        <CardContent>
          {dataLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ) : (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Total Records</dt><dd className="font-medium">{dataStats?.totalRecords.toLocaleString()}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Unique Districts</dt><dd className="font-medium">{dataStats?.uniqueDistricts}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Latest Month</dt><dd className="font-medium">{dataStats?.latestMonth}</dd></div>
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Model Status</CardTitle></CardHeader>
        <CardContent>
          {modelLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ) : modelStats ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd><Badge variant="default">Active</Badge></dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Trained At</dt><dd className="font-medium">{new Date(modelStats.trained_at).toLocaleDateString()}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Training Samples</dt><dd className="font-medium">{modelStats.training_samples}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Loss</dt><dd className="font-medium font-mono">{modelStats.loss?.toFixed(6)}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No model trained yet</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Predictions</CardTitle></CardHeader>
        <CardContent>
          {predLoading ? (
            <div className="animate-pulse space-y-2"><div className="h-4 bg-muted rounded w-3/4" /></div>
          ) : (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Total Predictions</dt><dd className="font-medium">{predictionStats?.totalPredictions}</dd></div>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
