import { redirect } from "next/navigation";

// The Account page moved. Its target is on the Dashboard, and the weigh-in form is moving to Progress.
export default function AccountPage() {
  redirect("/dashboard");
}
