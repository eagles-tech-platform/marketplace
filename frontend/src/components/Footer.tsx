import { Link } from "react-router";
import type { ElementType } from "react";
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
} from "lucide-react";
import { CONTACT } from "../lib/contactInfo";

// Paste your real profile URLs. Any icon with an empty href is hidden.
const SOCIALS: { label: string; href: string; icon: ElementType }[] = [
  { label: "Facebook", href: "", icon: Facebook },
  { label: "Twitter", href: "", icon: Twitter },
  { label: "Instagram", href: "", icon: Instagram },
  { label: "LinkedIn", href: "", icon: Linkedin },
];

const CUSTOMER_LINKS = [
  { label: "Browse Services", path: "/services" },
  { label: "How It Works", path: "/about#how-it-works" },
  { label: "Pricing", path: "/about#pricing" },
  { label: "Safety", path: "/help?category=trust-safety" },
  { label: "Sign Up", path: "/signup" },
];

const PROVIDER_LINKS = [
  { label: "Become a Provider", path: "/signup" },
  { label: "Success Stories", path: "/blog" },
  { label: "Provider Guidelines", path: "/help?category=providers" },
  { label: "Provider Support", path: "/contact?topic=provider" },
];

const COMPANY_LINKS = [
  { label: "About Us", path: "/about" },
  { label: "Blog", path: "/blog" },
  { label: "Contact", path: "/contact" },
  { label: "Help Center", path: "/help" },
];

function LinkColumn({ title, links }: { title: string; links: { label: string; path: string }[] }) {
  return (
    <div>
      <h4 className="text-white font-semibold mb-4">{title}</h4>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link to={link.path} className="text-sm text-slate-400 hover:text-teal-400 transition-colors">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const socials = SOCIALS.filter((s) => s.href);

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="py-12 lg:py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-orange-500 flex items-center justify-center">
                <img src="/logo.png" alt="Quantum MarketPlace logo" className="w-10 h-10 rounded-lg" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-slate-400 tracking-tight">QUANTUM</span>
                <span className="text-2xl font-bold text-white tracking-tight">MarketPlace</span>
              </div>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-sm">
              Bringing together the services you thought were far away. Connect with verified
              service providers across 175+ services in 16 categories, right in your neighborhood.
            </p>

            {socials.length > 0 && (
              <div className="flex items-center gap-3">
                {socials.map(({ label, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-teal-500 hover:text-white transition-all duration-200"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <LinkColumn title="For Customers" links={CUSTOMER_LINKS} />
          <LinkColumn title="For Providers" links={PROVIDER_LINKS} />
          <LinkColumn title="Company" links={COMPANY_LINKS} />
        </div>

        {/* Contact Bar */}
        <div className="border-t border-slate-800 py-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-400">
            {CONTACT.email && (
              <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-1.5 hover:text-teal-400 transition-colors">
                <Mail className="w-4 h-4" />
                {CONTACT.email}
              </a>
            )}
            <a href={`tel:${CONTACT.phoneHref}`} className="flex items-center gap-1.5 hover:text-teal-400 transition-colors">
              <Phone className="w-4 h-4" />
              {CONTACT.phoneDisplay}
            </a>
            <a
              href={`https://wa.me/${CONTACT.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-teal-400 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Chat on WhatsApp
            </a>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {CONTACT.location}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/terms" className="text-slate-400 hover:text-teal-400 transition-colors">Terms</Link>
            <Link to="/privacy" className="text-slate-400 hover:text-teal-400 transition-colors">Privacy</Link>
            <Link to="/cookies" className="text-slate-400 hover:text-teal-400 transition-colors">Cookies</Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 py-5 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Quantum MarketPlace, a Quantum Eagles Ltd. product. All rights reserved.
        </div>
      </div>
    </footer>
  );
}