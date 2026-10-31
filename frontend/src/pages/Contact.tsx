
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import {
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  CheckCircle2,
  Copy,
  Loader2,
  Headphones,
  ArrowRight,
} from "lucide-react";
import { supportApi } from "../lib/api";
import { CONTACT, TOPICS } from "../lib/contactInfo";

type Form = {
  name: string;
  email: string;
  phone: string;
  topic: string;
  subject: string;
  message: string;
  website: string;
};

type Errors = Partial<Record<keyof Form, string>>;

const MAX_MESSAGE = 3000;

function validate(f: Form): Errors {
  const e: Errors = {};

  if (f.name.trim().length < 2) e.name = "Enter your name.";
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = "Enter a valid email address.";
  if (f.phone && !/^[+\d\s()-]+$/.test(f.phone)) e.phone = "Use digits, spaces, +, brackets or - only.";
  if (f.subject.trim().length < 3) e.subject = "Add a short subject.";
  if (f.message.trim().length < 10) e.message = "Tell us a bit more (at least 10 characters).";

  return e;
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-800"
      >
        {label}
      </label>

      {children}

      {hint && !error && (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}

      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-sm font-medium text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}

const input = (bad?: string) =>
  `w-full rounded-lg border bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
    bad
      ? "border-red-400 focus:border-red-500"
      : "border-slate-200 hover:border-slate-300 focus:border-teal-600"
  }`;

export default function Contact() {
  const [params] = useSearchParams();

  const initialTopic = TOPICS.some(
    (t) => t.value === params.get("topic")
  )
    ? (params.get("topic") as string)
    : "general";

  const [form, setForm] = useState<Form>({
    name: "",
    email: "",
    phone: "",
    topic: initialTopic,
    subject: "",
    message: "",
    website: "",
  });

  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  useEffect(() => {
    document.title = "Contact Us | Quantum MarketPlace";
  }, []);

  const set = (k: keyof Form) =>
    (e: { target: { value: string } }) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));

      if (errors[k]) {
        setErrors((previous) => ({ ...previous, [k]: undefined }));
      }

      if (formError) setFormError("");
    };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    // Honeypot protection
    if (form.website.trim()) return;

    const validation = validate(form);
    setErrors(validation);

    if (Object.keys(validation).length > 0) return;

    setSending(true);

    try {
      const res = await supportApi.createTicket({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        phone: form.phone.trim() || undefined,
        website: form.website || undefined,
      });

      setTicketId(res.ticketId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSending(false);
    }
  }

  async function copyTicket() {
    try {
      await navigator.clipboard.writeText(ticketId);
      setCopied(true);
      setCopyError("");
    } catch {
      setCopied(false);
      setCopyError("Unable to copy automatically. Please select the ticket ID.");
    }
  }

  // Successful ticket submission
  if (ticketId) {
    return (
      <main className="min-h-screen bg-slate-50">
        <section className="relative overflow-hidden bg-gradient-to-br from-teal-500 via-teal-600 to-orange-500 py-20 pt-28">
          <div
            className="absolute inset-0 bg-[url('/hero-main.jpg')] bg-cover bg-center opacity-10"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-3xl px-4 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-white" />
            <h1 className="mt-5 text-3xl font-bold text-white sm:text-4xl">
              Message received!
            </h1>
            <p className="mt-3 text-white/90">
              Thank you for reaching out. Our support team will be in touch.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-xl px-4 py-12 sm:py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-9">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <Mail className="h-8 w-8" />
            </div>

            <h2 className="mt-5 text-2xl font-bold text-slate-900">
              We've got your message
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Save your ticket ID. You'll need it, together with your email,
              to check progress or reply.
            </p>

            <div className="mx-auto mt-7 flex max-w-sm items-center justify-between gap-3 rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-4">
              <span className="break-all font-mono text-lg font-bold text-teal-900">
                {ticketId}
              </span>

              <button
                type="button"
                onClick={copyTicket}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold text-teal-800 transition-colors hover:bg-teal-100"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            {copyError && (
              <p role="alert" className="mt-2 text-xs text-red-600">
                {copyError}
              </p>
            )}

            <p className="mt-6 text-sm text-slate-600">
              We usually reply {CONTACT.responseTime}.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/support/track"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
              >
                Check ticket status
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/help"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
              >
                Browse Help Center
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const cards = [
    {
      icon: Phone,
      label: "Call us",
      value: CONTACT.phoneDisplay,
      href: CONTACT.phoneHref ? `tel:${CONTACT.phoneHref}` : undefined,
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: "Chat with our team",
      href: `https://wa.me/${CONTACT.whatsapp}`,
      external: true,
    },
    ...(CONTACT.email
      ? [{
          icon: Mail,
          label: "Email",
          value: CONTACT.email,
          href: `mailto:${CONTACT.email}`,
        }]
      : []),
    {
      icon: MapPin,
      label: "Our location",
      value: CONTACT.location,
    },
    {
      icon: Clock,
      label: "Response time",
      value: CONTACT.responseTime,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-500 via-teal-600 to-orange-500 py-20 pt-28 sm:py-24">
        <div
          className="absolute inset-0 bg-[url('/hero-main.jpg')] bg-cover bg-center opacity-10"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-white shadow-lg backdrop-blur-sm">
            <Headphones className="h-7 w-7" />
          </div>

          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-white/85">
            We're here to help
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Contact Us
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
            Have a question or need assistance? Send us a message and
            our team will be happy to help.
          </p>
        </div>
      </section>

      {/* Contact content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-9 text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            Get in touch
          </h2>

          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Choose how you'd like to reach us, or send a message using
            the form below.
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-5 lg:gap-10">
          {/* Contact form */}
          <form
            onSubmit={submit}
            noValidate
            className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:col-span-3"
          >
            <div className="border-b border-slate-100 pb-5">
              <h3 className="text-xl font-bold text-slate-900">
                Send us a message
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Fill in the details below and we'll get back to you.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="name" label="Your name" error={errors.name}>
                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={set("name")}
                  autoComplete="name"
                  placeholder="Enter your name"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  className={input(errors.name)}
                />
              </Field>

              <Field id="email" label="Email address" error={errors.email}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className={input(errors.email)}
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="phone" label="Phone (optional)" error={errors.phone}>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  autoComplete="tel"
                  placeholder="+234"
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                  className={input(errors.phone)}
                />
              </Field>

              <Field id="topic" label="Topic">
                <select
                  id="topic"
                  name="topic"
                  value={form.topic}
                  onChange={set("topic")}
                  className={input()}
                >
                  {TOPICS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field id="subject" label="Subject" error={errors.subject}>
              <input
                id="subject"
                name="subject"
                value={form.subject}
                onChange={set("subject")}
                maxLength={120}
                placeholder="What is this regarding?"
                aria-invalid={!!errors.subject}
                aria-describedby={errors.subject ? "subject-error" : undefined}
                className={input(errors.subject)}
              />
            </Field>

            <Field
              id="message"
              label="Your message"
              error={errors.message}
              hint={`${form.message.length}/${MAX_MESSAGE} characters`}
            >
              <textarea
                id="message"
                name="message"
                rows={6}
                value={form.message}
                onChange={set("message")}
                maxLength={MAX_MESSAGE}
                placeholder="Describe how we can help you..."
                aria-invalid={!!errors.message}
                aria-describedby={errors.message ? "message-error" : undefined}
                className={`${input(errors.message)} min-h-36 resize-y`}
              />
            </Field>

            {/* Honeypot */}
            <div
              aria-hidden="true"
              className="absolute -left-[10000px] h-px w-px overflow-hidden"
            >
              <label htmlFor="website">Leave this field empty</label>
              <input
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={set("website")}
              />
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
              >
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 sm:w-auto"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending message...
                </>
              ) : (
                <>
                  Send message
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Contact information */}
          <aside className="space-y-5 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <h3 className="text-xl font-bold text-slate-900">
                Contact information
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Reach our support team through any of the channels below.
              </p>

              <ul className="mt-7 space-y-6">
                {cards.map(({ icon: Icon, label, value, href, external }) => (
                  <li key={label} className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>

                    <div className="min-w-0 pt-0.5">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {label}
                      </span>

                      {href ? (
                        <a
                          href={href}
                          {...(external
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                          className="mt-1 block break-words text-sm font-semibold text-slate-800 transition-colors hover:text-teal-700"
                        >
                          {value}
                        </a>
                      ) : (
                        <span className="mt-1 block break-words text-sm font-semibold text-slate-800">
                          {value}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Help center card */}
            <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-orange-50 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
                <Headphones className="h-5 w-5" />
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                Need quick answers?
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Explore our Help Center for guides, frequently asked
                questions, and useful resources.
              </p>

              <Link
                to="/help"
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-teal-800 transition-colors hover:text-teal-950"
              >
                Visit Help Center
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Ticket tracking */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-600">
                Already contacted us?
              </p>

              <Link
                to="/support/track"
                className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:text-teal-900 hover:underline"
              >
                Track your support ticket
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
