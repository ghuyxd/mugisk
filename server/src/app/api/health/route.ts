import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET(_req: NextRequest) {
  return NextResponse.json(
    {
      status: "ok",
      service: "mugisk-server",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
