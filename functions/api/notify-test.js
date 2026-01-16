export async function onRequest(context) {
  const { request } = context;

  // Handle all requests with CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  // Preflight request
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // Handle GET and POST
  if (request.method === 'GET' || request.method === 'POST') {
    const responseBody = JSON.stringify({
      ok: true,
      status: 'OK',
      message: 'notify-test endpoint is working',
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      cloudflare_functions: 'ACTIVE'
    });

    return new Response(responseBody, { 
      status: 200, 
      headers 
    });
  }

  // Method not allowed
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }), 
    { status: 405, headers }
  );
}
