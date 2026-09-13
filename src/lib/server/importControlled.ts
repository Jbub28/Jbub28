import { Prisma, PrismaClient, ContentStatus } from "@prisma/client";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import path from "path";

const extracted = (name: string) => path.join(process.cwd(), "reference", "extracted", name);

function load<T>(name: string): T {
  return JSON.parse(readFileSync(extracted(name), "utf8")) as T;
}

type EeiFile = {
  source: { filename: string; sourceVersion: string; effectiveDate: string; copyright: string };
  operationalWorkTypesLoaded: {
    code: string;
    exactName: string;
    sourceLocation: string;
    activities: { exactName: string; sourceLocation: string }[];
    tasks: {
      exactName: string;
      activityExactName: string;
      version: string;
      status: string;
      sourceLocation: string;
      sourceAttribution: string;
    }[];
  }[];
};

type DcFile = {
  source: { filename: string; sourceVersion: string; directControlDefinitionExact: string };
  highEnergyColumns: { key: string; dcInventoryColumnLabel: string; formKey: string | null }[];
  directControls: {
    exactName: string;
    sourceRow: number;
    notesAndExamples: string | null;
    mappedHighEnergyKeys: string[];
    contentStatus: string;
    sourceLocation: string;
  }[];
};

type FormFile = {
  source: { filename: string; formTitleExact: string; formId: string; printed: string };
  highEnergyIcons: { key: string; formLabel: string; energyFamily: string; icon: string; sourceLocation: string }[];
  level1BeforeYouLeave: string[];
  environmentalHazards: string[];
  level2Walkdown: string[];
  ppe: { itemsExact: string[] };
  poleClimbing: { questionExact: string; testsExact: string; warningExact: string };
};

type AltFile = {
  source: { filename: string; title: string };
  categories: { exactName: string; definitionExact: string; examplesExact: string; sourceAlsoCallsThis?: string }[];
  directControlRequirementsExact: string[];
};

type SynFile = { synonyms: { phrase: string; proposedWorkTypeCode: string; proposedTaskExactName: string; status: string }[] };
type ExcFile = { exceptions: { id: string; severity: string; status: string; topic: string; detail: string }[] };

