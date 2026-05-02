// netlify/functions/license-activate.js
// POST { code, passHash, label, type } → { ok: true } or { error }
// Only called on FIRST activation. If code already exists → reject.

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
    const { code, passHash, label, type } = JSON.parse(event.body || '{}');
    if (!code || !passHash) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Missing fields' }) };

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Check again atomically — prevent race conditions
    const { data: existing } = await supabase
      .from('license_usage')
      .select('code')
      .eq('code', code)
      .maybeSingle();

    if (existing) {
      return {
        statusCode: 409,
        headers: cors,
        body: JSON.stringify({ error: 'already_used' })
      };
    }

    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from('license_usage')
      .insert({ code, pass_hash: passHash, activated_at: today, label, type });

    if (error) throw error;

    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('license-activate error:', err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Server error' }) };
  }
};
