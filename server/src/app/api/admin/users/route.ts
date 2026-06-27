/**
 * GET /api/admin/users
 *
 * Admin-only. Returns a paginated, searchable list of users.
 *
 * Query params:
 *   page    (default 1)
 *   limit   (default 20, max 100)
 *   search  — case-insensitive match on email OR username
 *
 * Response:
 *   { data: User[], meta: { total, page, pageSize, totalPages } }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export const GET = withAdmin(async (req: NextRequest) => {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { page, limit, search } = parsed.data;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { username: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isDisabled: true,
        createdAt: true,
        _count: { select: { sessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } } } } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    data: users,
    meta: { total, page, pageSize: limit, totalPages: Math.ceil(total / limit) },
  });
});

import bcrypt from "bcryptjs";

const createSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one digit"),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
});

export const POST = withAdmin(async (req: NextRequest) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, username, password, role } = parsed.data;

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username,
        passwordHash,
        role,
      },
    });

    return NextResponse.json(
      {
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
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
});
