/**
 * GET /api/admin/library/scan-status
 *
 * Admin-only endpoint. Returns recent ScanLog entries plus an aggregate
 * summary (last scan time, total indexed, total failed).
 *
 * Query parameters (all optional):
 *   limit   Number of log entries to return (default: 100, max: 500)
 *
 * Response shape:
 * {
 *   summary: {
 *     lastScanTime: string | null,   // ISO timestamp of the most recent entry
 *     totalIndexed: number,           // SUCCESS entries in the returned window
 *     totalFailed: number,            // FAILED entries in the returned window
 *     totalDuplicates: number,        // DUPLICATE entries (SUCCESS with "DUPLICATE:" prefix)
 *   },
 *   logs: ScanLog[]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { ScanStatus } from "@prisma/client";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export const GET = withAdmin(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const rawLimit = searchParams.get("limit");
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(rawLimit ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
  );

  const logs = await prisma.scanLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      status: true,
      filePath: true,
      message: true,
      createdAt: true,
    },
  });

  // ── Aggregate ────────────────────────────────────────────────────────────────
  const lastScanTime = logs[0]?.createdAt?.toISOString() ?? null;

  let totalIndexed = 0;
  let totalFailed = 0;
  let totalDuplicates = 0;

  for (const log of logs) {
    if (log.status === ScanStatus.FAILED) {
      totalFailed++;
    } else if (log.message?.startsWith("DUPLICATE:")) {
      totalDuplicates++;
    } else if (log.status === ScanStatus.SUCCESS) {
      totalIndexed++;
    }
  }

  return NextResponse.json({
    summary: {
      lastScanTime,
      totalIndexed,
      totalFailed,
      totalDuplicates,
      windowSize: limit,
    },
    logs,
  });
});
