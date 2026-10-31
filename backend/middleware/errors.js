// Keeps stack traces and database errors out of API responses.
// eslint-disable-next-line no-unused-vars
export function jsonErrors(err, _req, res, _next) {
  console.error("[support]", err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
}

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
