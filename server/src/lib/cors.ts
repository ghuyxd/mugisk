/**
 * src/lib/cors.ts
 *
 * Shared CORS helper for Next.js API route handlers.
 * Used to respond to OPTIONS preflight requests and add CORS headers
 * to all responses — required for the Electron desktop client.
 */

import { NextResponse } from "next/server";

const ALLOWED_HEADERS = "Content-Type, Authorization";
const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";

/**
 * Returns the CORS headers to attach to every API response.
 */
export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Responds to an OPTIONS preflight request with 204 + CORS headers.
 * Export this as `OPTIONS` from any route file that needs CORS.
 *
 * @example
 * // route.ts
 * export { handleOptions as OPTIONS } from "@/lib/cors";
 */
export function handleOptions(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

/**
 * Wraps a NextResponse to inject CORS headers.
 * Use when you need to add CORS to an existing response.
 */
export function withCors(response: NextResponse): NextResponse {
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
