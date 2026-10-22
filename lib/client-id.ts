import "server-only";
import { cookies } from "next/headers";

export const CLIENT_ID_COOKIE = "tee_client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The anonymous browser id set by middleware, or null if missing or malformed.
export async function getClientId(): Promise<string | null> {
  const value = (await cookies()).get(CLIENT_ID_COOKIE)?.value;
  return value && UUID.test(value) ? value : null;
}
