// Help Center and Contact constants.
const CATEGORIES = [
  { id: "getting-started", label: "Getting started", description: "Create an account, find a provider and book your first job." },
  { id: "payments", label: "Payments and refunds", description: "How paying in the app works and what to do if something goes wrong." },
  { id: "trust-safety", label: "Trust and safety", description: "Verification, staying safe and reporting a problem." },
  { id: "providers", label: "For providers", description: "Join as an artisan, get verified and get hired." },
  { id: "account", label: "Account and security", description: "Passwords, two-factor sign-in and your details." },
];

module.exports = {
  CATEGORIES,
  CATEGORY_IDS: CATEGORIES.map((c) => c.id),
  TOPICS: ["general", "booking", "payment", "verification", "provider", "account", "report", "partnership", "other"],
  STATUSES: ["open", "in_progress", "resolved"],
};
