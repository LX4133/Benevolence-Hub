"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_DONOR_IDS, verifyAccount } from "./lib/feishu";
import { DONOR_COOKIE } from "./lib/session";

async function setSession(donorId: string) {
  const store = await cookies();
  store.set(DONOR_COOKIE, donorId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function signIn(formData: FormData) {
  const donorId = String(formData.get("donor") ?? "").trim();
  if (!new Set<string>(DEMO_DONOR_IDS).has(donorId)) redirect("/login?error=invalid");
  await setSession(donorId);
  redirect("/");
}

export async function signInAccount(formData: FormData) {
  const account = String(formData.get("account") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const donorId = await verifyAccount(account, password);
  if (!donorId) redirect("/login?error=account");
  await setSession(donorId);
  redirect("/");
}
