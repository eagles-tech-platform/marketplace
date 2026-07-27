import { useEffect, useState } from "react";
import { Link } from "react-router";
import { metaApi, type PlatformStats, reviewApi, postApi, type ReviewItem, type PostItem } from "@/lib/api";
import {
  Search,
  UserCheck,
  CreditCard,
  Star,
  ArrowRight,
  HardHat,
  Zap,
  Droplets,
  Wind,
  Car,
  Sofa,
  Wrench,
  Sparkles,
  Scissors,
  Shirt,
  PartyPopper,
  Sprout,
  Truck,
  Shield,
  Factory,
  MoreHorizontal,
  CheckCircle2,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import FoundingMemberPopup from "@/components/FoundingMemberPopup";
import Footer from "@/components/Footer";

const categoryIcons: Record<string, React.ElementType> = {
  HardHat, Zap, Droplets, Wind, Car, Sofa, Wrench, Sparkles,
  Scissors, Shirt, PartyPopper, Sprout, Truck, Shield, Factory, MoreHorizontal,
};

const featuredCategories = [
  { name: "Construction & Building", icon: "HardHat", slug: "construction-building", providers: 2500 },
  { name: "Electrical Services", icon: "Zap", slug: "electrical-services", providers: 1800 },
  { name: "Plumbing & Water", icon: "Droplets", slug: "plumbing-water", providers: 1500 },
  { name: "Air Conditioning", icon: "Wind", slug: "ac-refrigeration", providers: 1200 },
  { name: "Automotive", icon: "Car", slug: "automotive", providers: 2000 },
  { name: "Furniture & Interior", icon: "Sofa", slug: "furniture-interior", providers: 1100 },
  { name: "Home Repairs", icon: "Wrench", slug: "home-repairs", providers: 1600 },
  { name: "Cleaning & Sanitation", icon: "Sparkles", slug: "cleaning-sanitation", providers: 900 },
  { name: "Beauty & Personal Care", icon: "Scissors", slug: "beauty-personal-care", providers: 2200 },
  { name: "Fashion", icon: "Shirt", slug: "fashion", providers: 800 },
  { name: "Events", icon: "PartyPopper", slug: "events", providers: 1300 },
  { name: "Logistics", icon: "Truck", slug: "logistics", providers: 700 },
];

const howItWorks = [
  { icon: Search, title: "Search", description: "Browse 200+ service categories and find exactly what you need" },
  { icon: UserCheck, title: "Connect", description: "Get matched with verified, reviewed service providers near you" },
  { icon: CreditCard, title: "Book & Pay", description: "Secure payment with Paystack, Flutterwave, or bank transfer" },
  { icon: Star, title: "Review", description: "Rate your experience and help others find the best providers" },
];

// (testimonials and blog posts are now fetched live — see useEffect below)

function formatStat(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 1000)}K+`;
  return String(n);
}

export default function Home() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [testimonials, setTestimonials] = useState<ReviewItem[]>([]);
  const [blogPosts, setBlogPosts] = useState<PostItem[]>([]);

  useEffect(() => {
    metaApi.stats().then(setStats).catch(() => setStats(null));
    reviewApi.featured().then((res) => setTestimonials(res.reviews)).catch(() => setTestimonials([]));
    postApi.list().then((res) => setBlogPosts(res.posts.slice(0, 3))).catch(() => setBlogPosts([]));
  }, []);

  return (
    <div className="min-h-screen">
      <FoundingMemberPopup />
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500 via-teal-600 to-orange-500" />
        <div className="absolute inset-0 bg-[url('/hero-main.jpg')] bg-cover bg-center opacity-10" />
        
        {/* Decorative Shapes */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-400/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-white space-y-8">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                {stats ? `${formatStat(stats.totalProviders)} verified service providers` : "Verified service providers, ready to help"}
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                Bringing Together the Services You Thought Were{" "}
                <span className="text-yellow-300">Far Away</span>
              </h1>
              
              <p className="text-lg text-white/80 max-w-lg leading-relaxed">
                From skilled artisans to professional services — find, book, and connect with verified service providers right in your neighborhood.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link to="/services">
                  <Button className="bg-white text-teal-700 hover:bg-white/90 font-semibold rounded-full px-8 py-6 text-base shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                    Find a Service
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-transparent border-2 border-white text-white hover:bg-white/10 font-semibold rounded-full px-8 py-6 text-base transition-all">
                    Become a Provider
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-8 pt-4">
                {[
                  { value: stats ? formatStat(stats.totalProviders) : "—", label: "Verified Providers" },
                  { value: stats ? formatStat(stats.totalCustomers) : "—", label: "Customers" },
                  { value: stats ? formatStat(stats.totalServices) : "—", label: "Services Listed" },
                  { value: stats && stats.avgRating > 0 ? String(stats.avgRating) : "—", label: "Avg Rating" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-sm text-white/70">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content - Floating Cards */}
            <div className="hidden lg:block relative h-[500px]">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="absolute bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-4 animate-bounce"
                  style={{
                    width: `${160 + i * 20}px`,
                    top: `${i * 80}px`,
                    left: `${i % 2 === 0 ? 0 : 100}px`,
                    animationDelay: `${i * 0.3}s`,
                    animationDuration: "3s",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Service Booked!</p>
                      <p className="text-xs text-slate-500">{["Plumber", "Electrician", "Painter", "Cleaner", "Carpenter"][i]} assigned</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-amber-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-4">
              How MarketPlace Works
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Get things done in 4 simple steps
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step, i) => (
              <div
                key={step.title}
                className="relative bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute -top-4 left-8 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-orange-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                  {i + 1}
                </div>
                <div className="w-14 h-14 rounded-xl bg-teal-50 flex items-center justify-center mb-5">
                  <step.icon className="w-7 h-7 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Categories */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-4">
              Every Service You Can Imagine
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              From construction to beauty, find professionals across every niche
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {featuredCategories.map((cat) => {
              const Icon = categoryIcons[cat.icon] || HardHat;
              return (
                <Link
                  key={cat.slug}
                  to={`/services?category=${encodeURIComponent(cat.name)}`}
                  className="group bg-white rounded-2xl p-6 border border-slate-100 hover:border-teal-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-50 to-orange-50 flex items-center justify-center mb-4 group-hover:from-teal-100 group-hover:to-orange-100 transition-colors">
                    <Icon className="w-6 h-6 text-teal-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1 group-hover:text-teal-600 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-sm text-slate-400">{(stats?.providersByCategory[cat.name] ?? 0).toLocaleString()} providers</p>
                </Link>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <Link to="/services">
              <Button className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-full px-8 py-5 text-sm font-semibold hover:opacity-90 transition-opacity">
                Explore All Categories
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Providers */}
      <section className="py-20 bg-teal-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-4">
              Top-Rated Service Providers
            </h2>
            <p className="text-slate-500 text-lg">
              Handpicked professionals with outstanding reviews
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "Emmanuel Osei", title: "Master Electrician", rating: 4.9, jobs: 234, price: "From N5,000", image: "/avatar-provider-1.jpg" },
              { name: "Amina Bello", title: "Interior Designer", rating: 4.8, jobs: 189, price: "From N15,000", image: "/avatar-customer-1.jpg" },
              { name: "Tunde Bakare", title: "Plumbing Expert", rating: 4.9, jobs: 312, price: "From N3,000", image: "/avatar-provider-1.jpg" },
              { name: "Nkechi Obi", title: "Event Planner", rating: 4.7, jobs: 156, price: "From N20,000", image: "/avatar-customer-1.jpg" },
            ].map((provider) => (
              <div
                key={provider.name}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-center"
              >
                <img
                  src={provider.image}
                  alt={provider.name}
                  className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-3 border-teal-500"
                />
                <h3 className="font-semibold text-slate-800">{provider.name}</h3>
                <p className="text-sm text-slate-500 mb-3">{provider.title}</p>
                <div className="flex items-center justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.floor(provider.rating)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-slate-200 fill-slate-200"
                      }`}
                    />
                  ))}
                  <span className="text-sm text-slate-600 ml-1">{provider.rating}</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">{provider.jobs} jobs completed</p>
                <p className="text-sm font-semibold text-teal-600">{provider.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-amber-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-4">
              What Our Users Say
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.length === 0 ? (
              <p className="text-slate-400 col-span-3 text-center">No reviews yet — be the first to leave one.</p>
            ) : (
              testimonials.map((t) => (
                <div
                  key={t._id}
                  className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 relative"
                >
                  <Quote className="w-10 h-10 text-teal-200 absolute top-6 right-6" />
                  <p className="text-slate-600 leading-relaxed mb-6 relative z-10">{t.comment}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-orange-400 flex items-center justify-center text-white font-bold">
                      {t.customer.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{t.customer.name}</p>
                      <p className="text-sm text-slate-500">{typeof t.service === "object" ? t.service.title : ""}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Blog Preview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-2">
                From Our Community
              </h2>
              <p className="text-slate-500">Tips, stories, and insights from our service providers</p>
            </div>
            <Link to="/blog" className="hidden sm:flex items-center gap-1 text-teal-600 font-medium hover:text-teal-700">
              Read All Posts <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {blogPosts.length === 0 ? (
              <p className="text-slate-400 col-span-3 text-center">No posts yet — check back soon.</p>
            ) : (
              blogPosts.map((post) => (
                <Link key={post._id} to={`/blog/${post._id}`} className="group">
                  <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <div className="h-48 overflow-hidden bg-slate-100">
                      <img
                        src={post.coverImage || "/blog-cover-1.jpg"}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="font-semibold text-slate-800 mb-2 group-hover:text-teal-600 transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-4">{post.content}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{post.author.name}</span>
                        <span>•</span>
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-teal-600 to-orange-500" />
            <div className="relative py-16 px-8 text-center">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
                Join thousands of happy customers and skilled providers
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/services">
                  <Button className="bg-white text-teal-700 hover:bg-white/90 font-semibold rounded-full px-8 py-6 text-base shadow-lg">
                    Find a Service
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-transparent border-2 border-white text-white hover:bg-white/10 font-semibold rounded-full px-8 py-6 text-base">
                    Become a Provider
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
