// frontend/src/pages/LoginPage.tsx
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login, getCurrentUser } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";
import {
  Building2,
  HardHat,
  Shield,
  CheckCircle,
  Lock,
  Mail,
  ArrowRight,
  Briefcase,
  Users,
  Factory,
  Wrench,
  Eye,
  EyeOff,
} from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const { reload } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const { access, refresh } = await login({ email, password });
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);

      if (rememberMe) {
        localStorage.setItem("remember_email", email);
      } else {
        localStorage.removeItem("remember_email");
      }

      const user = await getCurrentUser();
      await reload(); // sync the shared context so layouts don't refetch on first navigation

      if (user.must_change_password) {
        navigate("/change-password", { state: { forced: true } });
      } else if (user.is_superuser) {
        navigate("/super-admin/dashboard");
      } else if (user.role === "site_engineer") {
        navigate("/company/dashboard/site-engineer");
      } else if (user.role === "qs") {
        navigate("/company/dashboard/qs");
      } else {
        navigate("/company/dashboard");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Invalid email or password. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const features = [
    { icon: Briefcase, label: "Project Management" },
    { icon: Users, label: "Team Collaboration" },
    { icon: Factory, label: "Resource Planning" },
    { icon: Wrench, label: "Construction Tools" },
  ];

  return (
    <div className="min-h-screen flex bg-steel-50">
      {/* Left Side - Dashboard Preview */}
      <div className="hidden lg:flex flex-1 bg-steel-900 p-12 items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-40">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(251, 146, 60, 0.08) 0%, transparent 50%)`,
            }}
          />
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-orange-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-8 border border-white/10">
            <Shield size={16} className="text-orange-400" />
            <span className="text-sm font-medium text-white/90">
              Enterprise Construction Management
            </span>
          </div>

          {/* Preview Image */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-2 shadow-2xl">
            <div className="relative rounded-xl overflow-hidden bg-white/5">
              <img
                src="/image/dashboard-preview.png"
                alt="ARIGram Dashboard Preview"
                className="w-full h-auto object-cover"
                onError={(e) => {
                  // Fallback if image doesn't exist
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-linear-to-t from-steel-900/50 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/5 hover:bg-white/10 transition-all duration-200 cursor-default"
              >
                <div className="h-8 w-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                  <feature.icon size={16} className="text-orange-400" />
                </div>
                <span className="text-sm text-white/80">{feature.label}</span>
              </div>
            ))}
          </div>

          {/* Trust Indicators */}
          <div className="flex items-center justify-center gap-6 mt-8">
            <div className="flex items-center gap-2 text-white/60 hover:text-white/80 transition-colors">
              <CheckCircle size={16} className="text-orange-400" />
              <span className="text-sm">Secure Login</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2 text-white/60 hover:text-white/80 transition-colors">
              <HardHat size={16} className="text-orange-400" />
              <span className="text-sm">Construction Ready</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2 text-white/60 hover:text-white/80 transition-colors">
              <Shield size={16} className="text-orange-400" />
              <span className="text-sm">Enterprise Grade</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 lg:px-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-10">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-orange-500/20">
                <Building2 size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-steel-900 tracking-tight">
                  ARIGram
                </h1>
                <p className="text-sm text-steel-500">
                  Construction Management Platform
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-steel-900 tracking-tight">
                Welcome back
              </h2>
              <p className="mt-2 text-steel-500">
                Sign in to manage your construction projects
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-red-600 text-xs font-bold">!</span>
                </div>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-steel-700 flex items-center gap-2">
                <Mail size={16} className="text-steel-400" />
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-steel-300 bg-white px-4 py-3 text-steel-900 placeholder-steel-400 outline-none transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="you@company.com"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-steel-700 flex items-center gap-2">
                  <Lock size={16} className="text-steel-400" />
                  Password
                </label>
                <button
                  type="button"
                  className="text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-steel-300 bg-white px-4 py-3 pr-12 text-steel-900 placeholder-steel-400 outline-none transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-steel-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-steel-300 text-orange-500 focus:ring-orange-500/20 focus:ring-offset-0"
                />
                Remember me
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-steel-400">
              Secure • Enterprise Grade • Construction ERP
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
