// Feature flags. Phase 2 "Try it on me" stays off until both are set to "true".
export const flags = {
  // Server: allows /api/tryon to run.
  tryOnServer: () => process.env.FEATURE_TRYON === "true",
  // Client: shows the "Try it on me" button.
  tryOnClient: process.env.NEXT_PUBLIC_FEATURE_TRYON === "true",
};
