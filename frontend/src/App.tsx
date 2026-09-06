import { Routes, Route } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import ProtectedRoute from "@/components/ProtectedRoute";

// Public Pages
import Home from "./pages/Home";
import About from "./pages/About";
import Pricing from "./pages/Pricing";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";

// Dashboard Pages
import CustomerDashboard from "./pages/dashboard/CustomerDashboard";
import CustomerBookings from "./pages/dashboard/CustomerBookings";
import CustomerRecommendations from "./pages/dashboard/CustomerRecommendations";
import CustomerServices from "./pages/dashboard/CustomerServices";
import CustomerChat from "./pages/dashboard/CustomerChat";
import CustomerCart from "./pages/dashboard/CustomerCart";
import CustomerSettings from "./pages/dashboard/CustomerSettings";
import CustomerBlog from "./pages/dashboard/CustomerBlog";

// Provider Pages
import ProviderDashboard from "./pages/provider/ProviderDashboard";
import ProviderServices from "./pages/provider/ProviderServices";
import ProviderBookings from "./pages/provider/ProviderBookings";
import ProviderChat from "./pages/provider/ProviderChat";
import ProviderEarnings from "./pages/provider/ProviderEarnings";
import ProviderSettings from "./pages/provider/ProviderSettings";
import ProviderBlog from "./pages/provider/ProviderBlog";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminSecurity from "./pages/admin/AdminSecurity";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminApprovals from "./pages/admin/AdminApprovals";
import AdminVerifications from "./pages/admin/AdminVerifications";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminBlog from "./pages/admin/AdminBlog";
import AdminFeedback from "./pages/admin/AdminFeedback";

// Shared
import NotFound from "./pages/NotFound";
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <>
    <Navbar />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/services" element={<Services />} />
        <Route path="/services/:id" element={<ServiceDetail />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:id" element={<BlogPost />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Customer Dashboard Routes — server-verified session + role required */}
        <Route element={<ProtectedRoute allow={["customer"]} />}>
          <Route path="/dashboard" element={<CustomerDashboard />} />
          <Route path="/dashboard/bookings" element={<CustomerBookings />} />
          <Route path="/dashboard/recommendations" element={<CustomerRecommendations />} />
          <Route path="/dashboard/services" element={<CustomerServices />} />
          <Route path="/dashboard/chat" element={<CustomerChat />} />
          <Route path="/dashboard/cart" element={<CustomerCart />} />
          <Route path="/dashboard/settings" element={<CustomerSettings />} />
          <Route path="/dashboard/blog" element={<CustomerBlog />} />
        </Route>

        {/* Provider Dashboard Routes */}
        <Route element={<ProtectedRoute allow={["provider"]} />}>
          <Route path="/provider" element={<ProviderDashboard />} />
          <Route path="/provider/services" element={<ProviderServices />} />
          <Route path="/provider/bookings" element={<ProviderBookings />} />
          <Route path="/provider/chat" element={<ProviderChat />} />
          <Route path="/provider/earnings" element={<ProviderEarnings />} />
          <Route path="/provider/settings" element={<ProviderSettings />} />
          <Route path="/provider/blog" element={<ProviderBlog />} />
        </Route>

        {/* Admin Dashboard Routes */}
        <Route element={<ProtectedRoute allow={["admin"]} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/reviews" element={<AdminReviews />} />
          <Route path="/admin/security" element={<AdminSecurity />} />
          <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
          <Route path="/admin/approvals" element={<AdminApprovals />} />
          <Route path="/admin/verifications" element={<AdminVerifications />} />
          <Route path="/admin/bookings" element={<AdminBookings />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/blog" element={<AdminBlog />} />
          <Route path="/admin/feedback" element={<AdminFeedback />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster position="top-right" />
    </>
  );
}
