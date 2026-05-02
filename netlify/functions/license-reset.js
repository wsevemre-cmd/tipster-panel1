// netlify/functions/license-reset.js
// POST { code, passHash } → { ok: true } or { error }

const { createClient } = require('@supabase/supabase-js');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { code, passHash } = JSON.parse(event.body || '{}');
    if (!code || !passHash) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Missing fields' }) };

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Verify code exists
    const { data: existing } = await supabase
      .from('license_usage')
      .select('code')
      .eq('code', code)
      .maybeSingle();

    if (!existing) {
      return { statusCode: 404, headers: cors, body: JSON.stringify({ error: 'not_found' }) };
    }

    const { error } = await supabase
      .from('license_usage')
      .update({ pass_hash: passHash })
      .eq('code', code);

    if (error) throw error;

    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('license-reset error:', err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Server error' }) };
  }
};
