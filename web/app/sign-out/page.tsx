import { redirect } from "next/navigation";

export default function SignOutPage() {
  // Redirect to the logout API route which handles session cleanup
  redirect("/api/auth/logout");
}
