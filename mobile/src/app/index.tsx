import { Redirect } from "expo-router";
import { useAuth } from "~/lib/auth";

// The app opens on Today when signed in, and on the welcome screen otherwise.
export default function Index() {
  const { session } = useAuth();
  return <Redirect href={session ? "/today" : "/welcome"} />;
}
