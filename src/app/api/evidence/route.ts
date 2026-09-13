import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canWriteJrb } from "@/lib/auth/rbac";
import { getStorageProvider, malwareScanHook } from "@/lib/providers/storage";
import { prisma } from "@/lib/db";
import { jsonError, originAllowed } from "@/lib/server/http";
import { writeAudit } from "@/lib/server/audit";

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return jsonError("Invalid origin", 403);
  const user = await requireUser();
  if (!canWriteJrb(user.roles)) return jsonError("You cannot attach evidence.", 403);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Choose a photo or PDF.", 400);
  const association = String(form.get("association") ?? "other");
  const versionId = String(form.get("versionId") ?? "");
  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await getStorageProvider().save({
    buffer,
    mimeType: file.type || "application/octet-stream",
    originalName: file.name,
  });
  const scan = malwareScanHook(stored);
  const row = await prisma.evidenceFile.create({
    data: {
      versionId: versionId || null,
      association,
      originalName: file.name,
      storageKey: stored.storageKey,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      scanStatus: scan,
    },
  });
  await writeAudit({ userId: user.id, action: "evidence_upload", entityType: "evidence_file", entityId: row.id });
  return NextResponse.json({ id: row.id, scanStatus: scan });
}
