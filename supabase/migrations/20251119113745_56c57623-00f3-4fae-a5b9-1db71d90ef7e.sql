-- Enable RLS on invoices table
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own invoices
CREATE POLICY "Users can view their own invoices"
ON public.invoices
FOR SELECT
USING (auth.uid() = user_id);

-- Allow service role to manage all invoices
CREATE POLICY "Service role can manage invoices"
ON public.invoices
FOR ALL
USING (auth.role() = 'service_role');

-- Allow authenticated users to insert their own invoices (for edge functions)
CREATE POLICY "Users can insert their own invoices"
ON public.invoices
FOR INSERT
WITH CHECK (auth.uid() = user_id);