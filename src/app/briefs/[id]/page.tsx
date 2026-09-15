import { BriefWizard } from "@/components/field/BriefWizard";

export default async function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BriefWizard id={id} />;
}
