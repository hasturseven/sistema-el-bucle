import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://aigmomhzjqjxeonbywqe.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpZ21vbWh6anFqeGVvbmJ5d3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0NzM5NjcsImV4cCI6MjEwOTA0OTk2N30.1_p3Qcl7cNVT4zLyH7rYjwNszVzSoST9PDgACkuQ338";

export const supabase = createClient(supabaseUrl, supabaseKey);