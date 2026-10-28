import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Search, Star, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/auth/DashboardLayout";
import { jobCategories } from "@/data/categories";
import { serviceApi, ApiError, type ServiceItem } from "@/lib/api";

function providerName(service: ServiceItem) {
  return typeof service.provider === "object" ? service.provider.name : "";
}
function providerCity(service: ServiceItem) {
  return typeof service.provider === "object" ? service.provider.city || service.provider.state : "";
}

export default function CustomerServices() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    serviceApi
      .list({ search: search || undefined, category: selectedCategory === "all" ? undefined : selectedCategory })
      .then((res) => setServices(res.services))
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : "Could not load services."))
      .finally(() => setLoading(false));
  }, [search, selectedCategory]);

  return (
    <DashboardLayout role="customer" title="Browse Services">
      {/* Search & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-xl border-slate-200"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === "all" ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All
            </button>
            {jobCategories.slice(0, 6).map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.name ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-10">Loading services...</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <Link key={service._id} to={`/services/${service._id}`} className="group">
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="h-40 overflow-hidden bg-slate-100">
                  <img src={service.images[0] || "/provider-work.jpg"} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-4">
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700 mb-2">{service.niche}</span>
                  <h3 className="font-semibold text-slate-800 mb-1 group-hover:text-teal-600 transition-colors text-sm">{service.title}</h3>
                  <p className="text-xs text-slate-500 mb-2">{providerName(service)}</p>
                  {service.reviewCount > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.floor(service.rating) ? "text-yellow-400 fill-yellow-400" : "text-slate-200 fill-slate-200"}`} />
                      ))}
                      <span className="text-xs text-slate-500 ml-1">{service.rating}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="w-3 h-3" />{providerCity(service) || "Nigeria"}
                    </span>
                    <span className="text-sm font-bold text-teal-600">₦{service.price.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && services.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No services found</p>
        </div>
      )}
    </DashboardLayout>
  );
}
