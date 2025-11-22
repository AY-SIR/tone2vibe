-- Create maintenance settings table
CREATE TABLE IF NOT EXISTS public.maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT false,
  message text DEFAULT 'We are currently performing scheduled maintenance. Please check back soon.',
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default row (maintenance disabled by default)
INSERT INTO public.maintenance (is_enabled, message)
VALUES (false, 'We are currently performing scheduled maintenance. Please check back soon.')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.maintenance ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read maintenance status
CREATE POLICY "Anyone can read maintenance status"
ON public.maintenance
FOR SELECT
TO public
USING (true);

-- Only service role can update (admins should use service role key)
CREATE POLICY "Service role can update maintenance"
ON public.maintenance
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Create function to update timestamp automatically
CREATE OR REPLACE FUNCTION public.update_maintenance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER maintenance_updated_at
BEFORE UPDATE ON public.maintenance
FOR EACH ROW
EXECUTE FUNCTION public.update_maintenance_timestamp();