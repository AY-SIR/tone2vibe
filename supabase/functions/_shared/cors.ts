// Shared CORS configuration for all edge functions
export const allowedOrigins = [
  'http://localhost:8080',
  'https://preview--tone2vibe-51.lovable.app',
  'https://tone-to-vibe-speak-51.vercel.app',
  'https://tone2vibe.in'
];

export function getCorsHeaders(origin?: string | null): Record<string, string> {
  const requestOrigin = origin || '';
  const isAllowed = allowedOrigins.includes(requestOrigin);
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? requestOrigin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };
}

export function handleCorsPreflightRequest(req: Request): Response {
  const origin = req.headers.get('origin');
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin)
  });
}