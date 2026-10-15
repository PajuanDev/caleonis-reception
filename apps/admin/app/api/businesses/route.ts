import { NextResponse } from "next/server";
import { z } from "zod";

import { attributeBusiness, canCreateAutonomousBusiness, createBusiness, listUserBusinesses, updateBusiness } from "@lobbystack/domain";
import { getAppDatabase, asApiResponse, businessIdFromRequest, readJson, requireApiSession } from "@/lib/api-helpers";
import { createDomainContext } from "@/lib/domain-context";
import { affiliateProgramEnabled } from "@/lib/affiliate-program";

export const dynamic = "force-dynamic";
const businessPatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  timezone: z.string().trim().refine(value => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }).optional(),
  businessType: z.string().trim().min(1).max(64).optional(),
  defaultLocale: z.enum(["en", "fr"]).optional(),
  websiteUrl: z.string().url().refine(value => ["http:", "https:"].includes(new URL(value).protocol)).nullable().optional(),
}).strict().refine(value => Object.keys(value).length > 0);

export async function GET(request: Request) {
  try {
    const session = await requireApiSession(request);
    return NextResponse.json({ businesses: await listUserBusinesses(getAppDatabase().db, session.user.id) });
  } catch (error) {
    return asApiResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(request);
    const body = await readJson(request) as { name?: string; slug?: string; timezone?: string; businessType?: string; referralCode?: unknown };
    if (!body.name || !body.timezone || !body.businessType) {
      return NextResponse.json({ error: "name, timezone, and businessType are required." }, { status: 400 });
    }
    if (body.slug !== undefined && (typeof body.slug !== "string" || !body.slug.trim())) {
      return NextResponse.json({ error: "slug must be a nonempty string when supplied." }, { status: 400 });
    }
    const context = createDomainContext();
    if (!await canCreateAutonomousBusiness(context, session.user.id)) return NextResponse.json({ error: "Additional workspaces for a managed pilot require operator approval.", code: "managed_pilot_workspace_creation_disabled" }, { status: 403 });
    const created = await createBusiness(context, { userId: session.user.id, name: body.name, ...(body.slug !== undefined ? { slug: body.slug } : {}), timezone: body.timezone, businessType: body.businessType });
    // Attribute at creation, before the plan step can take a payment, so the
    // referrer earns commission on the first order too.
    if (affiliateProgramEnabled() && typeof body.referralCode === "string" && body.referralCode) {
      await attributeBusiness(context, { businessId: created.businessId, referredUserId: session.user.id, referralCode: body.referralCode, source: "referral_link" });
    }
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return asApiResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireApiSession(request);
    const businessId = businessIdFromRequest(request);
    const body = businessPatchSchema.safeParse(await readJson(request));
    if (!businessId) return NextResponse.json({ error: "A businessId is required." }, { status: 400 });
    if (!body.success) return NextResponse.json({ error: "Only valid editable business fields are accepted." }, { status: 400 });
    // Authority belongs to the server. JSON must never override the user or
    // workspace used for domain authorization and the PostgreSQL RLS context.
    const input = body.data;
    await updateBusiness(createDomainContext(), {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
      ...(input.businessType !== undefined ? { businessType: input.businessType } : {}),
      ...(input.defaultLocale !== undefined ? { defaultLocale: input.defaultLocale } : {}),
      ...(input.websiteUrl !== undefined ? { websiteUrl: input.websiteUrl } : {}),
      userId: session.user.id,
      businessId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return asApiResponse(error); }
}
