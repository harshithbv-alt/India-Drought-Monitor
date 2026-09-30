-- Drought Data Mapping System Database Schema
-- Tables for storing drought metrics and ML model metadata

-- Main table for drought data by district and month
CREATE TABLE IF NOT EXISTS drought_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district TEXT NOT NULL,
  month DATE NOT NULL,  -- First day of month (YYYY-MM-01)
  ndvi DECIMAL(6,4),  -- Normalized Difference Vegetation Index (-1 to 1)
  rainfall DECIMAL(10,2),  -- Rainfall in mm
  soil_moisture DECIMAL(6,4),  -- Soil moisture (0 to 1)
  temperature DECIMAL(6,2),  -- Temperature in Celsius
  evapotranspiration DECIMAL(10,4),  -- ET in mm/day
  land_cover INTEGER,  -- Encoded land cover for ML
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(district, month)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_drought_district ON drought_data(district);
CREATE INDEX IF NOT EXISTS idx_drought_month ON drought_data(month);

-- Table for storing ML model metadata and weights
CREATE TABLE IF NOT EXISTS model_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trained_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  training_samples INTEGER,
  epochs INTEGER,
  loss DECIMAL(12,8),
  val_loss DECIMAL(12,8),
  model_weights JSONB,
  normalization_params JSONB,
  is_active BOOLEAN DEFAULT FALSE
);

-- Table for storing feature normalization parameters
CREATE TABLE IF NOT EXISTS normalization_params (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature TEXT NOT NULL UNIQUE,
  min_val DECIMAL(15,6),
  max_val DECIMAL(15,6),
  mean_val DECIMAL(15,6),
  std_val DECIMAL(15,6),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing predictions
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district TEXT NOT NULL,
  predicted_month DATE NOT NULL,
  ndvi_predicted DECIMAL(6,4),
  rainfall_predicted DECIMAL(10,2),
  soil_moisture_predicted DECIMAL(6,4),
  temperature_predicted DECIMAL(6,2),
  evapotranspiration_predicted DECIMAL(10,4),
  severity_index_predicted DECIMAL(6,4),
  severity_class_predicted TEXT,
  model_id UUID REFERENCES model_metadata(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(district, predicted_month, model_id)
);

-- Enable Row Level Security
ALTER TABLE drought_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE normalization_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow public read access
CREATE POLICY "Allow public read on drought_data" ON drought_data 
  FOR SELECT USING (true);

CREATE POLICY "Allow public read on model_metadata" ON model_metadata 
  FOR SELECT USING (true);

CREATE POLICY "Allow public read on normalization_params" ON normalization_params 
  FOR SELECT USING (true);

CREATE POLICY "Allow public read on predictions" ON predictions 
  FOR SELECT USING (true);

-- RLS Policies - Allow service role to insert/update/delete
CREATE POLICY "Allow service role insert on drought_data" ON drought_data 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role update on drought_data" ON drought_data 
  FOR UPDATE USING (true);

CREATE POLICY "Allow service role delete on drought_data" ON drought_data 
  FOR DELETE USING (true);

CREATE POLICY "Allow service role insert on model_metadata" ON model_metadata 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role update on model_metadata" ON model_metadata 
  FOR UPDATE USING (true);

CREATE POLICY "Allow service role insert on normalization_params" ON normalization_params 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role update on normalization_params" ON normalization_params 
  FOR UPDATE USING (true);

CREATE POLICY "Allow service role insert on predictions" ON predictions 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role update on predictions" ON predictions 
  FOR UPDATE USING (true);

CREATE POLICY "Allow service role delete on predictions" ON predictions 
  FOR DELETE USING (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_drought_data_updated_at ON drought_data;
CREATE TRIGGER update_drought_data_updated_at
    BEFORE UPDATE ON drought_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
