import { prisma } from "@/lib/db";
import type { BriefingCatalog } from "@/lib/conversation/types";

export async function loadBriefingCatalog(): Promise<BriefingCatalog> {
  const [exposures, mappings, ppe] = await Promise.all([
    prisma.highEnergyExposure.findMany({
      where: { contentStatus: "published" },
      select: { id: true, key: true, formLabelExact: true, dcInventoryLabelExact: true, energyFamily: true },
    }),
    prisma.highEnergyDirectControlMapping.findMany({
      include: { directControl: { select: { id: true, exactName: true, contentStatus: true } } },
    }),
    prisma.ppeItem.findMany({ select: { exactName: true } }),
  ]);

  const byControl = new Map<string, { id: string; exactName: string; exposureIds: string[] }>();
  for (const m of mappings) {
    if (m.directControl.contentStatus !== "published") continue;
    const current = byControl.get(m.directControlId) ?? {
      id: m.directControl.id,
      exactName: m.directControl.exactName,
      exposureIds: [],
    };
    current.exposureIds.push(m.exposureId);
    byControl.set(m.directControlId, current);
  }

  return {
    exposures: exposures.map((e) => ({
      id: e.id,
      key: e.key,
      label: e.formLabelExact ?? e.dcInventoryLabelExact ?? e.key,
      energyFamily: e.energyFamily,
    })),
    directControls: [...byControl.values()],
    ppe,
  };
}
