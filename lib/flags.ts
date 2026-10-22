// Feature flags.
export const flags = {
  // "Restyle with AI" (Gemini). Needs GEMINI_API_KEY on the server.
  aiRestyleServer: () => process.env.FEATURE_AI_RESTYLE === "true" && !!process.env.GEMINI_API_KEY,
  aiRestyleClient: process.env.NEXT_PUBLIC_FEATURE_AI_RESTYLE === "true",

  // Phase 2 "Try it on me" stays off until both are set to "true".
  tryOnServer: () => process.env.FEATURE_TRYON === "true",
  tryOnClient: process.env.NEXT_PUBLIC_FEATURE_TRYON === "true",
};
