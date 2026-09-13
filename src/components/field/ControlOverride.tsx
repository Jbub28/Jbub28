"use client";

import { useMemo, useState } from "react";
import { ALT_CATEGORIES } from "@/lib/domain/alternativeControls";
import { DIRECT_CONTROL_NOT_USED_REASONS, VERIFICATION_METHODS } from "@/lib/domain/controls";
import { BigButton, Field } from "./FieldChrome";

type CatalogControl = { id: string; exactName: string; exposureIds: string[] };
type AltCategory = {
  id: string;
  exactName: string;
  controls?: { id: string; exactName: string }[];
};

export function ControlOverride(props: {
  exposureId: string;
  exposureLabel: string;
  energySource?: string;
  inventoryControls: CatalogControl[];
  categories: AltCategory[];
  eicName: string;
  selectedDirectControlId?: string | null;
  notUsedRecorded?: boolean;
  onSelectDirectControl: (directControlId: string) => void;
  onSaveNotUsed: (payload: {
    exposureId: string;
    energySource?: string;
    reason: string;
    explanation: string;
    residualExposure: string;
    stopWorkTrigger: string;
    supervisorReviewed: boolean;
    controls: {
      category: string;
      categoryId?: string;
      catalogControlId?: string | null;
      description: string;
      owner: string;
      verificationMethod: string;
      isOther: boolean;
    }[];
  }) => Promise<unknown> | unknown;
}) {
  const categoryNames = (props.categories.map((c) => c.exactName).filter(Boolean) as string[]).length
    ? props.categories.map((c) => c.exactName)
    : [...ALT_CATEGORIES];
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(DIRECT_CONTROL_NOT_USED_REASONS[0]);
  const [explanation, setExplanation] = useState("");
  const [residual, setResidual] = useState("");
  const [stopTrigger, setStopTrigger] = useState("If an Alternative Control cannot be kept in place, stop and rebrief.");
  const [supervisorReviewed, setSupervisorReviewed] = useState(false);
  const [firstCategory, setFirstCategory] = useState(categoryNames[0] ?? ALT_CATEGORIES[0]);
  const [secondCategory, setSecondCategory] = useState(categoryNames[1] ?? categoryNames[0] ?? ALT_CATEGORIES[1]);
  const [firstControlId, setFirstControlId] = useState("");
  const [secondControlId, setSecondControlId] = useState("");
  const [firstOwner, setFirstOwner] = useState(props.eicName);
  const [secondOwner, setSecondOwner] = useState(props.eicName);
  const [firstVerify, setFirstVerify] = useState<string>(VERIFICATION_METHODS[0]);
  const [secondVerify, setSecondVerify] = useState<string>(VERIFICATION_METHODS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstOptions = useMemo(
    () => props.categories.find((c) => c.exactName === firstCategory)?.controls ?? [],
    [props.categories, firstCategory],
  );
  const secondOptions = useMemo(
    () => props.categories.find((c) => c.exactName === secondCategory)?.controls ?? [],
    [props.categories, secondCategory],
  );

  return (
    <div className="mt-3 space-y-2">
      {props.inventoryControls.length ? (
        <label className="block text-sm font-bold">
          Direct Control from the inventory
          <select
            className="mt-1 w-full rounded-xl bg-[#070b14] p-3 text-base font-normal"
            value={props.selectedDirectControlId ?? ""}
            onChange={(e) => {
              if (e.target.value) props.onSelectDirectControl(e.target.value);
            }}
          >
            <option value="">Choose a Direct Control</option>
            {props.inventoryControls.map((dc) => (
              <option key={dc.id} value={dc.id}>
                {dc.exactName}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-sm">No inventory Direct Control is attached yet for {props.exposureLabel}.</p>
      )}
      {props.notUsedRecorded ? (
        <p className="rounded-xl bg-[#1b2740] p-3 text-sm">Direct Control not used is recorded. Complete Alternative Controls before release if they are still open.</p>
      ) : null}
      <button type="button" className="w-full rounded-xl bg-[#3b2a00] px-3 py-3 text-left text-lg font-bold" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide Direct Control not used" : "Direct Control not used / Alternative Controls"}
      </button>
      {open ? (
        <div className="space-y-3 rounded-xl bg-[#070b14] p-3">
          <p className="text-sm">
            Use this only when an approved Direct Control will not be used. EnergyGuard will not invent a barrier. Supervisor review is still required before Ready for Work.
          </p>
          <label className="block text-sm font-bold">
            Why a Direct Control is not used
            <select className="mt-1 w-full rounded-xl bg-[#121a2b] p-3 text-base font-normal" value={reason} onChange={(e) => setReason(e.target.value)}>
              {DIRECT_CONTROL_NOT_USED_REASONS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <Field id={`${props.exposureId}-why`} label="Explanation" textarea value={explanation} onChange={setExplanation} />
          <p className="font-bold">Alternative Control 1</p>
          <select className="w-full rounded-xl bg-[#121a2b] p-3" value={firstCategory} onChange={(e) => setFirstCategory(e.target.value)}>
            {categoryNames.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select className="w-full rounded-xl bg-[#121a2b] p-3" value={firstControlId} onChange={(e) => setFirstControlId(e.target.value)}>
            <option value="">Choose from this category</option>
            {firstOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.exactName}</option>
            ))}
            <option value="other">Other</option>
          </select>
          <Field id={`${props.exposureId}-o1`} label="Person responsible" value={firstOwner} onChange={setFirstOwner} />
          <select className="w-full rounded-xl bg-[#121a2b] p-3" value={firstVerify} onChange={(e) => setFirstVerify(e.target.value)}>
            {VERIFICATION_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <p className="font-bold">Alternative Control 2 (different category)</p>
          <select className="w-full rounded-xl bg-[#121a2b] p-3" value={secondCategory} onChange={(e) => setSecondCategory(e.target.value)}>
            {categoryNames.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select className="w-full rounded-xl bg-[#121a2b] p-3" value={secondControlId} onChange={(e) => setSecondControlId(e.target.value)}>
            <option value="">Choose from this category</option>
            {secondOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.exactName}</option>
            ))}
            <option value="other">Other</option>
          </select>
          <Field id={`${props.exposureId}-o2`} label="Person responsible" value={secondOwner} onChange={setSecondOwner} />
          <select className="w-full rounded-xl bg-[#121a2b] p-3" value={secondVerify} onChange={(e) => setSecondVerify(e.target.value)}>
            {VERIFICATION_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <Field id={`${props.exposureId}-residual`} label="Remaining exposure" textarea value={residual} onChange={setResidual} />
          <Field id={`${props.exposureId}-stop`} label="Stop-work trigger" textarea value={stopTrigger} onChange={setStopTrigger} />
          <label className="flex items-start gap-3 text-lg">
            <input type="checkbox" className="mt-1 h-6 w-6" checked={supervisorReviewed} onChange={(e) => setSupervisorReviewed(e.target.checked)} />
            Supervisor has reviewed this Alternative Control strategy
          </label>
          {error ? <p role="alert">{error}</p> : null}
          <BigButton
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const describe = (category: string, controlId: string, options: { id: string; exactName: string }[]) => {
                  if (controlId === "other" || !controlId) {
                    return { category, description: `Other ${category} control`, catalogControlId: null, isOther: true };
                  }
                  const hit = options.find((c) => c.id === controlId);
                  return {
                    category,
                    categoryId: props.categories.find((c) => c.exactName === category)?.id,
                    description: hit?.exactName ?? category,
                    catalogControlId: controlId,
                    isOther: false,
                  };
                };
                const one = describe(firstCategory, firstControlId, firstOptions);
                const two = describe(secondCategory, secondControlId, secondOptions);
                await props.onSaveNotUsed({
                  exposureId: props.exposureId,
                  energySource: props.energySource,
                  reason,
                  explanation,
                  residualExposure: residual,
                  stopWorkTrigger: stopTrigger,
                  supervisorReviewed,
                  controls: [
                    { ...one, owner: firstOwner, verificationMethod: firstVerify },
                    { ...two, owner: secondOwner, verificationMethod: secondVerify },
                  ],
                });
                setOpen(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not save the override.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : "Save not-used and Alternative Controls"}
          </BigButton>
        </div>
      ) : null}
    </div>
  );
}
