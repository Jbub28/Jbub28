import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canSupervisorReview } from "@/lib/auth/rbac";
import { canReadJrb } from "@/lib/auth/jrbAccess";
import { jsonError } from "@/lib/server/http";
import { loadJrb } from "@/lib/server/loadJrb";
import { buildReadiness } from "@/lib/server/jrbReadiness";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canSupervisorReview(user.roles)) return jsonError("Not allowed.", 403);
  const { id } = await context.params;
  try {
    const jrb = await loadJrb(id);
    if (!jrb || !(await canReadJrb(user, jrb))) return jsonError("Job brief not found.", 404);
    const version = jrb.versions[0];
    const readiness = version ? await buildReadiness(version.id) : null;
    return NextResponse.json({ jrb, readiness, canEdit: false });
  } catch {
    return jsonError("Could not load this job brief.", 500);
  }
}
