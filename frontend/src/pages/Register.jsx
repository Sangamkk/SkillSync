import { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../services/authService";
import { createApplicant } from "../services/blockchainService";
import MeshBackground from "../components/common/MeshBackground";

function Register() {
    const { connectWallet } = useWallet();
    const navigate = useNavigate();

    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "STUDENT",
        usn: "",
        college: "",
    });

    const handleThemeChange = () => {
        const newMode = !darkMode;

        setDarkMode(newMode);

        localStorage.setItem(
            "skillsync-theme",
            newMode ? "dark" : "light"
        );
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (
            !formData.name ||
            !formData.email ||
            !formData.password
        ) {
            alert("Please fill all required fields");
            return;
        }

        if (!formData.usn || !formData.college) {
            alert("Please fill all student details");
            return;
        }

        const walletAddress = await connectWallet();

        if (!walletAddress) return;

        try {
            await createApplicant();

            const registerData = {
                ...formData,
                walletAddress,
            };

            console.log(registerData);

            const response = await registerUser(registerData);

            localStorage.setItem("token", response.token);
            localStorage.setItem(
                "user",
                JSON.stringify(response.user)
            );

            alert(response.message);

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
            alert(
                error.response?.data?.message ||
                "Registration Failed"
            );
        }
    };

    return (
        <div
            className={`relative min-h-screen overflow-hidden transition-colors duration-500 ${
                darkMode
                    ? "bg-[#070B14] text-white"
                    : "bg-[#f4f7fb] text-slate-900"
            }`}
        >
            {/* Interactive Mesh */}
            <MeshBackground darkMode={darkMode} />

            {/* Theme Toggle */}
            <button
                onClick={handleThemeChange}
                className={`fixed right-6 top-6 z-30 flex h-11 w-11 items-center justify-center rounded-xl border text-lg transition-all duration-300 ${
                    darkMode
                        ? "border-white/10 bg-white/[0.06] text-white hover:bg-white/10"
                        : "border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-100"
                }`}
                aria-label="Toggle theme"
            >
                {darkMode ? "☀️" : "🌙"}
            </button>

            {/* Main Container */}
            <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-6 py-12 lg:px-10">
                <div className="grid w-full items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">

                    {/* ================= LEFT SIDE ================= */}

                    <div className="hidden lg:block">

                        <p
                            className={`mb-5 text-sm font-semibold uppercase tracking-[0.22em] ${
                                darkMode
                                    ? "text-blue-400"
                                    : "text-blue-600"
                            }`}
                        >
                            Build your digital identity
                        </p>

                        <h1 className="max-w-2xl text-5xl font-extrabold leading-[1.08] tracking-tight xl:text-6xl">
                            Your achievements.
                            <br />

                            <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400 bg-clip-text text-transparent">
                                Your identity.
                            </span>
                        </h1>

                        <p
                            className={`mt-7 max-w-xl text-lg leading-8 ${
                                darkMode
                                    ? "text-slate-400"
                                    : "text-slate-600"
                            }`}
                        >
                            Create a trusted professional identity
                            where certificates, skills and projects
                            can be securely connected to your
                            blockchain wallet.
                        </p>

                        {/* Small trust information */}
                        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4">

                            <div className="flex items-center gap-2">
                                <span className="text-emerald-500">
                                    ✓
                                </span>

                                <span
                                    className={`text-sm ${
                                        darkMode
                                            ? "text-slate-400"
                                            : "text-slate-600"
                                    }`}
                                >
                                    Blockchain verified
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-emerald-500">
                                    ✓
                                </span>

                                <span
                                    className={`text-sm ${
                                        darkMode
                                            ? "text-slate-400"
                                            : "text-slate-600"
                                    }`}
                                >
                                    Secure identity
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-emerald-500">
                                    ✓
                                </span>

                                <span
                                    className={`text-sm ${
                                        darkMode
                                            ? "text-slate-400"
                                            : "text-slate-600"
                                    }`}
                                >
                                    Wallet connected
                                </span>
                            </div>

                        </div>
                    </div>

                    {/* ================= RIGHT SIDE ================= */}

                    <div className="w-full lg:ml-auto lg:max-w-xl">

                        <div
                            className={`rounded-3xl border p-7 shadow-2xl backdrop-blur-2xl transition-colors duration-500 sm:p-9 ${
                                darkMode
                                    ? "border-white/10 bg-white/[0.06] shadow-black/30"
                                    : "border-slate-200/80 bg-white/80 shadow-slate-300/40"
                            }`}
                        >

                            {/* Form Header */}
                            <div className="mb-8">

                                <p
                                    className={`text-sm font-semibold uppercase tracking-[0.18em] ${
                                        darkMode
                                            ? "text-blue-400"
                                            : "text-blue-600"
                                    }`}
                                >
                                    Create your identity
                                </p>

                                <h2
                                    className={`mt-2 text-3xl font-bold tracking-tight ${
                                        darkMode
                                            ? "text-white"
                                            : "text-slate-900"
                                    }`}
                                >
                                    Join SkillSync
                                </h2>

                                <p
                                    className={`mt-2 text-sm ${
                                        darkMode
                                            ? "text-slate-400"
                                            : "text-slate-500"
                                    }`}
                                >
                                    Build your verified digital
                                    identity with SkillSync.
                                </p>

                            </div>

                            {/* Form */}
                            <form
                                onSubmit={handleSubmit}
                                className="space-y-5"
                            >

                                {/* Full Name */}
                                <div>

                                    <label
                                        className={`mb-2 block text-sm font-medium ${
                                            darkMode
                                                ? "text-slate-300"
                                                : "text-slate-700"
                                        }`}
                                    >
                                        Full Name
                                    </label>

                                    <input
                                        type="text"
                                        name="name"
                                        placeholder="Enter your full name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className={`w-full rounded-xl border px-4 py-3.5 outline-none transition duration-300 ${
                                            darkMode
                                                ? "border-white/10 bg-white/[0.05] text-white placeholder-slate-600 focus:border-blue-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-blue-500/10"
                                                : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        }`}
                                    />

                                </div>

                                {/* Email */}
                                <div>

                                    <label
                                        className={`mb-2 block text-sm font-medium ${
                                            darkMode
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
                                        className={`w-full rounded-xl border px-4 py-3.5 outline-none transition duration-300 ${
                                            darkMode
                                                ? "border-white/10 bg-white/[0.05] text-white placeholder-slate-600 focus:border-blue-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-blue-500/10"
                                                : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        }`}
                                    />

                                </div>

                                {/* Password */}
                                <div>

                                    <label
                                        className={`mb-2 block text-sm font-medium ${
                                            darkMode
                                                ? "text-slate-300"
                                                : "text-slate-700"
                                        }`}
                                    >
                                        Password
                                    </label>

                                    <input
                                        type="password"
                                        name="password"
                                        placeholder="Create a password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className={`w-full rounded-xl border px-4 py-3.5 outline-none transition duration-300 ${
                                            darkMode
                                                ? "border-white/10 bg-white/[0.05] text-white placeholder-slate-600 focus:border-blue-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-blue-500/10"
                                                : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        }`}
                                    />

                                </div>

                                {/* Account Type */}
                                <div>

                                    <label
                                        className={`mb-2 block text-sm font-medium ${
                                            darkMode
                                                ? "text-slate-300"
                                                : "text-slate-700"
                                        }`}
                                    >
                                        Account Type
                                    </label>

                                    <select
                                        name="role"
                                        value={formData.role}
                                        disabled
                                        className={`w-full rounded-xl border px-4 py-3.5 outline-none ${
                                            darkMode
                                                ? "border-white/10 bg-[#111827] text-white"
                                                : "border-slate-200 bg-white text-slate-900"
                                        }`}
                                    >
                                        <option value="STUDENT">
                                            Student
                                        </option>
                                    </select>

                                </div>

                                {/* Student Details */}
                                <div
                                    className={`space-y-5 rounded-2xl border p-4 ${
                                        darkMode
                                            ? "border-blue-500/10 bg-blue-500/[0.03]"
                                            : "border-blue-200 bg-blue-50/60"
                                    }`}
                                >

                                    <div className="flex items-center gap-3">

                                        <div
                                            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                                                darkMode
                                                    ? "bg-blue-500/10"
                                                    : "bg-blue-100"
                                            }`}
                                        >
                                            🎓
                                        </div>

                                        <div>

                                            <p
                                                className={`text-sm font-semibold ${
                                                    darkMode
                                                        ? "text-white"
                                                        : "text-slate-900"
                                                }`}
                                            >
                                                Student Details
                                            </p>

                                            <p
                                                className={`text-xs ${
                                                    darkMode
                                                        ? "text-slate-500"
                                                        : "text-slate-500"
                                                }`}
                                            >
                                                Required for student
                                                verification
                                            </p>

                                        </div>

                                    </div>

                                    {/* USN */}
                                    <input
                                        type="text"
                                        name="usn"
                                        placeholder="USN"
                                        value={formData.usn}
                                        onChange={handleChange}
                                        className={`w-full rounded-xl border px-4 py-3.5 outline-none transition duration-300 ${
                                            darkMode
                                                ? "border-white/10 bg-white/[0.05] text-white placeholder-slate-600 focus:border-blue-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-blue-500/10"
                                                : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        }`}
                                    />

                                    {/* College */}
                                    <input
                                        type="text"
                                        name="college"
                                        placeholder="College Name"
                                        value={formData.college}
                                        onChange={handleChange}
                                        className={`w-full rounded-xl border px-4 py-3.5 outline-none transition duration-300 ${
                                            darkMode
                                                ? "border-white/10 bg-white/[0.05] text-white placeholder-slate-600 focus:border-blue-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-blue-500/10"
                                                : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        }`}
                                    />

                                </div>

                                {/* Register Button */}
                                <button
                                    type="submit"
                                    className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/30"
                                >
                                    <span className="relative z-10">
                                        🦊 Connect MetaMask & Register
                                    </span>
                                </button>

                                {/* Security */}
                                <div
                                    className={`flex items-center justify-center gap-5 pt-1 text-xs ${
                                        darkMode
                                            ? "text-slate-600"
                                            : "text-slate-500"
                                    }`}
                                >

                                    <span className="flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        Blockchain secured
                                    </span>

                                    <span className="flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                        Wallet authentication
                                    </span>

                                </div>

                                {/* Login */}
                                <p
                                    className={`pt-2 text-center text-sm ${
                                        darkMode
                                            ? "text-slate-400"
                                            : "text-slate-500"
                                    }`}
                                >
                                    Already have an account?{" "}

                                    <Link
                                        to="/login"
                                        className="font-semibold text-blue-500 transition hover:text-blue-400 hover:underline"
                                    >
                                        Login
                                    </Link>
                                </p>

                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;