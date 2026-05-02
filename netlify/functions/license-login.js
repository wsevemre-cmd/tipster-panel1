// netlify/functions/license-login.js
// POST { code, passHash } → { ok: true, label, type } or { error }

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

    const { data, error } = await supabase
      .from('license_usage')
      .select('pass_hash, label, type, activated_at')
      .eq('code', code)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { statusCode: 404, headers: cors, body: JSON.stringify({ error: 'not_found' }) };

    if (data.pass_hash !== passHash) {
      return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'wrong_password' }) };
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ ok: true, label: data.label, type: data.type, activatedAt: data.activated_at })
    };
  } catch (err) {
    console.error('license-login error:', err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Server error' }) };
  }
};
