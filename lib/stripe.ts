import "server-only";
import Stripe from "stripe";
import { requiredEnv } from "@/lib/env";

let client: Stripe | undefined;

export function stripe(): Stripe {
  client ??= new Stripe(requiredEnv("STRIPE_SECRET_KEY"));
  return client;
}
