import "server-only";
import { Resend } from "resend";
import { requiredEnv } from "@/lib/env";

let client: Resend | undefined;

export async function sendEmail(to: string, subject: string, html: string) {
  client ??= new Resend(requiredEnv("RESEND_API_KEY"));
  const { error } = await client.emails.send({ from: requiredEnv("EMAIL_FROM"), to, subject, html });
  if (error) throw new Error(`Email to ${to} failed: ${error.message}`);
}
