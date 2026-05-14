import { createClient } from '@supabase/supabase-js';

// Set ALLOWED_ORIGIN in Vercel env vars to restrict cross-origin access
// (e.g. "https://alrajhi.com"). Falls back to '*' only if unset.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';

type Request = { method: string };
type Response = {
  setHeader: (k: string, v: string) => void;
  status: (code: number) => { end: () => void; json: (d: unknown) => void };
};

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-Requested-With, Accept, Content-Type, Date'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase credentials' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('jobs')
      .select('id, title_ar, title_en, job_type, sector, location')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
