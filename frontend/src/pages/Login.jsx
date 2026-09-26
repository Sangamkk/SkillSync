import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login as loginApi } from "../services/authService";
import MeshBackground from "../components/common/MeshBackground";

const ROLES = ["STUDENT", "ORGANISATION"];

const roleConfig = {
  STUDENT: {
    label: "Student",
    icon: "🎓",
    color: "from-violet-500 to-purple-600",
    desc: "Access your portfolio, certificates & job opportunities",
    redirectTo: "/student/dashboard",
  },
  ORGANISATION: {
    label: "Organisation",
    icon: "🏢",
    color: "from-blue-500 to-cyan-500",
    desc: "Manage verifications, issue certificates & recruit talent",
    redirectTo: "/organisation",
  },
  ADMIN: {
    label: "Admin",
    icon: "🛡️",
    color: "from-orange-500 to-red-500",
    desc: "System administration",
    redirectTo: "/admin",
  },
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [selectedRole, setSelectedRole] = useState("STUDENT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [darkMode] = useState(() => localStorage.getItem("skillsync-theme") !== "light");

  const cfg = roleConfig[selectedRole];
  const from = location.state?.from?.pathname || cfg.redirectTo;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await loginApi({ email, password, role: selectedRole });
      const { token, user } = data;
      if (!token) throw new Error("No token received from server.");
      login(token, user);
      navigate(roleConfig[user.role]?.redirectTo || from, { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Login failed. Check your credentials and try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const base = darkMode
    ? "bg-gray-950 text-white"
    : "bg-slate-50 text-gray-900";

  return (
    <div className={`relative min-h-screen flex items-center justify-center px-4 ${base}`}>
      <MeshBackground darkMode={darkMode} />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              S
            </div>
            <span className={`text-2xl font-bold tracking-tight ${darkMode ? "text-white" : "text-gray-900"}`}>
              SkillSync
            </span>
          </div>
          <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Blockchain-verified credentials platform
          </p>
        </div>

        {/* Card */}
        <div className={`rounded-2xl border backdrop-blur-xl p-8 shadow-2xl ${
          darkMode
            ? "border-white/10 bg-white/[0.04]"
            : "border-slate-200 bg-white/90"
        }`}>
          <h1 className={`text-xl font-semibold mb-1 ${darkMode ? "text-white" : "text-gray-900"}`}>
            Welcome back
          </h1>
          <p className={`text-sm mb-6 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Sign in to your SkillSync account
          </p>

          {/* Role selector */}
          <div className={`flex gap-2 mb-6 p-1 rounded-xl ${darkMode ? "bg-white/5" : "bg-slate-100"}`}>
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { setSelectedRole(r); setError(""); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  selectedRole === r
                    ? `bg-gradient-to-r ${roleConfig[r].color} text-white shadow-lg`
                    : darkMode
                      ? "text-gray-400 hover:text-white"
                      : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <span>{roleConfig[r].icon}</span>
                {roleConfig[r].label}
              </button>
            ))}
          </div>

          {/* Role description */}
          <p className={`text-xs mb-5 px-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
            {cfg.desc}
          </p>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-violet-500/40 ${
                  darkMode
                    ? "bg-white/5 border-white/10 text-white placeholder-gray-600"
                    : "bg-white border-slate-200 text-gray-900 placeholder-gray-400"
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className={`w-full px-4 py-2.5 pr-11 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-violet-500/40 ${
                    darkMode
                      ? "bg-white/5 border-white/10 text-white placeholder-gray-600"
                      : "bg-white border-slate-200 text-gray-900 placeholder-gray-400"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
                    darkMode ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 px-4 rounded-xl font-medium text-sm text-white transition-all bg-gradient-to-r ${cfg.color} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                `Sign in as ${cfg.label}`
              )}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-6 flex flex-col gap-2 text-center">
            <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
              Don't have a student account?{" "}
              <Link to="/register" className="text-violet-400 hover:text-violet-300 font-medium">
                Register here
              </Link>
            </p>
            <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
              Representing an organisation?{" "}
              <Link to="/org/register" className="text-blue-400 hover:text-blue-300 font-medium">
                Apply to join
              </Link>
            </p>
          </div>
        </div>

        {/* Admin login note */}
        <p className="text-center text-xs text-gray-600 mt-4">
          Admin?{" "}
          <button
            type="button"
            onClick={() => setSelectedRole("ADMIN")}
            className="text-orange-400 hover:text-orange-300 underline underline-offset-2"
          >
            Switch to admin mode
          </button>
          {selectedRole === "ADMIN" && (
            <span className="ml-2 text-orange-400">↑ Use the form above</span>
          )}
        </p>
      </div>
    </div>
  );
};

export default Login;