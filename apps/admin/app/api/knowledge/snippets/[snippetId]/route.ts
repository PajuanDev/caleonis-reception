import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteKnowledgeSnippet, updateKnowledgeSnippet } from "@lobbystack/domain";
import { asApiResponse, businessIdFromRequest, readJson, requireApiSession } from "@/lib/api-helpers";
import { createDomainContext } from "@/lib/domain-context";

export const dynamic = "force-dynamic";

// Whitelist editable fields. The dashboard also sends its local `id` field;
// it and every other unknown property are discarded, never used as authority.
const patchSchema = z.object({
  title: z.string().trim().min(1).optional(),
  content: z.string().trim().min(1).optional(),
  tags: z.array(z.string()).optional(),
  priority: z.number().int().optional(),
  active: z.boolean().optional(),
}).refine(value => Object.keys(value).length > 0);

export async function PATCH(request: Request, { params }: { params: Promise<{ snippetId: string }> }) {
  try {
    const session = await requireApiSession(request);
    const businessId = businessIdFromRequest(request);
    if (!businessId) return NextResponse.json({ error: "A businessId is required." }, { status: 400 });
    const parsed = patchSchema.safeParse(await readJson(request));
    if (!parsed.success) return NextResponse.json({ error: "Invalid snippet update." }, { status: 400 });
    const { snippetId } = await params;
    const body = parsed.data;
    await updateKnowledgeSnippet(createDomainContext(), {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.content !== undefined ? { content: body.content } : {}),
      ...(body.tags !== undefined ? { tags: body.tags } : {}),
      ...(body.priority !== undefined ? { priority: body.priority } : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
      userId: session.user.id,
      businessId,
      snippetId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return asApiResponse(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ snippetId: string }> }) {
  try {
    const session = await requireApiSession(request);
    const businessId = businessIdFromRequest(request);
    if (!businessId) return NextResponse.json({ error: "A businessId is required." }, { status: 400 });
    const { snippetId } = await params;
    await deleteKnowledgeSnippet(createDomainContext(), { userId: session.user.id, businessId, snippetId });
    return NextResponse.json({ ok: true });
  } catch (error) { return asApiResponse(error); }
}
