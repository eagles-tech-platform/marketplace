import { Link } from "react-router";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="py-12 lg:py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-orange-500 flex items-center justify-center">
                <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-lg" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-slate-400 tracking-tight">
                  QUANTUM
                </span>
                <span className="text-2xl font-bold text-white tracking-tight">
                  MarketPlace
                </span>
              </div>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-sm">
              Bringing together the services you thought were far away. Connect with verified
              service providers across 200+ professional categories right in your neighborhood.
            </p>
            <div className="flex items-center gap-3">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-teal-500 hover:text-white transition-all duration-200"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* For Customers */}
          <div>
            <h4 className="text-white font-semibold mb-4">For Customers</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Browse Services", path: "/services" },
                { label: "How It Works", path: "/about" },
                { label: "Pricing", path: "/about" },
                { label: "Safety", path: "/about" },
                { label: "Sign Up", path: "/signup" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="text-sm text-slate-400 hover:text-teal-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Providers */}
          <div>
            <h4 className="text-white font-semibold mb-4">For Providers</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Become a Provider", path: "/signup" },
                { label: "Provider Guidelines", path: "/about" },
                { label: "Success Stories", path: "/blog" },
                { label: "Provider Support", path: "/about" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="text-sm text-slate-400 hover:text-teal-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2.5">
              {[
                { label: "About Us", path: "/about" },
                { label: "Blog", path: "/blog" },
                { label: "Careers", path: "/about" },
                { label: "Contact", path: "/about" },
                { label: "Help Center", path: "/about" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="text-sm text-slate-400 hover:text-teal-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Contact Bar */}
        <div className="border-t border-slate-800 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <Mail className="w-4 h-4" />
              support@marketplace.com
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="w-4 h-4" />
              +234 800 123 4567
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/terms" className="text-slate-400 hover:text-teal-400 transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="text-slate-400 hover:text-teal-400 transition-colors">
              Privacy
            </Link>
            <Link to="/cookies" className="text-slate-400 hover:text-teal-400 transition-colors">
              Cookies
            </Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 py-5 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Quantum MarketPlace. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
