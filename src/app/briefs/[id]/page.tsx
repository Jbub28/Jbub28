"use client";

import { useParams } from "next/navigation";
import { BriefWizard } from "@/components/field/BriefWizard";

export default function BriefPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  if (!id) {
    return <p className="p-6 text-xl">Loading the job brief…</p>;
  }
  return <BriefWizard id={id} />;
}
