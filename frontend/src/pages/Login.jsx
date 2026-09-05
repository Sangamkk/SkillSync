import { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { Link, useNavigate } from "react-router-dom";
import MeshBackground from "../components/common/MeshBackground";
import { applicantExists } from "../services/blockchainServices/blockchainService";
import { applicantLogin, organisationLogin } from "../services/backendAuthentication/loginService";

function Login() {
    const { connectWallet } = useWallet();
    const navigate = useNavigate();

    // ================= THEME =================

    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });
    const [role, setRole] = useState("STUDENT");
    const [formData, setFormData] = useState({ email: "", password: "" });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    // ================= HANDLE LOGIN =================

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // ==========================================
            // 1. CONNECT METAMASK
            // ==========================================

            const walletAddress = await connectWallet();

            console.log("Connected wallet:", walletAddress);

            if (!walletAddress) {
                return;
            }

            // ==========================================
            // 2. APPLICANT BLOCKCHAIN CHECK
            // ==========================================

            if (role === "STUDENT") {
                const exists = await applicantExists(walletAddress);

                if (!exists) {
                    alert(
                        "This wallet is not registered as an applicant."
                    );
                    return;
                }
            }

            // ==========================================
            // 3. PREPARE LOGIN DATA
            // ==========================================

            const loginData = {
                walletAddress,
                role,
            };

            console.log("Login data:", loginData);

            // ==========================================
            // 4. LOGIN THROUGH BACKEND
            // ==========================================

            let response;

            if (role === "STUDENT") {
                response = await applicantLogin(loginData);
            } else if (role === "ORGANISATION") {
                response = await organisationLogin(loginData);
            }
            console.log("Login response:", response);

            // ==========================================
            // 5. STORE AUTHENTICATION DATA
            // ==========================================

            localStorage.setItem("token", response.token);

            localStorage.setItem(
                "user",
                JSON.stringify(response.user)
            );

            // ==========================================
            // 6. VERIFY ROLE
            // ==========================================

            if (response.user.role !== role) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");

                alert(
                    "The selected account type does not match your account."
                );

                return;
            }

            // ==========================================
            // 7. SUCCESS
            // ==========================================

            alert(response.message || "Login successful");

            // ==========================================
            // 8. ROLE-BASED NAVIGATION
            // ==========================================

            if (response.user.role === "STUDENT") {
                navigate("/student/dashboard");
                return;
            }

            if (response.user.role === "ORGANISATION") {
                navigate("/organisation");
                return;
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

    // ================= UI =================

    return (
        <div
            className={`relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 transition-colors duration-500 ${darkMode
                    ? "bg-[#070B14] text-white"
                    : "bg-[#F8FAFC] text-slate-900"
                }`}
        >

            {/* ================= MESH BACKGROUND ================= */}

            <MeshBackground darkMode={darkMode} />

            {/* ================= THEME TOGGLE ================= */}

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
                title={
                    darkMode
                        ? "Switch to Light Mode"
                        : "Switch to Dark Mode"
                }
            >
                {darkMode ? "☀️" : "🌙"}
            </button>

            {/* ================= LOGIN CONTENT ================= */}

            <div className="relative z-10 w-full max-w-md">

                {/* ================= BRAND ================= */}

                <div className="mb-8 text-center">

                    <h1
                        className={`text-3xl font-bold tracking-tight ${darkMode
                                ? "text-white"
                                : "text-slate-900"
                            }`}
                    >
                        Skill<span className="text-blue-500">Sync</span>
                    </h1>

                    <p
                        className={`mt-2 text-sm ${darkMode
                                ? "text-slate-400"
                                : "text-slate-500"
                            }`}
                    >
                        Blockchain-powered credential verification
                    </p>

                </div>

                {/* ================= LOGIN CARD ================= */}

                <div
                    className={`rounded-3xl border p-8 shadow-2xl backdrop-blur-2xl transition-colors duration-500 sm:p-10 ${darkMode
                            ? "border-white/10 bg-white/[0.06] shadow-black/30"
                            : "border-slate-200 bg-white/90 shadow-slate-200/70"
                        }`}
                >

                    {/* ================= HEADING ================= */}

                    <div className="text-center">

                        <h2
                            className={`text-3xl font-bold tracking-tight ${darkMode
                                    ? "text-white"
                                    : "text-slate-900"
                                }`}
                        >
                            Welcome Back
                        </h2>

                        <p
                            className={`mt-2 text-sm ${darkMode
                                    ? "text-slate-400"
                                    : "text-slate-500"
                                }`}
                        >
                            Login to your SkillSync account
                        </p>

                    </div>

                    {/* ================= ROLE SELECTOR ================= */}

                    <div className="mt-7">

                        <p
                            className={`mb-3 text-sm font-medium ${darkMode
                                    ? "text-slate-300"
                                    : "text-slate-700"
                                }`}
                        >
                            Login as
                        </p>

                        <div className="grid grid-cols-2 gap-3">

                            {/* ================= APPLICANT ================= */}

                            <button
                                type="button"
                                onClick={() => setRole("STUDENT")}
                                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 transition-all duration-300 ${role === "STUDENT"
                                        ? darkMode
                                            ? "border-blue-500 bg-blue-500/10 text-blue-400"
                                            : "border-blue-500 bg-blue-50 text-blue-600"
                                        : darkMode
                                            ? "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                                            : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                                    }`}
                            >

                                {/* Radio */}
                                <span
                                    className={`flex h-4 w-4 items-center justify-center rounded-full border ${role === "STUDENT"
                                            ? "border-blue-500"
                                            : darkMode
                                                ? "border-slate-600"
                                                : "border-slate-300"
                                        }`}
                                >
                                    {role === "STUDENT" && (
                                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                                    )}
                                </span>

                                <span className="font-semibold">
                                    Applicant
                                </span>

                            </button>

                            {/* ================= ORGANISATION ================= */}

                            <button
                                type="button"
                                onClick={() =>
                                    setRole("ORGANISATION")
                                }
                                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 transition-all duration-300 ${role === "ORGANISATION"
                                        ? darkMode
                                            ? "border-violet-500 bg-violet-500/10 text-violet-400"
                                            : "border-violet-500 bg-violet-50 text-violet-600"
                                        : darkMode
                                            ? "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                                            : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                                    }`}
                            >

                                {/* Radio */}
                                <span
                                    className={`flex h-4 w-4 items-center justify-center rounded-full border ${role === "ORGANISATION"
                                            ? "border-violet-500"
                                            : darkMode
                                                ? "border-slate-600"
                                                : "border-slate-300"
                                        }`}
                                >
                                    {role === "ORGANISATION" && (
                                        <span className="h-2 w-2 rounded-full bg-violet-500" />
                                    )}
                                </span>

                                <span className="font-semibold">
                                    Organisation
                                </span>

                            </button>

                        </div>

                    </div>

                    {/* ================= FORM ================= */}

                    <form
                        onSubmit={handleSubmit}
                        className="mt-6 space-y-5"
                    >

                        {/* ================= LOGIN BUTTON ================= */}

                        <button
                            type="submit"
                            className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/30"
                        >
                            <span className="relative z-10">
                                🦊 Connect MetaMask & Login
                            </span>
                        </button>

                        {/* ================= DIVIDER ================= */}

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

                        {/* ================= REGISTER ================= */}

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

                {/* ================= SECURITY INDICATORS ================= */}

                <div
                    className={`mt-6 flex items-center justify-center gap-6 text-xs ${darkMode
                            ? "text-slate-600"
                            : "text-slate-500"
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