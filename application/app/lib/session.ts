import { cookies } from "next/headers";

export const DONOR_COOKIE = "donor_id";

export async function getDonorId() {
  const store = await cookies();
  return store.get(DONOR_COOKIE)?.value?.trim() ?? "";
}