export async function importControlledContent(prismaClient: PrismaClient, importedById?: string) {
  const eei = load<EeiFile>("eei-electric-delivery-tasks.json");
  const dc = load<DcFile>("direct-control-inventory.json");
  const form = load<FormFile>("job-briefing-form.json");
  const alt = load<AltFile>("alternative-controls.json");
  const syn = load<SynFile>("proposed-task-synonyms.json");
  const exc = load<ExcFile>("exceptions.json");

  const report = {
    accepted: 0,
    rejected: 0,
    duplicates: 0,
    missingValues: 0,
    unresolvedMappings: 0,
    warnings: [] as string[],
    sourceFilename: [eei.source.filename, dc.source.filename, form.source.filename, alt.source.filename],
    sourceVersion: eei.source.sourceVersion,
    importDate: new Date().toISOString(),
    importingUser: importedById ?? "seed",
  };

  for (const e of exc.exceptions) {
    await prismaClient.controlledContentException.upsert({
      where: { code: e.id },
      create: { code: e.id, severity: e.severity, status: e.status, topic: e.topic, detail: e.detail },
      update: { severity: e.severity, status: e.status, topic: e.topic, detail: e.detail },
    });
    report.accepted += 1;
  }

  const sourceRows = [
    { filename: eei.source.filename, sourceVersion: eei.source.sourceVersion, storagePath: "reference/" + eei.source.filename },
    { filename: dc.source.filename, sourceVersion: dc.source.sourceVersion, storagePath: "reference/" + dc.source.filename },
    { filename: form.source.filename, sourceVersion: form.source.printed, storagePath: "reference/" + form.source.filename },
    { filename: alt.source.filename, sourceVersion: "unversioned-pdf", storagePath: "reference/" + alt.source.filename },
  ];
  for (const s of sourceRows) {
    const checksum = createHash("sha256").update(s.filename + (s.sourceVersion ?? "")).digest("hex");
    const existingSource = await prismaClient.controlledContentSource.findFirst({ where: { filename: s.filename } });
    const src = existingSource
      ? await prismaClient.controlledContentSource.update({ where: { id: existingSource.id }, data: { ...s, checksum } })
      : await prismaClient.controlledContentSource.create({ data: { ...s, checksum } });
    await prismaClient.controlledContentImport.create({
      data: { sourceId: src.id, importedById, report: report as Prisma.InputJsonValue },
    });
  }

  const publish = process.env.SEED_PUBLISH_CONTROLLED_CONTENT !== "false";
  const status: ContentStatus = publish ? "published" : "staged";
  if (publish) report.warnings.push("Local seed published staged libraries so the field app is usable. Production must use administrator Publish.");

  for (const wt of eei.operationalWorkTypesLoaded) {
    const workType = await prismaClient.workType.upsert({
      where: { code: wt.code },
      create: {
        code: wt.code,
        exactName: wt.exactName,
        operational: true,
        sourceLocation: wt.sourceLocation,
        sourceVersion: eei.source.sourceVersion,
        contentStatus: status,
      },
      update: { exactName: wt.exactName, operational: true, contentStatus: status },
    });
    report.accepted += 1;
    const tasks = wt.tasks;
    const activityNames = [...new Set(tasks.map((t) => t.activityExactName))];
    for (const name of activityNames) {
      const loc = wt.activities.find((a) => a.exactName === name)?.sourceLocation ?? wt.sourceLocation;
      const activity = await prismaClient.eeiActivity.upsert({
        where: { workTypeId_exactName: { workTypeId: workType.id, exactName: name } },
        create: { workTypeId: workType.id, exactName: name, sourceLocation: loc, contentStatus: status },
        update: { contentStatus: status },
      });
      report.accepted += 1;
      for (const t of tasks.filter((x) => x.activityExactName === name)) {
        if (!t.exactName) {
          report.missingValues += 1;
          continue;
        }
        const task = await prismaClient.eeiTask.upsert({
          where: { activityId_exactName: { activityId: activity.id, exactName: t.exactName } },
          create: {
            activityId: activity.id,
            exactName: t.exactName,
            sourceLocation: t.sourceLocation,
            sourceAttribution: t.sourceAttribution,
            contentStatus: status,
          },
          update: { contentStatus: status, sourceLocation: t.sourceLocation },
        });
        await prismaClient.eeiTaskVersion.create({
          data: { taskId: task.id, version: t.version, status: t.status, exactName: t.exactName, effectiveDate: new Date("2026-07-01") },
        }).catch(() => {
          report.duplicates += 1;
        });
        report.accepted += 1;
      }
    }
  }

  const formIcons = Object.fromEntries(form.highEnergyIcons.map((i) => [i.key, i]));
  for (const col of dc.highEnergyColumns) {
    const icon = col.formKey ? formIcons[col.formKey] : undefined;
    const exposure = await prismaClient.highEnergyExposure.upsert({
      where: { key: col.key },
      create: {
        key: col.key,
        formLabelExact: icon?.formLabel ?? null,
        dcInventoryLabelExact: col.dcInventoryColumnLabel,
        energyFamily: icon?.energyFamily,
        plainLanguageHelp: "A High Energy source that can seriously hurt or kill someone if it is released or contacted.",
        contentStatus: status,
        sourceLocation: icon?.sourceLocation ?? "DC Inventory_v1 Logic View column",
      },
      update: { dcInventoryLabelExact: col.dcInventoryColumnLabel, contentStatus: status },
    });
    const storagePath =
      col.key === "swinging_load"
        ? "/controlled/high-energy/swinging-load-placeholder.svg"
        : icon?.icon ?? "/controlled/high-energy/swinging-load-placeholder.svg";
    await prismaClient.highEnergyIconAsset.upsert({
      where: { exposureId: exposure.id },
      create: {
        exposureId: exposure.id,
        storagePath,
        isPlaceholder: col.key === "swinging_load",
        sourceFilename: form.source.filename,
        sourceLocation: icon?.sourceLocation ?? "No form icon extracted",
        usageNotes: col.key === "swinging_load" ? "EXC-009 placeholder" : "Extracted from Job Briefing Form page 2",
      },
      update: { storagePath },
    });
    report.accepted += 1;
  }

  for (const c of dc.directControls) {
    const existing = await prismaClient.directControl.findFirst({ where: { exactName: c.exactName } });
    const row = existing
      ? await prismaClient.directControl.update({
          where: { id: existing.id },
          data: { notes: c.notesAndExamples, sourceRow: c.sourceRow, contentStatus: c.contentStatus === "UNRESOLVED" ? "unresolved" : status },
        })
      : await prismaClient.directControl.create({
          data: {
            exactName: c.exactName,
            sourceRow: c.sourceRow,
            notes: c.notesAndExamples,
            sourceVersion: dc.source.sourceVersion,
            contentStatus: c.contentStatus === "UNRESOLVED" ? "unresolved" : status,
            sourceLocation: c.sourceLocation,
          },
        });
    await prismaClient.directControlVersion.create({
      data: { directControlId: row.id, version: "v1", exactName: c.exactName },
    }).catch(() => undefined);
    report.accepted += 1;
    if (c.mappedHighEnergyKeys.length === 0) report.unresolvedMappings += 1;
    for (const key of c.mappedHighEnergyKeys) {
      const exp = await prismaClient.highEnergyExposure.findUnique({ where: { key } });
      if (!exp) {
        report.unresolvedMappings += 1;
        continue;
      }
      await prismaClient.highEnergyDirectControlMapping.upsert({
        where: { exposureId_directControlId: { exposureId: exp.id, directControlId: row.id } },
        create: { exposureId: exp.id, directControlId: row.id, contentStatus: status, sourceLocation: c.sourceLocation },
        update: { contentStatus: status },
      });
    }
  }

  for (const cat of alt.categories) {
    const row = await prismaClient.alternativeControlCategory.upsert({
      where: { exactName: cat.exactName },
      create: {
        exactName: cat.exactName,
        definitionExact: cat.definitionExact,
        examplesExact: cat.examplesExact,
        sourceAlsoCallsThis: cat.sourceAlsoCallsThis,
        contentStatus: status,
      },
      update: { definitionExact: cat.definitionExact, examplesExact: cat.examplesExact, contentStatus: status },
    });
    const examples = (cat.examplesExact ?? "").replace(/^Example:\s*/i, "");
    for (const piece of examples.split(",").map((s) => s.trim()).filter(Boolean)) {
      const existing = await prismaClient.alternativeControl.findFirst({ where: { categoryId: row.id, exactName: piece } });
      if (!existing) {
        await prismaClient.alternativeControl.create({
          data: { categoryId: row.id, exactName: piece, sourceWording: piece, contentStatus: status },
        });
      }
    }
    report.accepted += 1;
  }

  for (const item of form.ppe.itemsExact) {
    const existing = await prismaClient.ppeItem.findFirst({ where: { exactName: item } });
    if (!existing) {
      await prismaClient.ppeItem.create({
        data: { exactName: item, sourceLocation: `${form.source.formTitleExact} PPE list`, contentStatus: status },
      });
    }
    report.accepted += 1;
  }

  const questions = [
    { key: "pole_climbing_required", promptExact: form.poleClimbing.questionExact, taskNameContains: "Climb pole", sourceLocation: "Job Briefing Form pole climbing" },
    { key: "pole_visual", promptExact: "Visual inspection completed", taskNameContains: "Climb pole" },
    { key: "pole_hammer", promptExact: "Hammer or sounding test completed", taskNameContains: "Climb pole" },
    { key: "pole_screwdriver", promptExact: "Screwdriver or probing test completed", taskNameContains: "Climb pole" },
    { key: "pole_rocking", promptExact: "Rocking test completed", taskNameContains: "Climb pole" },
    { key: "pole_passed", promptExact: "Pole passed required evaluations", taskNameContains: "Climb pole" },
    { key: "pole_can_test", promptExact: "Pole could be adequately tested", taskNameContains: "Climb pole" },
    { key: "pole_warning", promptExact: form.poleClimbing.warningExact, taskNameContains: "Climb pole" },
  ];
  for (const q of questions) {
    await prismaClient.conditionalQuestion.upsert({
      where: { key: q.key },
      create: { ...q, contentStatus: status },
      update: { promptExact: q.promptExact, contentStatus: status },
    });
  }

  const regs = [
    {
      regulationFamily: "29 CFR 1910.269",
      citation: "29 CFR 1910.269",
      topic: "Electric power generation, transmission, and distribution — operation and maintenance",
      applicability: "Applicability is confirmed by the crew and Safety/Legal administrators. The application does not make a final legal classification.",
      approvedHelpText: "Minimum briefing subjects include hazards, work procedures, special precautions, energy-source controls, and PPE.",
      sourceUrl: "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.269",
      version: "reference-link-only",
    },
    {
      regulationFamily: "29 CFR 1926 Subpart V",
      citation: "29 CFR 1926 Subpart V",
      topic: "Electric power transmission and distribution — construction",
      applicability: "Applicability is confirmed by the crew and Safety/Legal administrators. The application does not make a final legal classification.",
      approvedHelpText: "Use this family when work is classified as construction. The application does not decide that classification.",
      sourceUrl: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926SubpartV",
      version: "reference-link-only",
    },
  ];
  for (const r of regs) {
    const existing = await prismaClient.regulatoryReference.findFirst({ where: { citation: r.citation } });
    if (!existing) {
      await prismaClient.regulatoryReference.create({
        data: { ...r, contentOwner: "Regulatory Content Administrator", reviewStatus: status },
      });
    }
  }

  for (const s of syn.synonyms) {
    const existing = await prismaClient.taskSynonym.findFirst({ where: { phrase: s.phrase, workTypeCode: s.proposedWorkTypeCode } });
    if (!existing) {
      await prismaClient.taskSynonym.create({
        data: {
          phrase: s.phrase,
          workTypeCode: s.proposedWorkTypeCode,
          proposedTaskExactName: s.proposedTaskExactName,
          status: s.status,
        },
      });
    }
  }

  const help = [
    { term: "eei", exactTerm: "EEI", plainHelp: "Edison Electric Institute. The approved task names come from the EEI task library.", sourceNote: "EEI Task Libraries July 2026" },
    { term: "high-energy", exactTerm: "High Energy", plainHelp: "Energy that can seriously hurt or kill someone if it is released or contacted.", sourceNote: "Job Briefing Form High Energy Hazards; CSRA Direct Control resource" },
    { term: "direct-control", exactTerm: "Direct Control", plainHelp: "A control that is targeted at High Energy, works when installed and checked, and still works if someone makes a mistake.", sourceNote: "DC Inventory definition; CSRA three requirements" },
    { term: "alternative-control", exactTerm: "Alternative Control", plainHelp: "Used only when a Direct Control is not feasible. You need at least two controls from two different categories.", sourceNote: "CSRA Alternative Control resource" },
    { term: "sclm", exactTerm: "SCLM", plainHelp: "Shown in the field as Serious Injury or Fatality Potential. No SCLM catalog was in the source files.", sourceNote: "EXC-010" },
    { term: "physical-obstacle", exactTerm: "Physical Obstacle", plainHelp: "An obstruction that blocks the path or hinders progress toward a high energy hazard.", sourceNote: "CSRA category card" },
    { term: "dedicated-monitoring", exactTerm: "Dedicated Monitoring", plainHelp: "Devoted and continuous attention to the high energy hazard. The source page also says Direct Monitoring.", sourceNote: "CSRA category card; EXC-005" },
    { term: "visual-reminder", exactTerm: "Visual Reminder", plainHelp: "A visible warning of the presence of the high energy hazard.", sourceNote: "CSRA category card" },
  ];
  for (const h of help) {
    await prismaClient.helpContent.upsert({
      where: { term: h.term },
      create: h,
      update: h,
    });
  }

  await prismaClient.configurationSetting.upsert({
    where: { key: "AUDIO_RETENTION_ENABLED" },
    create: { key: "AUDIO_RETENTION_ENABLED", value: "false" },
    update: {},
  });
  await prismaClient.configurationSetting.upsert({
    where: { key: "DIRECT_CONTROL_DEFINITION" },
    create: {
      key: "DIRECT_CONTROL_DEFINITION",
      value: dc.source.directControlDefinitionExact,
    },
    update: {},
  });

  return report;
}

