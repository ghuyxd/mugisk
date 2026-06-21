/**
 * POST /api/auth/register
 *
 * Creates a new USER-role account.
 * Rate limited: 10 req / 60 s per IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/middleware";
import { Prisma } from "@prisma/client";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username may only contain letters, numbers, and underscores",
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one digit"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limiting
  const ip = getClientIp(req);
  if (!authRateLimiter.check(`register:${ip}`)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  // Parse + validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, username, password } = parsed.data;

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user (handle uniqueness violation gracefully)
  try {
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username,
        passwordHash,
        // role defaults to USER in schema
      },
      select: { id: true, email: true, username: true, role: true, createdAt: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Unique constraint violation — determine which field
      const target = (err.meta?.target as string[] | undefined) ?? [];
      if (target.includes("email")) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
      if (target.includes("username")) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
      return NextResponse.json({ error: "Account already exists" }, { status: 409 });
    }
    throw err;
  }
}
