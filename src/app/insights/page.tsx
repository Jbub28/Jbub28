import { Dashboard } from "@/components/dashboard/Dashboard";
import Link from "next/link";
import { Navigation } from "lucide-react";

export default function InsightsPage() {
  return (
    <main className="flex-1">
      <div className="border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          <Navigation className="h-4 w-4" />
          Back to navigation
        </Link>
      </div>
      <Dashboard />
    </main>
  );
}
