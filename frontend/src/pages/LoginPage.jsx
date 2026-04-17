import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    const loadBrand = async () => {
      try {
        const API = process.env.REACT_APP_BACKEND_URL;
        const res = await fetch(`${API}/api/setup/status`);
        const data = await res.json();
        if (data.business_name) {
          setBrandName(data.business_name);
          document.title = data.business_name;
        }
      } catch {}
      try {
        const { data } = await api.get("/settings");
        if (data.business_name) setBrandName(data.business_name);
        if (data.logo_url) setLogoUrl(data.logo_url);
      } catch {}
    };
    loadBrand();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === "cashier") navigate("/pos");
      else if (user.role === "production_staff") navigate("/manufacturing");
      else navigate("/dashboard");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:block relative overflow-hidden bg-navy-900">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900" />
        <div className="relative z-10 flex flex-col justify-end h-full p-12">
          <h1 className="text-4xl sm:text-5xl font-heading font-medium text-white tracking-tight mb-3">
            {brandName || "ERP System"}
          </h1>
          <p className="text-white/70 text-lg max-w-md">
            End-to-end manufacturing, inventory, and retail management.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 bg-beige-100">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-3 mb-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-navy-800 flex items-center justify-center text-white font-heading font-bold text-lg">
                {(brandName || "E")[0]}
              </div>
            )}
            <span className="font-heading text-xl font-medium text-navy-800">{brandName || "ERP"}</span>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-heading font-medium text-navy-900 tracking-tight">
              Welcome back
            </h2>
            <p className="text-navy-500 mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div data-testid="login-error" className="bg-status-danger-bg border border-status-danger/20 text-status-danger px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-navy-700 font-medium text-sm">Email</Label>
              <Input
                data-testid="login-email-input"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="bg-white border-beige-300 rounded-xl px-4 py-3 text-navy-900 focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-navy-700 font-medium text-sm">Password</Label>
                <button type="button" onClick={() => navigate("/forgot-password")} className="text-xs text-navy-500 hover:text-navy-700">
                  Forgot password?
                </button>
              </div>
              <Input
                data-testid="login-password-input"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="bg-white border-beige-300 rounded-xl px-4 py-3 text-navy-900 focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                required
              />
            </div>

            <Button
              data-testid="login-submit-button"
              type="submit"
              disabled={loading}
              className="w-full bg-navy-800 text-white hover:bg-navy-700 rounded-xl px-6 py-3 font-medium h-12 text-base transition-colors"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
