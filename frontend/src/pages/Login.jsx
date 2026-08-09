import { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { Link, useNavigate } from "react-router-dom";
import MeshBackground from "../components/common/MeshBackground";
import { loginUser } from "../services/authService";
import { applicantExists } from "../services/blockchainService";

function Login() {
    const { connectWallet } = useWallet();

    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.email || !formData.password) {
            alert("Please fill all fields.");
            return;
        }

        try {
            // 1. Connect MetaMask
            const walletAddress = await connectWallet();

            console.log("Connected wallet:", walletAddress);

            if (!walletAddress) {
                return;
            }

            // 2. Check whether wallet is registered on blockchain
            const exists = await applicantExists(walletAddress);

            if (!exists) {
                alert("Wallet is not registered on blockchain");
                return;
            }

            // 3. Prepare login data
            const loginData = {
                ...formData,
                walletAddress,
            };

            console.log("Login data:", loginData);

            // 4. Login through backend
            const response = await loginUser(loginData);

            console.log("Login response:", response);

            // 5. Store authentication data
            localStorage.setItem("token", response.token);

            localStorage.setItem(
                "user",
                JSON.stringify(response.user)
            );

            alert(response.message || "Login successful");

            // 6. Navigate according to role
            if (response.user.role === "STUDENT") {
                navigate("/student/dashboard");
            }

            if (response.user.role === "ORGANIZATION") {
                navigate("/organization/dashboard");
            }

            if (response.user.role === "COMPANY") {
                navigate("/company/dashboard");
            }

        } catch (error) {
            console.error("Login Error:", error);

            alert(
                error.response?.data?.message ||
                error.message ||
                "Login Failed"
            );
        }
    };


    return (
        <div
            className={`relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 transition-colors duration-500 ${darkMode
                    ? "bg-[#070B14] text-white"
                    : "bg-[#F8FAFC] text-slate-900"
                }`}
        >

            {/* Mesh Background */}
            <MeshBackground darkMode={darkMode} />

            {/* Theme Toggle */}
            <button
                type="button"
                onClick={() => {
                    const newMode = !darkMode;
                    setDarkMode(newMode);
                    localStorage.setItem(
                        "skillsync-theme",
                        newMode ? "dark" : "light"
                    );
                }}
                className={`absolute right-6 top-6 z-50 flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-300 hover:scale-105 ${darkMode
                        ? "border-white/10 bg-white/5 hover:bg-white/10"
                        : "border-slate-200 bg-white shadow-sm hover:bg-slate-50"
                    }`}
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
                {darkMode ? "☀️" : "🌙"}
            </button>


            {/* Login Content */}
            <div className="relative z-10 w-full max-w-md">

                {/* Brand */}
                <div className="mb-8 text-center">

                    <h1
                        className={`text-3xl font-bold tracking-tight ${darkMode ? "text-white" : "text-slate-900"
                            }`}
                    >
                        Skill<span className="text-blue-500">Sync</span>
                    </h1>

                    <p
                        className={`mt-2 text-sm ${darkMode ? "text-slate-400" : "text-slate-500"
                            }`}
                    >
                        Blockchain-powered credential verification
                    </p>

                </div>


                {/* Login Card */}
                <div
                    className={`rounded-3xl border p-8 shadow-2xl backdrop-blur-2xl transition-colors duration-500 sm:p-10 ${darkMode
                            ? "border-white/10 bg-white/[0.06] shadow-black/30"
                            : "border-slate-200 bg-white/90 shadow-slate-200/70"
                        }`}
                >

                    <h2
                        className={`text-center text-3xl font-bold tracking-tight ${darkMode ? "text-white" : "text-slate-900"
                            }`}
                    >
                        Welcome Back
                    </h2>

                    <p
                        className={`mt-2 text-center text-sm ${darkMode ? "text-slate-400" : "text-slate-500"
                            }`}
                    >
                        Login to your SkillSync account
                    </p>


                    <form onSubmit={handleSubmit} className="mt-8 space-y-5">

                        {/* Email */}
                        <div>

                            <label
                                className={`mb-2 block text-sm font-medium ${darkMode
                                        ? "text-slate-300"
                                        : "text-slate-700"
                                    }`}
                            >
                                Email Address
                            </label>

                            <input
                                type="email"
                                name="email"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`w-full rounded-xl border px-4 py-3.5 outline-none transition duration-300 ${darkMode
                                        ? "border-white/10 bg-white/[0.05] text-white placeholder-slate-600 focus:border-blue-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-blue-500/10"
                                        : "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                    }`}
                            />

                        </div>


                        {/* Password */}
                        <div>

                            <label
                                className={`mb-2 block text-sm font-medium ${darkMode
                                        ? "text-slate-300"
                                        : "text-slate-700"
                                    }`}
                            >
                                Password
                            </label>

                            <input
                                type="password"
                                name="password"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                                className={`w-full rounded-xl border px-4 py-3.5 outline-none transition duration-300 ${darkMode
                                        ? "border-white/10 bg-white/[0.05] text-white placeholder-slate-600 focus:border-blue-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-blue-500/10"
                                        : "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                    }`}
                            />

                        </div>


                        {/* Login Button */}
                        <button
                            type="submit"
                            className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/30"
                        >
                            <span className="relative z-10">
                                🦊 Connect MetaMask & Login
                            </span>
                        </button>


                        {/* Divider */}
                        <div className="flex items-center gap-3 py-1">

                            <div
                                className={`h-px flex-1 ${darkMode
                                        ? "bg-white/10"
                                        : "bg-slate-200"
                                    }`}
                            />

                            <span
                                className={`text-xs ${darkMode
                                        ? "text-slate-600"
                                        : "text-slate-400"
                                    }`}
                            >
                                SECURE WEB3 LOGIN
                            </span>

                            <div
                                className={`h-px flex-1 ${darkMode
                                        ? "bg-white/10"
                                        : "bg-slate-200"
                                    }`}
                            />

                        </div>


                        {/* Register */}
                        <p
                            className={`text-center text-sm ${darkMode
                                    ? "text-slate-400"
                                    : "text-slate-500"
                                }`}
                        >
                            Don't have an account?{" "}

                            <Link
                                to="/register"
                                className="font-semibold text-blue-500 transition hover:text-blue-400 hover:underline"
                            >
                                Register
                            </Link>

                        </p>

                    </form>

                </div>


                {/* Security Indicators */}
                <div
                    className={`mt-6 flex items-center justify-center gap-6 text-xs ${darkMode ? "text-slate-600" : "text-slate-500"
                        }`}
                >

                    <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Wallet secured
                    </span>

                    <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        Blockchain verified
                    </span>

                </div>

            </div>

        </div>
    );
}

export default Login;