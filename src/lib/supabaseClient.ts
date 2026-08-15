import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
// Using the anon key or falling back to the service role key for testing. 
// Important: In a real public environment, you should use SUPABASE_ANON_KEY and rely on RLS policies!
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export const supabaseClient = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;
