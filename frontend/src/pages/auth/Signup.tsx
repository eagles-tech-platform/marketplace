import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, ArrowRight, ArrowLeft, Check, User, HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { jobCategories } from "@/data/categories";
import { nigerianStates, internationalCountries } from "@/data/locations";
import { authApi, ApiError } from "@/lib/api";

type Role = "customer" | "provider" | null;
type Step = 1 | 2 | 3 | 4 | 5;

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [role, setRole] = useState<Role>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("");
  const [experience, setExperience] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(true);
  const [registered, setRegistered] = useState(false);

  const currentCategory = jobCategories.find((c) => c.name === selectedCategory);

  const handleNext = async () => {
    // Registration happens once, right after payment step, before showing the success screen.
    if (step === 4) {
      setSubmitError(null);
      setLoading(true);
      try {
        const res = await authApi.register({
          name: fullName,
          email,
          phoneNumber: phone,
          password,
          role,
          state,
          city,
          category: role === "provider" ? selectedCategory : undefined,
          niche: role === "provider" ? selectedNiche : undefined,
          yearsOfExperience: role === "provider" ? experience : undefined,
          // NOTE: payment isn't actually processed yet — see WORK_IN_PROGRESS.md.
          // paymentMethod is captured here so it's ready to send to the payment
          // gateway once that integration is wired in.
          intendedPaymentMethod: paymentMethod,
        });
        setEmailSent(res.emailSent);
        setRegistered(true);
        setStep(5);
      } catch (err) {
        setSubmitError(err instanceof ApiError ? err.message : "Could not create your account. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }
    if (step < 5) setStep((s) => (s + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const handleSubmit = () => {
    // Account already exists at this point — just send them to sign in,
    // since they must verify their email before their first login.
    navigate("/login");
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!role;
      case 2: return fullName && email && phone && password && confirmPassword && password === confirmPassword && password.length >= 8;
      case 3: return state && city && (role === "provider" ? selectedCategory && selectedNiche && experience : true);
      case 4: return !!paymentMethod;
      default: return true;
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-2/5 relative bg-gradient-to-br from-teal-500 via-teal-600 to-orange-500">
        <div className="absolute inset-0 bg-[url('/hero-main.jpg')] bg-cover bg-center opacity-15" />
        <div className="relative flex flex-col justify-center p-12 text-white">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <span className="text-white font-sans font-bold text-xl">Qm</span>
            </div>
            <span className="text-2xl font-bold">MarketPlace</span>
          </Link>
          <h2 className="text-3xl font-bold mb-4">
            {step === 1 && "Choose Your Path"}
            {step === 2 && "Create Your Account"}
            {step === 3 && "Tell Us More"}
            {step === 4 && "Complete Payment"}
            {step === 5 && "You're All Set!"}
          </h2>
          <p className="text-white/80">
            {step === 1 && "Select whether you want to hire services or offer your skills."}
            {step === 2 && "Fill in your details to create your MarketPlace account."}
            {step === 3 && "Help us personalize your experience on the platform."}
            {step === 4 && role === "customer" && "Pay the verification fee to access all services."}
            {step === 4 && role === "provider" && "Purchase your provider slot to start offering services."}
            {step === 5 && "Welcome to the MarketPlace community!"}
          </p>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mt-12">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${s === step ? "w-8 bg-white" : s < step ? "w-4 bg-white/60" : "w-4 bg-white/30"
                  }`}
              />
            ))}
          </div>
          <p className="text-white/60 text-sm mt-3">Step {step} of 5</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-orange-500 flex items-center justify-center">
                <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-lg" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-light  text-slate-600">QUANTUM</span>
                <span className="text-2xl font-bold text-slate-800">MarketPlace</span>
              </div>
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
            {/* Mobile step indicator */}
            <div className="lg:hidden flex items-center justify-between mb-6">
              <span className="text-sm text-slate-500">Step {step} of 5</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div key={s} className={`w-6 h-1.5 rounded-full ${s <= step ? "bg-teal-500" : "bg-slate-200"}`} />
                ))}
              </div>
            </div>

            {/* Step 1: Role Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">How do you want to use MarketPlace?</h2>
                <p className="text-slate-500 text-sm mb-6">Select one option. You can always switch later.</p>

                <button
                  onClick={() => setRole("customer")}
                  className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 ${role === "customer"
                      ? "border-teal-500 bg-teal-50 shadow-md"
                      : "border-slate-200 hover:border-teal-300 hover:bg-slate-50"
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${role === "customer" ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-500"
                      }`}>
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">I want to hire services</h3>
                      <p className="text-sm text-slate-500 mt-1">Browse and book verified service providers for any job you need done.</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setRole("provider")}
                  className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 ${role === "provider"
                      ? "border-orange-500 bg-orange-50 shadow-md"
                      : "border-slate-200 hover:border-orange-300 hover:bg-slate-50"
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${role === "provider" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"
                      }`}>
                      <HardHat className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">I want to offer services</h3>
                      <p className="text-sm text-slate-500 mt-1">Showcase your skills and get hired by customers looking for your expertise.</p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Step 2: Account Info */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Create Your Account</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className="h-11 rounded-xl" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" className="h-11 rounded-xl" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" className="h-11 rounded-xl" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" className="h-11 rounded-xl pr-10" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {password && password.length < 8 && <p className="text-xs text-red-500 mt-1">Password must be at least 8 characters</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                    <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" className="h-11 rounded-xl" required />
                    {confirmPassword && password !== confirmPassword && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Profile Info */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Tell Us More</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">State / Location</label>
                      <select value={state} onChange={(e) => setState(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none bg-white">
                        <option value="">Select</option>
                        <optgroup label="Nigeria">
                          {nigerianStates.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </optgroup>
                        <optgroup label="International">
                          {internationalCountries.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
                      <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="h-11 rounded-xl" />
                    </div>
                  </div>

                  {role === "provider" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Job Category</label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => { setSelectedCategory(e.target.value); setSelectedNiche(""); }}
                          className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none"
                        >
                          <option value="">Select a category</option>
                          {jobCategories.map((cat) => (
                            <option key={cat.slug} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      {currentCategory && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Job Niche ({currentCategory.niches.length} options)</label>
                          <select
                            value={selectedNiche}
                            onChange={(e) => setSelectedNiche(e.target.value)}
                            className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none"
                          >
                            <option value="">Select your niche</option>
                            {currentCategory.niches.map((niche) => (
                              <option key={niche.slug} value={niche.name}>{niche.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Years of Experience</label>
                        <select value={experience} onChange={(e) => setExperience(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none">
                          <option value="">Select</option>
                          {["Less than 1 year", "1-2 years", "3-5 years", "5-10 years", "10+ years"].map((e) => (
                            <option key={e} value={e}>{e}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Payment */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  {role === "customer" ? "Pay Verification Fee" : "Purchase Provider Slot"}
                </h2>
                <p className="text-slate-500 text-sm mb-6">
                  {role === "customer"
                    ? "Pay a one-time verification fee to access all services on the platform."
                    : "Purchase your provider slot to start offering services to customers."}
                </p>

                <div className="bg-gradient-to-br from-teal-50 to-orange-50 rounded-2xl p-6 text-center mb-6">
                  <p className="text-sm text-slate-500 mb-1">Amount to pay</p>
                  <p className="text-4xl font-bold text-slate-800">
                    {role === "customer" ? "N1,000" : "N5,000"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {role === "customer" ? "One-time verification fee" : "One-time slot purchase fee"}
                  </p>
                </div>

                <p className="text-sm font-medium text-slate-700 mb-3">Select payment method:</p>
                <div className="space-y-3">
                  {[
                    { id: "paystack", name: "Pay with Paystack", desc: "Card, Bank, USSD, QR" },
                    { id: "flutterwave", name: "Pay with Flutterwave", desc: "Card, Bank Transfer, Mobile Money" },
                    { id: "bank", name: "Bank Transfer", desc: "Manual transfer with receipt upload" },
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${paymentMethod === method.id
                          ? "border-teal-500 bg-teal-50"
                          : "border-slate-200 hover:border-slate-300"
                        }`}
                    >
                      <p className="font-medium text-slate-800">{method.name}</p>
                      <p className="text-xs text-slate-500">{method.desc}</p>
                    </button>
                  ))}
                </div>
                {submitError && <p className="text-sm text-red-600 mt-2">{submitError}</p>}
                <p className="text-xs text-slate-400 mt-2">
                  Payment processing isn't live yet — your account will be created now and the
                  payment step will be enabled once the gateway integration is finished.
                </p>
              </div>
            )}

            {/* Step 5: Success */}
            {step === 5 && (
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-3">
                  {registered ? "Check Your Email" : "Almost There"}
                </h2>
                <p className="text-slate-500 mb-8">
                  {registered && emailSent
                    ? `We've sent a verification link to ${email}. Verify your email to log in${role === "provider" ? " — your provider application will then be reviewed by our admin team" : ""}.`
                    : registered && !emailSent
                      ? "Your account was created, but we couldn't send the verification email. Use the resend option on the login page."
                      : "Something interrupted registration — please go back and try again."}
                </p>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-gradient-to-r from-teal-500 to-orange-500 text-white font-semibold rounded-full px-8 py-6 hover:opacity-90"
                >
                  Go to Login
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Navigation Buttons */}
            {step < 5 && (
              <div className="flex items-center gap-3 mt-8">
                {step > 1 && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="h-12 px-6 rounded-xl border-slate-200"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || loading}
                  className="flex-1 h-12 bg-gradient-to-r from-teal-500 to-orange-500 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Creating account..." : step === 4 ? "Complete Payment" : "Continue"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Login Link */}
            <p className="text-center text-sm text-slate-500 mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-teal-600 font-medium hover:text-teal-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
