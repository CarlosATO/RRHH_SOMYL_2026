import { createClient } from '@supabase/supabase-js';

const procurementUrl = import.meta.env.VITE_PROCUREMENT_URL;
const procurementKey = import.meta.env.VITE_PROCUREMENT_KEY;

export const procurementClient = createClient(procurementUrl, procurementKey);
