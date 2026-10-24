import { adminClient, forgetTestUser, readTestUser } from "./test-user";

// Deleting the user removes all of their rows (every user table cascades from auth.users).
export default async function globalTeardown(): Promise<void> {
  let id: string;
  try {
    id = readTestUser().id;
  } catch {
    return;
  }
  const { error } = await adminClient().auth.admin.deleteUser(id);
  forgetTestUser();
  if (error) throw new Error(`Could not delete the e2e user ${id}: ${error.message}`);
}
