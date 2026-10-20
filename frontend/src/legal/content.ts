// Legal text for Quantum MarketPlace.
// IMPORTANT: this is a starting template, not legal advice. Edit the lines marked TODO,
// then have a Nigerian lawyer review all three documents before you rely on them.

export type Block = string | string[];
export type Section = { title: string; body: Block[] };
export type LegalDoc = { title: string; intro?: string; sections: Section[] };

export const LEGAL = {
  brand: "Quantum MarketPlace",
  company: "Quantum Eagles Ltd", // TODO: confirm the legal entity that runs this service
  address: "Awka, Anambra State, Nigeria", // TODO: add the full registered address
  email: "support@example.com", // TODO: replace with your real support email
  updated: "18 October 2026",
  law: "the Federal Republic of Nigeria",
};
const L = LEGAL;

export const terms: LegalDoc = {
  title: "Terms of Service",
  intro: `These Terms govern your use of ${L.brand} (the "Service"), operated by ${L.company} ("we", "us"). By creating an account or using the Service you agree to them. If you do not agree, please do not use the Service.`,
  sections: [
    { title: "About the Service", body: [
      `${L.brand} is an online marketplace where customers find and book service providers for jobs such as repairs, installations and other skilled work.`,
      "We provide the platform. Unless we clearly say otherwise, the contract for a job is between the customer and the provider, and we are not a party to it.",
    ] },
    { title: "Eligibility and your account", body: [[
      "You must be at least 18 years old and able to enter into a binding contract.",
      "Give accurate information and keep it up to date.",
      "You must verify your email address before you can sign in. We may also ask for a one-time code when you sign in.",
      "Keep your password and codes private. You are responsible for activity on your account. Tell us at once if you think it has been misused.",
      "One person, one account.",
    ]] },
    { title: "Customers", body: [[
      "You can browse providers, request bookings and pay through the Service. Describe the job accurately and be available as agreed.",
      "You decide whether a provider is right for your job. Verification checks reduce risk but cannot remove it.",
      "Pay for work through the methods the Service offers, so that payments and disputes are recorded.",
    ]] },
    { title: "Service providers", body: [[
      "Applications are reviewed by our team. We may approve, decline or remove a provider at our discretion.",
      "Give true information about your skills, experience, category and location, and keep it current.",
      "You are an independent business. You are not our employee or agent.",
      "You must hold any licences or permits your work needs and follow safety, tax and consumer laws.",
      "Do your work with reasonable skill and care and honour the bookings you accept.",
    ]] },
    { title: "Fees and payments", body: [[
      "Some features need a fee, such as a customer verification fee or a provider slot. The amount is shown before you pay.",
      "Payments are handled by third-party payment partners (for example Paystack or Flutterwave) or by bank transfer. Their terms also apply. We do not store your full card details.",
      // TODO: confirm your refund rule and change this line if it is different.
      "Unless we say otherwise at checkout or the law requires it, fees paid to us are not refundable once the service they pay for has been provided.",
      "Fees, plans and payment methods may change as the Service develops. Changes do not affect amounts you have already paid.",
    ]] },
    { title: "Bookings, cancellations and disputes", body: [
      "Customers and providers should agree the scope, price and timing before work starts.",
      "If something goes wrong, contact the other party first. If you cannot resolve it, contact us. We may help to mediate but we do not guarantee any outcome.",
      "We may suspend accounts involved in a dispute while we look into it.",
    ] },
    { title: "Reviews and content you post", body: [
      "You own what you post (for example reviews, photos and descriptions). You give us a non-exclusive licence to display it in the Service and to promote the Service.",
      "Reviews must be honest and based on real experience. Do not post anything unlawful, defamatory, misleading or that infringes someone else's rights. We may remove content that breaks these Terms.",
    ] },
    { title: "Acceptable use", body: [
      "You agree not to:",
      [
        "break the law or help anyone else to do so;",
        "give false information or pretend to be someone else;",
        "commit fraud, harass or threaten others, or post other people's personal data;",
        "scrape, overload or interfere with the Service;",
        "try to access other accounts or weaken the Service's security.",
      ],
    ] },
    { title: "Suspension and ending your account", body: [
      "You may stop using the Service at any time and ask us to delete your account (see our Privacy Policy).",
      "We may suspend or close an account if you break these Terms, create risk for others or us, or if the law requires. Rules that by their nature should continue (for example payment, liability and dispute rules) continue after your account ends.",
    ] },
    { title: "Our responsibility", body: [
      "The Service is provided as it is and as available. We do not guarantee that a provider's work will be satisfactory or that the Service will be uninterrupted or error-free.",
      "To the extent the law allows, we are not liable for indirect or consequential loss, or for the acts or omissions of customers and providers.",
      "Nothing in these Terms limits liability that cannot be limited by law, including your statutory consumer rights.",
    ] },
    { title: "Privacy and cookies", body: [
      "Our Privacy Policy explains how we use personal data and our Cookie Policy explains how we use cookies and similar storage. Please read both.",
    ] },
    { title: "Changes to these Terms", body: [
      "We may update these Terms. When we make important changes we will tell you in the Service or by email. If you keep using the Service after the change takes effect, you accept the updated Terms.",
    ] },
    { title: "Governing law", body: [
      `These Terms are governed by the laws of ${L.law}, and the courts of ${L.law} have jurisdiction, unless the law gives you the right to go to a court elsewhere. We encourage you to contact us first so that we can try to resolve any concern informally.`,
    ] },
    { title: "Contact us", body: [`${L.company}, ${L.address}. Email: ${L.email}.`] },
  ],
};

