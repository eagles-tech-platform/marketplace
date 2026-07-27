// Minimal fetch wrapper for the new Express/MongoDB backend.
// Cookies (httpOnly JWT) are sent automatically via `credentials: "include"`.

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

/**
 * Builds a query string, safely dropping undefined/null/empty values.
 * `new URLSearchParams({ foo: undefined })` does NOT drop undefined —
 * it stringifies it to the literal text "undefined", which then gets
 * sent to the backend as a real (wrong) filter value. Always use this
 * instead of constructing URLSearchParams directly from an object that
 * might contain optional fields.
 */
function buildQueryString(params: Record<string, string | number | undefined | null>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  ) as [string, string | number][];
  if (entries.length === 0) return "";
  const qs = new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
  return `?${qs}`;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : undefined;

  if (!res.ok) {
    throw new ApiError(body?.message || "Something went wrong. Please try again.", res.status, body?.code);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// --- Types matching backend's user.toSafeJSON() ---
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  activeRole: "customer" | "provider" | "admin";
  canBeCustomer: boolean;
  canBeProvider: boolean;
  isAdmin: boolean;
  state?: string;
  city?: string;
  category?: string;
  niche?: string;
  yearsOfExperience?: string;
  providerApprovalStatus: string;
  isVerifiedBadge: boolean;
  hasPayoutAccount?: boolean;
  isActive?: boolean;
  avatar?: string;
  trialBookingsRemaining: number;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
};

