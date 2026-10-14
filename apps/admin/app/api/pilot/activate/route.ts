import { NextResponse } from "next/server";
import { z } from "zod";
import { assertDatabaseRole } from "@lobbystack/db";
import { previewPilotActivation, redeemPilotActivation } from "@lobbystack/domain";
import { getDatabase } from "@/lib/databases";
import { hashReplacementPassword, meetsPasswordRequirements } from "@/lib/password";

export const dynamic = "force-dynamic";
const bodySchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), action: z.enum(["preview", "activate"]), password: z.string().max(256).optional() }).strict();
const privateHeaders = { "cache-control": "no-store", "referrer-policy": "no-referrer" };

export async function POST(request: Request) {
  try {
    const configured = process.env.APP_BASE_URL;
    const origin = configured ? new URL(configured).origin : process.env.NODE_ENV !== "production" ? new URL(request.url).origin : null;
    if (!origin || request.headers.get("origin") !== origin) return NextResponse.json({ error: "Origin not allowed." }, { status: 403, headers: privateHeaders });
    if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "JSON required." }, { status: 415, headers: privateHeaders });
    const raw = await request.text();
    if (raw.length > 4096) return NextResponse.json({ error: "Request too large." }, { status: 413, headers: privateHeaders });
    const body = bodySchema.safeParse(JSON.parse(raw));
    if (!body.success) return NextResponse.json({ error: "Invalid activation request." }, { status: 400, headers: privateHeaders });
    const db = getDatabase("lobbystack_auth");
    await assertDatabaseRole(db);
    if (body.data.action === "preview") return NextResponse.json({ invitation: await previewPilotActivation(db.db, body.data.token) }, { headers: privateHeaders });
    const password = body.data.password;
    if (!password || !meetsPasswordRequirements(password)) return NextResponse.json({ error: "Invalid password.", code: "INVALID_PASSWORD" }, { status: 400, headers: privateHeaders });
    // Check before the expensive password hash. Possession of a random 256-bit
    // token replaces public registration; no challenge/provider is required.
    if (!await previewPilotActivation(db.db, body.data.token)) return NextResponse.json({ error: "Activation link is invalid or expired." }, { status: 400, headers: privateHeaders });
    const result = await redeemPilotActivation(db.db, { token: body.data.token, passwordHash: await hashReplacementPassword(password) });
    return NextResponse.json({ ok: true, email: result.email }, { headers: privateHeaders });
  } catch (error) {
    const status = error instanceof SyntaxError || (typeof error === "object" && error !== null && "status" in error && error.status === 400) ? 400 : 503;
    return NextResponse.json({ error: status === 400 ? "Activation link is invalid or expired." : "Activation service unavailable." }, { status, headers: privateHeaders });
  }
}
