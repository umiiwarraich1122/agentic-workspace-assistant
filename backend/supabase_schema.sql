-- Create User Tokens Table
CREATE TABLE IF NOT EXISTS public.user_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    email TEXT,
    name TEXT,
    access_token TEXT,
    refresh_token TEXT,
    expires_in INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for Security
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

-- Allow service role and anon access (for development API)
CREATE POLICY "Allow full access for service role" ON public.user_tokens
    FOR ALL
    USING (true);

-- Create Chat History Table
CREATE TABLE IF NOT EXISTS public.chat_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
