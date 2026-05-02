// netlify/functions/license-check.js
// POST { code } → { used: bool, label?, type?, activatedAt? }

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
    const { code } = JSON.parse(event.body || '{}');
    if (!code) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Missing code' }) };

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data, error } = await supabase
      .from('license_usage')
      .select('code, label, type, activated_at')
      .eq('code', code)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ used: true, label: data.label, type: data.type, activatedAt: data.activated_at })
      };
    } else {
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ used: false })
      };
    }
  } catch (err) {
    console.error('license-check error:', err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Server error' }) };
  }
};
