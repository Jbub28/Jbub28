import { redirect } from "next/navigation";

export default function SupervisorLogRedirect() {
  redirect("/admin/supervisor");
}
