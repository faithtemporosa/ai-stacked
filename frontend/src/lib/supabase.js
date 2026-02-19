import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qwnhywiygyvlhjxxrbkk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3bmh5d2l5Z3l2bGhqeHhyYmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNTkxNzgsImV4cCI6MjA4NjgzNTE3OH0.X7RdTeOPrJCkf8c1oOUGHv1tntDigluOnj7bPw50tKE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
