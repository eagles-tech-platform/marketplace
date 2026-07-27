import { useEffect, useState } from "react";
import { Link } from "react-router";
import { CheckCircle2, Shield, Clock, Award, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { metaApi, type PlatformStats } from "@/lib/api";

const values = [
  { icon: Shield, title: "Trust & Safety", description: "Providers can earn a Verified badge through a live video call and portfolio review, so you know who you're hiring." },
  { icon: Clock, title: "Speed", description: "Find and book services within minutes, not hours. Our platform is built for efficiency." },
  { icon: Award, title: "Quality", description: "We maintain high standards through our rating system and continuous quality monitoring." },
  { icon: Heart, title: "Community", description: "We're building a community where skilled workers thrive and customers get exceptional service." },
];

function formatStat(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 1000)}K+`;
  return String(n);
}

export default function About() {
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    metaApi.stats().then(setPlatformStats).catch(() => setPlatformStats(null));
  }, []);

  const stats = platformStats
    ? [
        { value: `${platformStats.totalCategories}+`, label: "Service Categories" },
        { value: `${platformStats.totalNiches}+`, label: "Job Niches" },
        { value: formatStat(platformStats.totalProviders), label: "Verified Providers" },
        { value: formatStat(platformStats.totalCustomers), label: "Customers" },
        { value: platformStats.completedBookings > 0 ? `${platformStats.satisfactionRate}%` : "—", label: "Satisfaction Rate" },
        { value: String(platformStats.totalStates), label: "States Covered" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 bg-gradient-to-br from-teal-500 via-teal-600 to-orange-500">
        <div className="absolute inset-0 bg-[url('/hero-main.jpg')] bg-cover bg-center opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            About MarketPlace
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            We're on a mission to connect every household and business in Nigeria with skilled,
            verified service providers — making quality services accessible to everyone.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <img
                src="/provider-work.jpg"
                alt="Service provider at work"
                className="rounded-2xl shadow-lg w-full object-cover h-96"
              />
            </div>
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-slate-800">Our Story</h2>
              <p className="text-slate-600 leading-relaxed">
                MarketPlace was born from a simple observation: finding reliable service providers in Nigeria
                was unnecessarily difficult. Whether you needed a plumber at midnight or an electrician for
                a new installation, the process was frustrating and often led to subpar results.
              </p>
              <p className="text-slate-600 leading-relaxed">
                We built MarketPlace to solve this problem. Our platform brings together verified,
                skilled professionals from every trade imaginable — from construction workers to beauty
                therapists, from automotive technicians to event planners.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Today, we're proud to serve thousands of customers and providers across the nation,
                facilitating secure transactions, enabling real-time communication, and building a
                community based on trust and quality service delivery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-teal-600 mb-1">{stat.value}</div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Our Values</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              The principles that guide everything we do at MarketPlace
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((val) => (
              <div key={val.title} className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mb-5">
                  <val.icon className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{val.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{val.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-br from-teal-50 to-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">How It Works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "For Customers", items: ["Create an account and pay verification fee", "Browse services by category or search", "Book and pay securely through the platform", "Chat with your assigned provider", "Rate and review after service completion"] },
              { step: "2", title: "For Service Providers", items: ["Sign up and select your job category", "Purchase a provider slot", "Get verified by our admin team", "Upload your services and set prices", "Start receiving bookings and earning"] },
              { step: "3", title: "Safety & Payments", items: ["All providers are background-checked", "Secure payments via Paystack/Flutterwave", "Money held in escrow until service completion", "Dispute resolution system", "24/7 customer support"] },
            ].map((col) => (
              <div key={col.title} className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-orange-500 flex items-center justify-center text-white font-bold mb-5">
                  {col.step}
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-5">{col.title}</h3>
                <ul className="space-y-3">
                  {col.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                      <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-800 mb-6">Join Our Community Today</h2>
          <p className="text-slate-500 max-w-xl mx-auto mb-8">
            Whether you're looking for services or want to offer your skills, MarketPlace is the platform for you.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/signup">
              <Button className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-full px-8 py-6 text-base font-semibold hover:opacity-90">
                Get Started
              </Button>
            </Link>
            <Link to="/services">
              <Button className="bg-white border-2 border-slate-200 text-slate-700 rounded-full px-8 py-6 text-base font-semibold hover:border-teal-300 hover:text-teal-600">
                Browse Services
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
