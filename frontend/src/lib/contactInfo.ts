// One place for contact details. The Footer, Contact page and Help Center all read from here.
export const CONTACT = {
  email: "", // add your support email, e.g. "hello@yourdomain.com". Hidden until set.
  phoneDisplay: "+234 907 186 2830",
  phoneHref: "+2349071862830",
  whatsapp: "2349071862830", // digits only, with country code
  location: "Anambra State, Nigeria",
  responseTime: "within 24 hours", // only keep this if you can honour it
};

export const TOPICS = [
  { value: "general", label: "General question" },
  { value: "booking", label: "Booking a job" },
  { value: "payment", label: "Payment or refund" },
  { value: "verification", label: "Verification" },
  { value: "provider", label: "Becoming a provider" },
  { value: "account", label: "My account" },
  { value: "report", label: "Report a provider" },
  { value: "partnership", label: "Partnership or press" },
  { value: "other", label: "Something else" },
] as const;