export const privacy: LegalDoc = {
  title: "Privacy Policy",
  intro: `This policy explains what personal data ${L.brand} collects, why, who sees it, and the choices you have.`,
  sections: [
    { title: "Who we are", body: [
      `${L.company} operates ${L.brand} and is responsible for your personal data. Contact us at ${L.email}.`,
    ] },
    { title: "What we collect", body: [[
      "Account details: name, email address, phone number, password (stored in protected, hashed form), your role (customer or provider), and your state and city.", // TODO: confirm the backend hashes passwords
      "Provider profile: category, niche, years of experience, and the services, prices and photos you add.",
      "Activity: bookings, messages in chat, reviews and items in your cart.",
      "Payments: the payment method you choose, and transaction references and status. We do not store your full card number.",
      "Support and security: messages you send us, sign-in and verification events, device and browser information, IP address and error logs.",
    ]] },
    { title: "How we use it", body: [[
      "To create and secure your account and verify your email.",
      "To connect customers with providers and manage bookings.",
      "To process payments and prevent fraud and abuse.",
      "To send service messages such as verification codes and booking updates.",
      "To fix problems and improve the Service.",
      "To meet our legal duties.",
    ]] },
    { title: "Our lawful bases", body: [
      "Under the Nigeria Data Protection Act 2023 we rely on: performing our contract with you; your consent (for example for optional notifications); our legitimate interests (security, fraud prevention and improving the Service) where they are not outweighed by your rights; and legal obligations.",
    ] },
    { title: "Who we share it with", body: [
      [
        "Other users, as needed for a booking: a provider sees the customer's name, contact details and job details, and a customer sees the provider's profile.",
        "Payment partners, such as Paystack and Flutterwave, to process payments.",
        "Companies that help us run the Service, such as hosting, email and messaging providers.",
        "Authorities, where the law requires it.",
      ],
      "We do not sell your personal data.",
    ] },
    { title: "International transfers", body: [
      "Some of our service providers may process data outside Nigeria. Where that happens we take steps to protect it, as the law requires.",
    ] },
    { title: "How long we keep it", body: [
      "We keep your data while your account is active. After that we keep it only as long as needed for the purposes above, to meet legal, tax and accounting duties and to resolve disputes. Then we delete or anonymise it.",
    ] },
    { title: "Security", body: [
      "We use reasonable technical and organisational measures, such as encrypted connections, access controls and two-step sign-in codes where enabled. No system is completely secure. Tell us at once if you suspect misuse of your account.",
    ] },
    { title: "Your rights", body: [
      "You may have the right to:",
      [
        "access the personal data we hold about you;",
        "correct data that is wrong or incomplete;",
        "ask us to delete your data;",
        "object to or restrict some uses of your data;",
        "withdraw your consent at any time;",
        "receive your data in a portable format;",
        "complain to the Nigeria Data Protection Commission.",
      ],
      `To use a right, email ${L.email}. We may need to verify your identity first.`,
    ] },
    { title: "Children", body: [
      "The Service is for people aged 18 and over. We do not knowingly collect data from children. If you think a child has given us data, contact us and we will delete it.",
    ] },
    { title: "Cookies", body: ["Our Cookie Policy explains the cookies and similar storage we use."] },
    { title: "Changes to this policy", body: [
      "We may update this policy. When we make important changes we will tell you in the Service or by email.",
    ] },
    { title: "Contact", body: [`${L.company}, ${L.address}. Email: ${L.email}.`] },
  ],
};

export const cookies: LegalDoc = {
  title: "Cookie Policy",
  intro: `This policy explains how ${L.brand} uses cookies and similar storage on your device.`,
  sections: [
    { title: "What cookies are", body: [
      "Cookies are small text files that a website stores on your device. We also use similar browser storage (such as local storage) for the same purposes.",
    ] },
    { title: "What we use", body: [[
      "Essential: a secure session cookie keeps you signed in and protects your account. The Service cannot work without it.",
      "Preferences and notices: your browser's local storage remembers choices, such as that you have seen our cookie notice.",
      "Security: data that helps us detect abuse and protect accounts.",
    ]] },
    // TODO: confirm. If you add analytics, advertising or other tracking tools, update this section and ask for consent.
    { title: "What we do not use", body: [
      "At the time of writing we do not use advertising cookies or third-party tracking on the Service. If we add analytics or similar tools we will update this policy and ask for your consent where the law requires it.",
    ] },
    { title: "Third parties", body: [
      "Our payment partners may set their own cookies on their payment pages. Their policies apply to those cookies.",
    ] },
    { title: "The mobile app", body: [
      "The app stores the same kind of essential data (such as your sign-in session) on your device so that it keeps working. You can clear it by signing out or by clearing the app's data in your phone's settings.",
    ] },
    { title: "Managing cookies", body: [
      "You can delete or block cookies in your browser settings. If you block essential cookies you may not be able to sign in.",
    ] },
    { title: "Changes and contact", body: [
      `We may update this policy. Questions? Email ${L.email}.`,
    ] },
  ],
};
