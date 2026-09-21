import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lddksdszpwonsqaavjyd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__jLFrmIPagVkl7OM_-v6LA_GZQog5SZ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
