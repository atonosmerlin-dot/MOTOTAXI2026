export const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}

export function optionsResponse() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
