import { jsonResponse, optionsResponse } from '../lib/cors';

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST' && request.method !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405);
  return jsonResponse({ ok: true }, 200);
}
