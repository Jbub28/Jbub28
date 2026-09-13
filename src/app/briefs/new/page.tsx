"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BigButton } from "@/components/field/FieldChrome";
import { AppHeader, PageFooter, PageShell } from "@/components/ui/AppHeader";

export default function NewBriefPage() {
  const router = useRouter();
  const [workTypes, setWorkTypes] = useState<any[]>([]);
  const [workTypeCode, setWorkTypeCode] = useState("ELECTRIC_DISTRIBUTION");
  const [me, setMe] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/reference/catalog").then((r) => r.json()).then((d) => setWorkTypes(d.workTypes ?? []));
    fetch("/api/auth/session").then((r) => r.json()).then(setMe);
  }, []);
  return (
    <div className="min-h-dvh">
      <AppHeader title="Start the Job Brief" subtitle="Choose the Electric Delivery work type." />
      <PageShell>
        {error ? <p className="eg-alert p-3" role="alert">{error}</p> : null}
        <div className="space-y-3">
          {workTypes.map((wt) => (
            <BigButton key={wt.id} selected={workTypeCode === wt.code} onClick={() => setWorkTypeCode(wt.code)}>
              {wt.exactName}
            </BigButton>
          ))}
        </div>
        <button
          type="button"
          className="mt-8 w-full rounded-2xl bg-[var(--navy)] py-4 text-xl font-bold text-white"
          onClick={async () => {
            const name = me?.user?.displayName;
            const res = await fetch("/api/jrbs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                workTypeCode,
                crewMembers: name ? [{ name, employer: "Electric Delivery" }] : [],
              }),
            });
            const data = await res.json();
            if (!res.ok) setError(data.error);
            else router.push(`/briefs/${data.id}`);
          }}
        >
          Create draft
        </button>
      </PageShell>
      <PageFooter />
    </div>
  );
}
