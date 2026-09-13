"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BigButton } from "@/components/field/FieldChrome";

export default function NewBriefPage() {
  const router = useRouter();
  const [workTypes, setWorkTypes] = useState<any[]>([]);
  const [workTypeCode, setWorkTypeCode] = useState("ELECTRIC_DISTRIBUTION");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/reference/catalog").then((r) => r.json()).then((d) => setWorkTypes(d.workTypes ?? []));
  }, []);
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-3xl font-bold">Start the Job Brief</h1>
      <p className="mt-3 text-lg">Choose the Electric Delivery work type. You can add the rest on the next screens.</p>
      {error ? <p role="alert">{error}</p> : null}
      <div className="mt-6 space-y-3">
        {workTypes.map((wt) => (
          <BigButton key={wt.id} selected={workTypeCode === wt.code} onClick={() => setWorkTypeCode(wt.code)}>
            {wt.exactName}
          </BigButton>
        ))}
      </div>
      <button
        type="button"
        className="mt-8 w-full rounded-2xl bg-[#ffd000] py-4 text-xl font-bold text-black"
        onClick={async () => {
          const res = await fetch("/api/jrbs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workTypeCode, crewMembers: [{ name: "Jordan Miles" }] }),
          });
          const data = await res.json();
          if (!res.ok) setError(data.error);
          else router.push(`/briefs/${data.id}`);
        }}
      >
        Create draft
      </button>
    </main>
  );
}
