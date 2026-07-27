import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Search, Star, MapPin, Filter, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { jobCategories } from "@/data/categories";
import { serviceApi, ApiError, type ServiceItem } from "@/lib/api";

function providerName(service: ServiceItem) {
  return typeof service.provider === "object" ? service.provider.name : "";
}
function providerVerified(service: ServiceItem) {
  return typeof service.provider === "object" ? !!service.provider.isVerifiedBadge : false;
}
function providerCity(service: ServiceItem) {
  return typeof service.provider === "object" ? service.provider.city || service.provider.state : "";
}

export default function Services() {
  const [search, setSearch] = useState("");
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [showFilters, setShowFilters] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErrorMessage(null);
    serviceApi
      .list({ search: search || undefined, category: selectedCategory === "all" ? undefined : selectedCategory })
      .then((res) => setServices(res.services))
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : "Could not load services."))
      .finally(() => setLoading(false));
  }, [search, selectedCategory]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Header */}
      <section className="relative pt-28 pb-12 bg-gradient-to-br from-teal-500 via-teal-600 to-orange-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Browse Services
          </h1>
          <p className="text-white/80 max-w-xl">
            Find verified professionals across {jobCategories.length} categories and {jobCategories.reduce((s, c) => s + c.niches.length, 0)}+ niches
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search services, providers, or categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-12 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-200"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="h-12 px-6 rounded-xl border-slate-200"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === "all"
                      ? "bg-teal-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All Categories
                </button>
                {jobCategories.slice(0, 10).map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === cat.name
                        ? "bg-teal-500 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400 text-center py-10">Loading services...</p>
        ) : (
          <>
            {/* Services Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <Link
                  key={service._id}
                  to={`/services/${service._id}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="h-48 overflow-hidden bg-slate-100">
                    <img
                      src={service.images[0] || "/provider-work.jpg"}
                      alt={service.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                        {service.niche}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1 group-hover:text-teal-600 transition-colors">
                      {service.title}
                    </h3>
                    <div className="flex items-center gap-1 mb-3">
                      <p className="text-sm text-slate-500">{providerName(service)}</p>
                      {providerVerified(service) && <BadgeCheck className="w-4 h-4 text-teal-600" />}
                    </div>
                    {service.reviewCount > 0 && (
                      <div className="flex items-center gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= Math.floor(service.rating)
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-slate-200 fill-slate-200"
                            }`}
                          />
                        ))}
                        <span className="text-sm text-slate-600 ml-1">{service.rating}</span>
                        <span className="text-xs text-slate-400">({service.reviewCount} reviews)</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <MapPin className="w-3.5 h-3.5" />
                        {providerCity(service) || "Nigeria"}
                      </div>
                      <span className="text-lg font-bold text-teal-600">
                        ₦{service.price.toLocaleString()}{service.priceType === "hourly" ? "/hr" : ""}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {services.length === 0 && (
              <div className="text-center py-20">
                <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-600 mb-2">No services found</h3>
                <p className="text-slate-400">Try adjusting your search or filters</p>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
