import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function HomePage() {
  const token = cookies().get("auth-token")?.value;
  const role = cookies().get("auth-role")?.value;

  if (token) {
    redirect(role === "candidate" ? "/dashboard/candidate" : "/dashboard/recruiter");
  }

  redirect("/login");
}
