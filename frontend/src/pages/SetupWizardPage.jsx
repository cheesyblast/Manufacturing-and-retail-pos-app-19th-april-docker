import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Database, ArrowRight, Check, Warning, Spinner, User, ShieldCheck, Copy } from "@phosphor-icons/react";

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const steps = [
  { id: 1, label: "Database" },
  { id: 2, label: "Configure" },
  { id: 3, label: "Admin Account" },
  { id: 4, label: "Complete" },
];

export default function SetupWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [manualSql, setManualSql] = useState("");
  const [copied, setCopied] = useState(false);

  const [config, setConfig] = useState({
    business_name: "",
    supabase_url: "",
    supabase_key: "",
    service_role_key: "",
    db_password: "",
  });

  const [admin, setAdmin] = useState({
    name: "Administrator",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleConfigure = async () => {
    setError("");
    if (!config.business_name || !config.supabase_url || !config.supabase_key) {
      setError("Business Name, Supabase URL, and Anon Key are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/setup/initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setStep(3);
      } else if (data.step === "exec_sql" && data.sql) {
        setManualSql(data.sql);
        setError(data.message);
      } else {
        setError(data.message || data.detail || "Configuration failed.");
      }
    } catch (err) {
      setError("Connection failed. Check your network and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyExecSql = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/setup/verify-exec-sql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supabase_url: config.supabase_url, supabase_key: config.supabase_key }),
      });
      const data = await res.json();
      if (data.verified) {
        setManualSql("");
        handleConfigure();
      } else {
        setError("Function not found yet. Please run the SQL and try again.");
      }
    } catch {
      setError("Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    setError("");
    if (!admin.email || !admin.password) {
      setError("Email and password are required.");
      return;
    }
    if (admin.password !== admin.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (admin.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/setup/create-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: admin.name, email: admin.email, password: admin.password }),
      });
      const data = await res.json();
      if (data.id) {
        setStep(4);
      } else {
        setError(data.detail || "Failed to create admin account.");
      }
    } catch (err) {
      setError("Failed to create admin. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center p-6">
      <div className="max-w-xl w-full space-y-6" data-testid="setup-wizard">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step > s.id ? "bg-[#131D33] text-white" :
                step === s.id ? "bg-[#131D33] text-white ring-4 ring-[#131D33]/20" :
                "bg-[#E8E0D4] text-[#8B7B6B]"
              }`}>
                {step > s.id ? <Check size={14} weight="bold" /> : s.id}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-1 ${step > s.id ? "bg-[#131D33]" : "bg-[#E8E0D4]"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="bg-white border border-[#E8E0D4] rounded-2xl p-8 shadow-[0_4px_20px_rgba(19,29,51,0.04)]" data-testid="setup-step-1">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-[#131D33] flex items-center justify-center mx-auto mb-4">
                <Database size={28} className="text-white" />
              </div>
              <h1 className="text-2xl font-medium text-[#131D33] tracking-tight">Welcome to Your ERP</h1>
              <p className="text-[#8B7B6B] mt-2">Let's set up your manufacturing and retail management system.</p>
            </div>
            <div className="space-y-4 text-sm text-[#5A5249]">
              <p>Before we begin, make sure you have:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <Check size={16} className="text-[#131D33] mt-0.5 flex-shrink-0" />
                  <span>A <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-[#131D33] underline font-medium">Supabase</a> account with a project created</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={16} className="text-[#131D33] mt-0.5 flex-shrink-0" />
                  <span>Your project's API URL and keys (found in Project Settings → API)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={16} className="text-[#131D33] mt-0.5 flex-shrink-0" />
                  <span>Your database password (found in Project Settings → Database)</span>
                </li>
              </ul>
            </div>
            <Button
              data-testid="setup-start-button"
              onClick={() => setStep(2)}
              className="w-full mt-8 h-12 bg-[#131D33] text-white hover:bg-[#1a2744] rounded-xl text-base font-medium"
            >
              Get Started <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        )}

        {/* Step 2: Configuration */}
        {step === 2 && (
          <div className="bg-white border border-[#E8E0D4] rounded-2xl p-8 shadow-[0_4px_20px_rgba(19,29,51,0.04)]" data-testid="setup-step-2">
            <h2 className="text-xl font-medium text-[#131D33] mb-1">Configure Your Instance</h2>
            <p className="text-[#8B7B6B] text-sm mb-6">Connect to your Supabase database and name your business.</p>

            {error && !manualSql && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4 flex items-start gap-2">
                <Warning size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {manualSql && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-amber-800 font-medium mb-2">Manual Step Required</p>
                <p className="text-xs text-amber-700 mb-3">{error}</p>
                <div className="relative">
                  <pre className="bg-[#131D33] text-[#E8E0D4] p-3 rounded-lg text-xs overflow-auto font-mono">{manualSql}</pre>
                  <button
                    onClick={() => { navigator.clipboard.writeText(manualSql); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className="absolute top-2 right-2 text-xs bg-white/10 text-white px-2 py-1 rounded"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <Button onClick={handleVerifyExecSql} disabled={loading} className="mt-3 bg-amber-600 text-white hover:bg-amber-700 rounded-xl text-sm">
                  {loading ? "Verifying..." : "I've Run It — Verify & Continue"}
                </Button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.15em] font-bold text-[#8B7B6B] mb-1 block">Business Name</label>
                <Input data-testid="setup-business-name" value={config.business_name} onChange={(e) => setConfig({...config, business_name: e.target.value})} placeholder="My Textile Co." className="bg-white border-[#E8E0D4] rounded-xl" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.15em] font-bold text-[#8B7B6B] mb-1 block">Supabase Project URL</label>
                <Input data-testid="setup-supabase-url" value={config.supabase_url} onChange={(e) => setConfig({...config, supabase_url: e.target.value})} placeholder="https://xxxxx.supabase.co" className="bg-white border-[#E8E0D4] rounded-xl" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.15em] font-bold text-[#8B7B6B] mb-1 block">Anon / Public Key</label>
                <Input data-testid="setup-anon-key" value={config.supabase_key} onChange={(e) => setConfig({...config, supabase_key: e.target.value})} placeholder="sb_publishable_..." className="bg-white border-[#E8E0D4] rounded-xl font-mono text-xs" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.15em] font-bold text-[#8B7B6B] mb-1 block">Service Role Key <span className="text-[#A89279] font-normal normal-case">(for auto-setup)</span></label>
                <Input data-testid="setup-service-key" value={config.service_role_key} onChange={(e) => setConfig({...config, service_role_key: e.target.value})} placeholder="sb_secret_..." type="password" className="bg-white border-[#E8E0D4] rounded-xl font-mono text-xs" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.15em] font-bold text-[#8B7B6B] mb-1 block">Database Password <span className="text-[#A89279] font-normal normal-case">(for auto-migration)</span></label>
                <Input data-testid="setup-db-password" value={config.db_password} onChange={(e) => setConfig({...config, db_password: e.target.value})} placeholder="Your Supabase DB password" type="password" className="bg-white border-[#E8E0D4] rounded-xl" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={() => setStep(1)} className="bg-[#E8E0D4] text-[#131D33] hover:bg-[#DDD4C5] rounded-xl">Back</Button>
              <Button
                data-testid="setup-configure-button"
                onClick={handleConfigure}
                disabled={loading}
                className="flex-1 h-12 bg-[#131D33] text-white hover:bg-[#1a2744] rounded-xl text-base font-medium"
              >
                {loading ? "Configuring..." : "Configure & Build Database"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Create Admin */}
        {step === 3 && (
          <div className="bg-white border border-[#E8E0D4] rounded-2xl p-8 shadow-[0_4px_20px_rgba(19,29,51,0.04)]" data-testid="setup-step-3">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Check size={24} className="text-green-600" weight="bold" />
              </div>
              <h2 className="text-xl font-medium text-[#131D33]">Database Ready</h2>
              <p className="text-[#8B7B6B] text-sm">Now create your master administrator account.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.15em] font-bold text-[#8B7B6B] mb-1 block">Full Name</label>
                <Input data-testid="setup-admin-name" value={admin.name} onChange={(e) => setAdmin({...admin, name: e.target.value})} placeholder="Your Name" className="bg-white border-[#E8E0D4] rounded-xl" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.15em] font-bold text-[#8B7B6B] mb-1 block">Admin Email</label>
                <Input data-testid="setup-admin-email" type="email" value={admin.email} onChange={(e) => setAdmin({...admin, email: e.target.value})} placeholder="admin@yourcompany.com" className="bg-white border-[#E8E0D4] rounded-xl" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.15em] font-bold text-[#8B7B6B] mb-1 block">Password</label>
                <Input data-testid="setup-admin-password" type="password" value={admin.password} onChange={(e) => setAdmin({...admin, password: e.target.value})} placeholder="Minimum 6 characters" className="bg-white border-[#E8E0D4] rounded-xl" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.15em] font-bold text-[#8B7B6B] mb-1 block">Confirm Password</label>
                <Input data-testid="setup-admin-confirm" type="password" value={admin.confirmPassword} onChange={(e) => setAdmin({...admin, confirmPassword: e.target.value})} placeholder="Re-enter password" className="bg-white border-[#E8E0D4] rounded-xl" />
              </div>
            </div>

            <Button
              data-testid="setup-create-admin-button"
              onClick={handleCreateAdmin}
              disabled={loading}
              className="w-full mt-6 h-12 bg-[#131D33] text-white hover:bg-[#1a2744] rounded-xl text-base font-medium"
            >
              {loading ? "Creating..." : "Create Admin & Launch"}
            </Button>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 4 && (
          <div className="bg-white border border-[#E8E0D4] rounded-2xl p-8 shadow-[0_4px_20px_rgba(19,29,51,0.04)] text-center" data-testid="setup-step-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} className="text-green-600" weight="fill" />
            </div>
            <h2 className="text-2xl font-medium text-[#131D33] mb-2">Setup Complete</h2>
            <p className="text-[#8B7B6B] mb-6">
              <strong>{config.business_name}</strong> is ready to use. You can now sign in with your admin credentials.
            </p>
            <Button
              data-testid="setup-go-to-login"
              onClick={() => navigate("/login")}
              className="h-12 px-8 bg-[#131D33] text-white hover:bg-[#1a2744] rounded-xl text-base font-medium"
            >
              Go to Login <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-[#A89279]">
          Secure setup wizard — credentials are stored locally on your server
        </p>
      </div>
    </div>
  );
}
