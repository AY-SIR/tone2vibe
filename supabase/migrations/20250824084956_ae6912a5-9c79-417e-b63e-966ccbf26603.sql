-- Enable realtime for profiles and history tables
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.history REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.history;