export const authApi = {
  register: (payload: Record<string, unknown>) =>
    api.post<{ message: string; user: AuthUser; emailSent: boolean }>("/auth/register", payload),
  verifyEmail: (token: string, email: string) =>
    api.get<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`),
  resendVerification: (email: string) => api.post<{ message: string }>("/auth/resend-verification", { email }),
  login: (email: string, password: string) =>
    api.post<{ message: string; user?: AuthUser; requiresTwoFactor?: boolean; email?: string }>("/auth/login", {
      email,
      password,
    }),
  verifyTwoFactor: (email: string, otp: string) =>
    api.post<{ message: string; user: AuthUser }>("/auth/verify-2fa", { email, otp }),
  toggleTwoFactor: () => api.post<{ message: string; twoFactorEnabled: boolean }>("/auth/toggle-2fa"),
  logout: () => api.post<{ message: string }>("/auth/logout"),
  me: () => api.get<{ user: AuthUser }>("/auth/me"),
  switchRole: (role: "customer" | "provider") =>
    api.post<{ message: string; user: AuthUser }>("/auth/switch-role", { role }),
  forgotPassword: (email: string) => api.post<{ message: string }>("/auth/forgot-password", { email }),
  resetPassword: (token: string, email: string, newPassword: string) =>
    api.post<{ message: string }>("/auth/reset-password", { token, email, newPassword }),
  updateAvatar: (avatar: string) => api.patch<{ message: string; user: AuthUser }>("/auth/avatar", { avatar }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ message: string }>("/auth/change-password", { currentPassword, newPassword }),
  sessions: () => api.get<{ sessions: SessionItem[] }>("/auth/sessions"),
  revokeSession: (id: string) => api.delete<{ message: string }>(`/auth/sessions/${id}`),
};

export type SessionItem = {
  id: string;
  ip: string;
  userAgent: string;
  lastSeenAt: string;
  createdAt: string;
  isCurrent: boolean;
};

export type PlatformStats = {
  totalProviders: number;
  totalCustomers: number;
  totalServices: number;
  completedBookings: number;
  avgRating: number;
  satisfactionRate: number;
  totalCategories: number;
  totalNiches: number;
  totalStates: number;
  providersByCategory: Record<string, number>;
};

export const metaApi = {
  locations: () =>
    api.get<{ nigerianStates: string[]; internationalCountries: string[] }>("/meta/locations"),
  categories: () => api.get<{ categories: Array<{ name: string; slug: string; niches: { name: string; slug: string }[] }> }>("/meta/categories"),
  stats: () => api.get<PlatformStats>("/meta/stats"),
};

// --- Services ---
export type ServiceItem = {
  _id: string;
  provider: string | { _id: string; name: string; avatar?: string; isVerifiedBadge?: boolean; state?: string; city?: string };
  title: string;
  category: string;
  niche: string;
  description: string;
  price: number;
  priceType: "fixed" | "hourly" | "negotiable";
  images: string[];
  isActive: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
};

export const serviceApi = {
  list: (params?: { search?: string; category?: string; niche?: string }) => {
    const qs = buildQueryString(params || {});
    return api.get<{ services: ServiceItem[] }>(`/services${qs}`);
  },
  getOne: (id: string) => api.get<{ service: ServiceItem }>(`/services/${id}`),
  mine: () => api.get<{ services: ServiceItem[] }>("/services/mine"),
  create: (payload: Partial<ServiceItem>) => api.post<{ message: string; service: ServiceItem }>("/services", payload),
  update: (id: string, payload: Partial<ServiceItem>) =>
    api.patch<{ message: string; service: ServiceItem }>(`/services/${id}`, payload),
  remove: (id: string) => api.delete<{ message: string }>(`/services/${id}`),
};

// --- Bookings ---
export type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
export type BookingItem = {
  _id: string;
  service: { _id: string; title: string; category: string; niche: string; price: number; images: string[] };
  customer: { _id: string; name: string; avatar?: string };
  provider: { _id: string; name: string; avatar?: string; isVerifiedBadge?: boolean };
  type: "one_time" | "ongoing";
  status: BookingStatus;
  paymentStatus: "unpaid" | "paid";
  isTrialBooking: boolean;
  price: number;
  notes: string;
  createdAt: string;
};

export const bookingApi = {
  create: (payload: { serviceId: string; type: "one_time" | "ongoing"; notes?: string }) =>
    api.post<{ message: string; booking: BookingItem }>("/bookings", payload),
  mine: (status?: BookingStatus) =>
    api.get<{ bookings: BookingItem[] }>(`/bookings/mine${status ? `?status=${status}` : ""}`),
  updateStatus: (id: string, status: BookingStatus) =>
    api.patch<{ message: string; booking: BookingItem }>(`/bookings/${id}/status`, { status }),
};

// --- Notifications ---
export type NotificationItem = {
  _id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
};

export const notificationApi = {
  mine: () => api.get<{ notifications: NotificationItem[]; unreadCount: number }>("/notifications/mine"),
  markRead: (id: string) => api.patch<{ message: string }>(`/notifications/${id}/read`),
  markAllRead: () => api.patch<{ message: string }>("/notifications/read-all"),
};

// --- Provider verification (video call + portfolio badge) ---
export type VerificationStatus =
  | "submitted"
  | "call_scheduled"
  | "call_completed"
  | "awaiting_payment"
  | "approved"
  | "rejected";

export type VerificationRequestItem = {
  _id: string;
  provider: string | { _id: string; name: string; email: string; avatar?: string; category?: string; niche?: string };
  workImages: string[];
  notes: string;
  preferredSlots: string[];
  scheduledCallAt?: string;
  callMeetingLink?: string;
  callCompletedAt?: string;
  badgeFeePaid: boolean;
  status: VerificationStatus;
  adminNotes: string;
  createdAt: string;
};

// --- Payments ---
export type PaymentPurpose = "provider_slot" | "recommendation_fee" | "booking_payment" | "verification_badge";
export type PaymentGateway = "paystack" | "flutterwave";

export type PaymentItem = {
  _id: string;
  purpose: PaymentPurpose;
  provider: PaymentGateway | "bank_transfer";
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed" | "refunded";
  reference: string;
};

export type Bank = { name: string; code: string };

export const paymentApi = {
  initialize: (payload: { purpose: PaymentPurpose; gateway: PaymentGateway; bookingId?: string; recommendationRequestId?: string }) =>
    api.post<{ message: string; simulated?: boolean; checkoutUrl?: string; reference?: string; payment: PaymentItem }>(
      "/payments/initialize",
      payload,
    ),
  verify: (reference: string) => api.get<{ payment: PaymentItem }>(`/payments/verify/${reference}`),
  earnings: () =>
    api.get<{
      transactions: Array<{ id: string; date: string; customer: string; service: string; amount: number; fee: number; net: number; status: string }>;
      totalEarnings: number;
      totalFees: number;
      monthlyOverview: Array<{ month: string; earnings: number; jobs: number }>;
    }>("/payments/earnings"),
  banks: (gateway: PaymentGateway) => api.get<{ banks: Bank[] }>(`/payments/banks?gateway=${gateway}`),
  addPayoutAccount: (payload: { gateway: PaymentGateway; bankCode: string; bankName: string; accountNumber: string }) =>
    api.post<{ message: string; user: AuthUser }>("/payments/payout-account", payload),
  requestWithdrawal: (payload: { amount: number; note?: string }) =>
    api.post<{ message: string; withdrawal: WithdrawalItem }>("/payments/withdrawals", payload),
  myWithdrawals: () => api.get<{ withdrawals: WithdrawalItem[] }>("/payments/withdrawals/mine"),
  // admin
  listWithdrawals: (status?: string) =>
    api.get<{ withdrawals: WithdrawalItem[] }>(`/payments/withdrawals${status ? `?status=${status}` : ""}`),
  decideWithdrawal: (id: string, decision: "paid" | "reject", reason?: string) =>
    api.patch<{ message: string; withdrawal: WithdrawalItem }>(`/payments/withdrawals/${id}/decide`, { decision, reason }),
};

export type WithdrawalItem = {
  _id: string;
  user: string | { _id: string; name: string; email: string };
  amount: number;
  status: "pending" | "success" | "failed";
  reference: string;
  meta?: { note?: string; adminReason?: string };
  createdAt: string;
};

// --- Chat ---
export type ChatParticipant = { _id: string; name: string; avatar?: string; activeRole?: string; isVerifiedBadge?: boolean };
export type ChatRoomItem = {
  _id: string;
  participants: ChatParticipant[];
  lastMessage: string;
  lastMessageAt?: string;
  unreadCount: number;
  updatedAt: string;
};
export type ChatMessageItem = {
  _id: string;
  chatRoom: string;
  sender: string;
  content: string;
  attachmentUrl: string;
  readBy: string[];
  createdAt: string;
};

// --- Reviews ---
export type ReviewItem = {
  _id: string;
  booking: string;
  service: string | { _id: string; title: string };
  provider: string | { _id: string; name: string };
  customer: { _id: string; name: string; avatar?: string };
  rating: number;
  comment: string;
  providerReply: string;
  createdAt: string;
};

export const reviewApi = {
  featured: () => api.get<{ reviews: ReviewItem[] }>("/reviews/featured"),
  create: (payload: { bookingId: string; rating: number; comment?: string }) =>
    api.post<{ message: string; review: ReviewItem }>("/reviews", payload),
  byService: (serviceId: string) => api.get<{ reviews: ReviewItem[] }>(`/reviews/service/${serviceId}`),
  mine: () => api.get<{ reviews: ReviewItem[]; ratingAvg: number; ratingCount: number }>("/reviews/mine"),
  reply: (id: string, reply: string) => api.patch<{ message: string; review: ReviewItem }>(`/reviews/${id}/reply`, { reply }),
  eligibleBookings: () => api.get<{ bookingIds: string[] }>("/reviews/eligible-bookings"),
  // admin
  adminList: () => api.get<{ reviews: ReviewItem[] }>("/reviews/admin/all"),
  remove: (id: string) => api.delete<{ message: string }>(`/reviews/${id}`),
};

export const chatApi = {
  rooms: () => api.get<{ rooms: ChatRoomItem[] }>("/chat/rooms"),
  getOrCreateRoom: (otherUserId: string) => api.post<{ room: ChatRoomItem }>("/chat/rooms", { otherUserId }),
  messages: (roomId: string) => api.get<{ messages: ChatMessageItem[] }>(`/chat/rooms/${roomId}/messages`),
  sendMessage: (roomId: string, payload: { content?: string; attachmentUrl?: string }) =>
    api.post<{ message: string; data: ChatMessageItem }>(`/chat/rooms/${roomId}/messages`, payload),
};

export const verificationApi = {
  submit: (payload: { workImages: string[]; notes?: string; preferredSlots?: string[] }) =>
    api.post<{ message: string; request: VerificationRequestItem }>("/verification/requests", payload),
  mine: () => api.get<{ request: VerificationRequestItem | null }>("/verification/requests/me"),
  payBadgeFee: (id: string) =>
    api.post<{ message: string; request: VerificationRequestItem }>(`/verification/requests/${id}/pay-badge-fee`),
  // admin
  list: (status?: VerificationStatus) =>
    api.get<{ requests: VerificationRequestItem[] }>(`/verification/requests${status ? `?status=${status}` : ""}`),
  scheduleCall: (id: string, scheduledCallAt: string, callMeetingLink?: string) =>
    api.patch<{ message: string; request: VerificationRequestItem }>(`/verification/requests/${id}/schedule-call`, {
      scheduledCallAt,
      callMeetingLink,
    }),
  completeCall: (id: string) =>
    api.patch<{ message: string; request: VerificationRequestItem }>(`/verification/requests/${id}/complete-call`),
  decide: (id: string, decision: "approve" | "reject", adminNotes?: string, requireBadgeFee?: boolean) =>
    api.patch<{ message: string; request: VerificationRequestItem }>(`/verification/requests/${id}/decide`, {
      decision,
      adminNotes,
      requireBadgeFee,
    }),
};

// --- Admin ---
export type LoginAttemptItem = {
  _id: string;
  email: string;
  user?: { _id: string; name: string; email: string };
  success: boolean;
  reason: string;
  ip: string;
  userAgent: string;
  createdAt: string;
};

export const adminApi = {
  providerApplications: (status = "pending") =>
    api.get<{ applications: AuthUser[] }>(`/admin/provider-applications?status=${status}`),
  decideProviderApplication: (id: string, decision: "approve" | "reject", reason?: string) =>
    api.patch<{ message: string; applicant: AuthUser }>(`/admin/provider-applications/${id}/decide`, { decision, reason }),
  users: (params?: { role?: string; search?: string }) => {
    const qs = buildQueryString(params || {});
    return api.get<{ users: AuthUser[] }>(`/admin/users${qs}`);
  },
  updateUserStatus: (id: string, isActive: boolean) =>
    api.patch<{ message: string; user: AuthUser }>(`/admin/users/${id}/status`, { isActive }),
  loginActivity: () =>
    api.get<{ attempts: LoginAttemptItem[]; suspiciousIps: { ip: string; failedAttempts: number }[] }>("/admin/login-activity"),
  dashboardSummary: () =>
    api.get<{
      totalUsers: number;
      totalCustomers: number;
      totalProviders: number;
      totalAdmins: number;
      totalRevenue: number;
      pendingApprovalsCount: number;
      activeBookingsCount: number;
      recentActivity: { text: string; date: string; link: string }[];
      topCategories: { name: string; bookings: number; revenue: number }[];
    }>("/admin/dashboard-summary"),
  payments: () =>
    api.get<{
      payments: Array<{ _id: string; user?: { name: string; email: string }; purpose: string; provider: string; amount: number; status: string; reference: string; createdAt: string }>;
      summary: { totalRevenue: number; totalPayouts: number; pendingPayouts: number; totalFees: number };
    }>("/admin/payments"),
  bookings: (status?: string) =>
    api.get<{
      bookings: Array<{ _id: string; customer?: { name: string }; provider?: { name: string }; service?: { title: string }; price: number; status: string; createdAt: string }>;
    }>(`/admin/bookings${status ? `?status=${status}` : ""}`),
  sendBroadcast: (payload: { title: string; message: string; target: "all" | "customers" | "providers"; link?: string }) =>
    api.post<{ message: string; broadcast: unknown }>("/admin/notifications/broadcast", payload),
  broadcastHistory: () =>
    api.get<{ broadcasts: Array<{ _id: string; title: string; message: string; target: string; recipientCount: number; sentBy?: { name: string }; createdAt: string }> }>(
      "/admin/notifications/history"
    ),
};

// --- Feedback ---
export type FeedbackItem = {
  _id: string;
  user: string | { _id: string; name: string; email: string; avatar?: string };
  subject: string;
  message: string;
  status: "open" | "replied" | "closed";
  adminReply: string;
  createdAt: string;
};

export const feedbackApi = {
  create: (payload: { subject: string; message: string }) =>
    api.post<{ message: string; feedback: FeedbackItem }>("/feedback", payload),
  mine: () => api.get<{ feedback: FeedbackItem[] }>("/feedback/mine"),
  list: (status?: string) => api.get<{ feedback: FeedbackItem[] }>(`/feedback${status ? `?status=${status}` : ""}`),
  reply: (id: string, reply: string) => api.patch<{ message: string; feedback: FeedbackItem }>(`/feedback/${id}/reply`, { reply }),
  close: (id: string) => api.patch<{ message: string; feedback: FeedbackItem }>(`/feedback/${id}/close`),
};

// --- Blog / Posts ---
export type PostComment = { _id: string; author: { _id: string; name: string; avatar?: string }; content: string; createdAt: string };
export type PostItem = {
  _id: string;
  author: { _id: string; name: string; avatar?: string; email?: string };
  title: string;
  content: string;
  coverImage: string;
  status: "pending" | "approved" | "rejected";
  likes: string[];
  comments: PostComment[];
  createdAt: string;
};

export const postApi = {
  list: () => api.get<{ posts: PostItem[] }>("/posts"),
  mine: () => api.get<{ posts: PostItem[] }>("/posts/mine"),
  getOne: (id: string) => api.get<{ post: PostItem }>(`/posts/${id}`),
  create: (payload: { title: string; content: string; coverImage?: string }) =>
    api.post<{ message: string; post: PostItem }>("/posts", payload),
  toggleLike: (id: string) => api.post<{ liked: boolean; likeCount: number }>(`/posts/${id}/like`),
  comment: (id: string, content: string) => api.post<{ message: string; comments: PostComment[] }>(`/posts/${id}/comments`, { content }),
  remove: (id: string) => api.delete<{ message: string }>(`/posts/${id}`),
  // admin
  adminList: (status?: string) => api.get<{ posts: PostItem[] }>(`/posts/admin/all${status ? `?status=${status}` : ""}`),
  moderate: (id: string, decision: "approve" | "reject") =>
    api.patch<{ message: string; post: PostItem }>(`/posts/${id}/moderate`, { decision }),
};

// --- Recommendations ---
export type MatchedProvider = {
  provider: {
    _id: string;
    name: string;
    avatar?: string;
    category?: string;
    niche?: string;
    state?: string;
    city?: string;
    isVerifiedBadge?: boolean;
    ratingAvg?: number;
    ratingCount?: number;
  };
  score: number;
};

export type RecommendationRequestItem = {
  _id: string;
  category: string;
  niche: string;
  state: string;
  budget?: number;
  notes: string;
  status: "pending_payment" | "matched";
  matchedProviders: MatchedProvider[];
  createdAt: string;
};

export const recommendationApi = {
  create: (payload: { category: string; niche: string; state?: string; budget?: number; notes?: string }) =>
    api.post<{ message: string; request: RecommendationRequestItem }>("/recommendations", payload),
  mine: () => api.get<{ requests: RecommendationRequestItem[] }>("/recommendations/mine"),
  getOne: (id: string) => api.get<{ request: RecommendationRequestItem }>(`/recommendations/${id}`),
};

// --- Subscriptions / Founding Member program ---
export type FoundingStatus = {
  claimed: number;
  totalSlots: number;
  remaining: number;
  firstTierRemaining: number;
  firstTierLimit: number;
  secondTierLimit: number;
};

export type SubscriptionStatus = "founding_free" | "active" | "expired" | "none";
export type MySubscription = {
  _id: string;
  plan?: { _id: string; name: string; tier: string };
  interval: "monthly" | "yearly";
  currency: "NGN" | "USD";
  status: SubscriptionStatus;
  isFoundingMember: boolean;
  foundingMemberNumber?: number;
  freeUntil?: string;
  currentPeriodEnd?: string;
} | null;

export const subscriptionApi = {
  foundingStatus: () => api.get<FoundingStatus>("/subscriptions/founding-status"),
  plans: (state?: string) => api.get<{ currency: string; plans: Array<{ id: string; name: string; tier: string; features: string[]; priceMonthly: number; priceYearly: number }> }>(`/subscriptions/plans${state ? `?state=${encodeURIComponent(state)}` : ""}`),
  mine: () => api.get<{ subscription: MySubscription }>("/subscriptions/mine"),
  subscribe: (payload: { planId: string; interval: "monthly" | "yearly"; gateway: "paystack" | "flutterwave" }) =>
    api.post<{ message: string; subscription: unknown }>("/subscriptions/subscribe", payload),
};
