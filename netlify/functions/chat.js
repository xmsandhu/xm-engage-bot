export const handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers: corsHeaders(), body: '' }
    }

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) }
    }

    const API_URL = process.env.API_GATEWAY_URL
    const API_KEY = process.env.API_GATEWAY_KEY

    if (!API_URL || !API_KEY) {
      return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'Server misconfiguration' }) }
    }

    const body = event.body || '{}'

    const upstream = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body
    })

    const text = await upstream.text()
    const status = upstream.status

    return {
      statusCode: status,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      body: text
    }
  } catch (err) {
    return { statusCode: 502, headers: corsHeaders(), body: JSON.stringify({ error: 'Upstream error' }) }
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
  }
}
