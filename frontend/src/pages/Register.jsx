import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerStudent } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import MeshBackground from "../components/common/MeshBackground";

const STEPS = ["Account", "Academic", "Review"];

const initialForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  usn: "",
  college: "",
  organizationName: "",
};

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [darkMode] = useState(() => localStorage.getItem("skillsync-theme") !== "light");

  const update = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const validateStep = () => {
    setError("");
    if (step === 0) {
      if (!form.name.trim()) return setError("Name is required."), false;
      if (!form.email.trim()) return setError("Email is required."), false;
      if (!/\S+@\S+\.\S+/.test(form.email)) return setError("Enter a valid email."), false;
      if (form.password.length < 8) return setError("Password must be at least 8 characters."), false;
      if (form.password !== form.confirmPassword) return setError("Passwords do not match."), false;
    }
    if (step === 1) {
      if (!form.usn.trim()) return setError("USN is required."), false;
      if (!form.college.trim()) return setError("College name is required."), false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError("");
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const { name, email, password, usn, college, organizationName } = form;
      const data = await registerStudent({ name, email, password, usn, college, organizationName });
      // If backend returns token + user on registration, auto-login
      if (data.token && data.user) {
        login(data.token, data.user);
        navigate("/student/dashboard", { replace: true });
      } else {
        navigate("/login", { state: { registered: true } });
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Registration failed. Please try again.";
      setError(msg);
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  const base = darkMode ? "bg-gray-950 text-white" : "bg-slate-50 text-gray-900";
  const card = darkMode
    ? "border-white/10 bg-white/[0.04]"
    : "border-slate-200 bg-white/90";
  const input = darkMode
    ? "bg-white/5 border-white/10 text-white placeholder-gray-600"
    : "bg-white border-slate-200 text-gray-900 placeholder-gray-400";

  return (
    <div className={`relative min-h-screen flex items-center justify-center px-4 py-10 ${base}`}>
      <MeshBackground darkMode={darkMode} />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">S</div>
            <span className="text-2xl font-bold tracking-tight">SkillSync</span>
          </div>
          <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Create your student account</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all ${
                i < step
                  ? "bg-violet-500 border-violet-500 text-white"
                  : i === step
                    ? "border-violet-500 text-violet-400"
                    : darkMode
                      ? "border-white/15 text-gray-600"
                      : "border-slate-200 text-gray-400"
              }`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-[10px] ${i === step ? "text-violet-400" : darkMode ? "text-gray-600" : "text-gray-400"}`}>{label}</span>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className={`rounded-2xl border backdrop-blur-xl p-8 shadow-2xl ${card}`}>
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Step 0 — Account Info */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className={`text-lg font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>Account Information</h2>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Your full name"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-violet-500/40 transition-all ${input}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-violet-500/40 transition-all ${input}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className={`w-full px-4 py-2.5 pr-11 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-violet-500/40 transition-all ${input}`}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-300">
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Confirm Password</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-violet-500/40 transition-all ${input}`}
                />
              </div>
            </div>
          )}

          {/* Step 1 — Academic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className={`text-lg font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>Academic Details</h2>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>USN / Roll Number</label>
                <input
                  type="text"
                  value={form.usn}
                  onChange={(e) => update("usn", e.target.value)}
                  placeholder="e.g. 1XX21CS001"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-violet-500/40 transition-all ${input}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>College / University Name</label>
                <input
                  type="text"
                  value={form.college}
                  onChange={(e) => update("college", e.target.value)}
                  placeholder="e.g. IIT Bombay"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-violet-500/40 transition-all ${input}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Organisation (optional)</label>
                <input
                  type="text"
                  value={form.organizationName}
                  onChange={(e) => update("organizationName", e.target.value)}
                  placeholder="Current employer / organisation if any"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-violet-500/40 transition-all ${input}`}
                />
              </div>
            </div>
          )}

          {/* Step 2 — Review */}
          {step === 2 && (
            <div>
              <h2 className={`text-lg font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>Review & Submit</h2>
              <div className={`rounded-xl border p-4 space-y-3 text-sm ${darkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                {[
                  ["Name", form.name],
                  ["Email", form.email],
                  ["USN", form.usn],
                  ["College", form.college],
                  form.organizationName && ["Organisation", form.organizationName],
                ].filter(Boolean).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <span className={darkMode ? "text-gray-500" : "text-gray-400"}>{k}</span>
                    <span className={`font-medium truncate ${darkMode ? "text-gray-200" : "text-gray-800"}`}>{v}</span>
                  </div>
                ))}
              </div>
              <p className={`mt-4 text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                Your blockchain identity will be automatically created by the backend after registration. No wallet required.
              </p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  darkMode
                    ? "border-white/10 text-gray-400 hover:text-white hover:border-white/30"
                    : "border-slate-200 text-gray-600 hover:bg-slate-100"
                }`}
              >
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition-all shadow-lg"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account…
                  </span>
                ) : "Create Account"}
              </button>
            )}
          </div>

          <p className={`text-center text-xs mt-4 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
            Already have an account?{" "}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
