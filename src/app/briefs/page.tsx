"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ConnectionStatus } from "@/components/field/ConnectionStatus";
import { AppHeader, PageFooter, PageShell, StatusChip, canSeeLibraries, canSeeSupervisorLog } from "@/components/ui/AppHeader";
import { canWriteJrb } from "@/lib/auth/rbac";
import {
  briefListBucket,
  briefTitle,
  jobTiming,
  plainStatus,
  statusTone,
  type BriefListFolder,
} from "@/lib/domain/briefPresentation";

const FOLDERS: { id: BriefListFolder; label: string }[] = [
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "archived", label: "Archived" },
];

export default function BriefsPage() {
  const [jrbs, setJrbs] = useState<any[] | null>(null);
  const [me, setMe] = useState<any>(null);
  const [filter, setFilter] = useState<BriefListFolder>("in_progress");
  const [now, setNow] = useState(() => Date.now());
  const [busyId, setBusyId] = useState<string | null>(null);
  const load = () => fetch("/api/jrbs").then((r) => r.json()).then((d) => setJrbs(d.jrbs ?? []));
  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json()).then(setMe);
    load();
  }, []);
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(tick);
  }, []);
  const roles = me?.user?.roles as string[] | undefined;
  const rolesLoaded = Boolean(me?.user);
  const canCreate = canWriteJrb((roles ?? []) as Parameters<typeof canWriteJrb>[0]);
  const grouped = useMemo(() => {
    const list = jrbs ?? [];
    const in_progress: any[] = [];
    const completed: any[] = [];
    const archived: any[] = [];
    for (const j of list) {
      const bucket = briefListBucket(j);
      if (bucket === "completed") completed.push(j);
      else if (bucket === "archived") archived.push(j);
      else in_progress.push(j);
    }
    return { in_progress, completed, archived };
  }, [jrbs]);
  const shown = grouped[filter];
  const moveBrief = async (id: string, action: "discardBrief" | "restoreBrief") => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/jrbs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not update this brief.");
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };
  return (
    <div className="min-h-dvh">
      <AppHeader
        title="My job briefs"
        subtitle={me?.user?.displayName ? `${me.user.displayName} · Electric Delivery` : "Electric Delivery"}
        right={<ConnectionStatus />}
      />
      <PageShell>
        {!rolesLoaded ? null : canCreate ? (
          <Link href="/briefs/new" className="block rounded-2xl bg-[var(--navy)] py-4 text-center text-xl font-bold text-white">
            Start a Job Brief
          </Link>
        ) : (
          <p className="eg-card p-4">
            Supervisors review crew briefs. Start a Job Brief is only for field crew members.
          </p>
        )}
        <div className="mt-6 grid grid-cols-3 gap-2" role="tablist" aria-label="Job brief folders">
          {FOLDERS.map((folder) => (
            <button
              key={folder.id}
              type="button"
              role="tab"
              aria-selected={filter === folder.id}
              className={`rounded-xl px-2 py-3 text-sm font-bold ${filter === folder.id ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-white"}`}
              onClick={() => setFilter(folder.id)}
            >
              {folder.label} ({grouped[folder.id].length})
            </button>
          ))}
        </div>
        <p className="eg-muted mt-3 text-sm">
          {filter === "in_progress"
            ? "Jobs you are still working on."
            : filter === "completed"
              ? "Jobs that finished the post-job review."
              : "Briefs you discarded, or empty starts that were never filled in."}
        </p>
        {shown.length === 0 ? (
          <p className="eg-card mt-6 p-4 eg-muted">
            {filter === "in_progress"
              ? "No jobs in progress. Start a brief or check Completed and Archived."
              : filter === "completed"
                ? "No completed jobs yet."
                : "Nothing archived yet."}
          </p>
        ) : null}
        <ul className="mt-6 space-y-3">
          {shown.map((j) => {
            const title = briefTitle(j);
            const timing = jobTiming(j, new Date(now));
            const folder = briefListBucket(j);
            return (
              <li key={j.id} className="eg-card p-4">
                <a href={`/briefs/${j.id}`} className="block">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xl font-bold">{title}</p>
                    <StatusChip tone={statusTone(j.status, j.discardedAt)}>{plainStatus(j.status, j.discardedAt)}</StatusChip>
                  </div>
                  <p className="mt-1 text-sm">{j.jrbNumber}{j.createdBy?.displayName ? ` · ${j.createdBy.displayName}` : ""}</p>
                  {timing.line ? <p className="eg-muted mt-1 text-sm">{timing.line}</p> : null}
                </a>
                {canCreate && folder === "in_progress" && j.status !== "closed" ? (
                  <button
                    type="button"
                    className="mt-3 w-full rounded-xl border border-[var(--border)] py-3 font-bold"
                    disabled={busyId === j.id}
                    onClick={() => {
                      if (window.confirm("Discard this brief? It will move to Archived. You can put it back later.")) {
                        void moveBrief(j.id, "discardBrief");
                      }
                    }}
                  >
                    Discard
                  </button>
                ) : null}
                {canCreate && folder === "archived" ? (
                  <button
                    type="button"
                    className="mt-3 w-full rounded-xl border border-[var(--border)] py-3 font-bold"
                    disabled={busyId === j.id}
                    onClick={() => void moveBrief(j.id, "restoreBrief")}
                  >
                    Put back in progress
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="mt-8 space-y-2">
          {canSeeLibraries(roles) ? (
            <Link href="/admin" className="block font-bold text-[var(--navy)] underline">Libraries and audit</Link>
          ) : null}
          {canSeeSupervisorLog(roles) ? (
            <Link href="/admin/supervisor" className="block font-bold text-[var(--navy)] underline">Supervisor</Link>
          ) : null}
          <button
            type="button"
            className="w-full rounded-xl border border-[var(--border)] bg-white py-3 font-bold"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/sign-in";
            }}
          >
            Sign out
          </button>
        </div>
      </PageShell>
      <PageFooter />
    </div>
  );
}
