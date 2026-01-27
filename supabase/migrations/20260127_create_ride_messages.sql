-- Create ride_messages table
CREATE TABLE IF NOT EXISTS public.ride_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ride_id UUID NOT NULL REFERENCES public.ride_requests(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('driver', 'client')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.ride_messages ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for demo purposes (since clients use localStorage ID)
-- In production, we would validate against the ride participants
CREATE POLICY "Public read access" ON public.ride_messages FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.ride_messages FOR INSERT WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_messages;
