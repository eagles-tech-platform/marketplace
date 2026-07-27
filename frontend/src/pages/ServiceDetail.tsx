import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { Star, MapPin, CheckCircle2, MessageSquare, Calendar, BadgeCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { serviceApi, bookingApi, reviewApi, ApiError, type ServiceItem, type ReviewItem } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [service, setService] = useState<ServiceItem | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<"one_time" | "ongoing">("one_time");
  const [booking, setBooking] = useState(false);
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    serviceApi
      .getOne(id)
      .then((res) => setService(res.service))
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : "Could not load this service."))
      .finally(() => setLoading(false));
    reviewApi
      .byService(id)
      .then((res) => setReviews(res.reviews))
      .catch(() => setReviews([]));
  }, [id]);

  const providerInfo = service && typeof service.provider === "object" ? service.provider : null;

  const handleBookNow = async () => {
    if (!service) return;
    if (!isAuthenticated) {
      navigate(`/login?returnUrl=/services/${service._id}`);
      return;
    }
    setBooking(true);
    setBookingMessage(null);
    try {
      await bookingApi.create({ serviceId: service._id, type: bookingType });
      setBookingMessage("Booked! Find it under My Bookings.");
    } catch (err) {
      setBookingMessage(err instanceof ApiError ? err.message : "Could not create booking.");
    } finally {
      setBooking(false);
    }
  };

  const handleChat = () => {
    if (!providerInfo) return;
    if (!isAuthenticated) {
      navigate(`/login?returnUrl=/services/${service?._id}`);
      return;
    }
    const chatPath = user?.activeRole === "provider" ? "/provider/chat" : "/dashboard/chat";
    navigate(`${chatPath}?with=${providerInfo._id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <p className="text-center text-slate-400 pt-32">Loading service...</p>
      </div>
    );
  }

  if (errorMessage || !service) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="text-center pt-32">
          <p className="text-slate-500 mb-4">{errorMessage || "Service not found."}</p>
          <Link to="/services" className="text-teal-600 underline">Back to Services</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <Link to="/services" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Services
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-100">
              <img src={service.images[0] || "/provider-work.jpg"} alt={service.title} className="w-full h-80 object-cover" />
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">{service.niche}</span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 capitalize">{service.priceType}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-3">{service.title}</h1>
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                {service.reviewCount > 0 && (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-4 h-4 ${s <= Math.floor(service.rating) ? "text-yellow-400 fill-yellow-400" : "text-slate-200 fill-slate-200"}`} />
                    ))}
                    <span className="text-sm text-slate-600 ml-1">{service.rating} ({service.reviewCount} reviews)</span>
                  </div>
                )}
                {(providerInfo?.city || providerInfo?.state) && (
                  <span className="flex items-center gap-1 text-sm text-slate-500">
                    <MapPin className="w-4 h-4" /> {providerInfo?.city || providerInfo?.state}
                  </span>
                )}
              </div>
              <p className="text-slate-600 leading-relaxed">{service.description || "No description provided yet."}</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">What's Included</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {["Professional consultation", "Quality materials", "Clean up after service", "Post-service support"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {providerInfo && (
              <div className="bg-white rounded-2xl p-6 border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">About the Provider</h3>
                <div className="flex items-start gap-4">
                  <img src={providerInfo.avatar || "/avatar-provider-1.jpg"} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-teal-500" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-semibold text-slate-800">{providerInfo.name}</h4>
                      {providerInfo.isVerifiedBadge && <BadgeCheck className="w-4 h-4 text-teal-600" />}
                    </div>
                    <p className="text-sm text-slate-500 mb-2">{service.niche}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                Reviews {reviews.length > 0 && `(${reviews.length})`}
              </h3>
              {reviews.length === 0 ? (
                <p className="text-sm text-slate-400">No reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review._id} className="border-b border-slate-50 last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center gap-3 mb-1">
                        <img src={review.customer.avatar || "/avatar-customer-1.jpg"} alt="" className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{review.customer.name}</p>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`w-3 h-3 ${s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-200 fill-slate-200"}`} />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 ml-auto">{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                      {review.comment && <p className="text-sm text-slate-600 mt-2">{review.comment}</p>}
                      {review.providerReply && (
                        <div className="mt-2 ml-4 pl-3 border-l-2 border-teal-200">
                          <p className="text-xs font-medium text-teal-700">Provider response</p>
                          <p className="text-sm text-slate-600">{review.providerReply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl font-bold text-teal-600">₦{service.price.toLocaleString()}</span>
                <span className="text-sm text-slate-500 capitalize">{service.priceType === "hourly" ? "/hr" : ""}</span>
              </div>

              <div className="space-y-3 mb-6">
                {providerInfo?.isVerifiedBadge && (
                  <div className="flex items-center gap-2 text-sm text-teal-700">
                    <BadgeCheck className="w-4 h-4" />
                    Verified provider
                  </div>
                )}
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setBookingType("one_time")}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border ${bookingType === "one_time" ? "bg-teal-500 text-white border-teal-500" : "border-slate-200 text-slate-600"}`}
                >
                  One-time
                </button>
                <button
                  onClick={() => setBookingType("ongoing")}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border ${bookingType === "ongoing" ? "bg-teal-500 text-white border-teal-500" : "border-slate-200 text-slate-600"}`}
                >
                  Ongoing
                </button>
              </div>

              <Button
                onClick={handleBookNow}
                disabled={booking}
                className="w-full bg-gradient-to-r from-teal-500 to-orange-500 text-white font-semibold rounded-xl py-6 hover:opacity-90 mb-3"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {booking ? "Booking..." : "Book Now"}
              </Button>
              <Button onClick={handleChat} variant="outline" className="w-full rounded-xl py-6 border-teal-200 text-teal-600 hover:bg-teal-50">
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat with Provider
              </Button>

              {bookingMessage && (
                <p className="text-xs text-center mt-4 text-teal-600">{bookingMessage}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
