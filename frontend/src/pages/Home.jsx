import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import ThreeDBackground from "../components/common/ThreeDBackground";
import RoleSelector from "../components/common/RoleSelector";
import HomeDocumentVerifier from "../components/common/HomeDocumentVerifier";

const Home = () => {
    const navigate = useNavigate();

    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") === "dark";
    });

    useEffect(() => {
        localStorage.setItem(
            "skillsync-theme",
            darkMode ? "dark" : "light"
        );
    }, [darkMode]);

    const loginRequired = () => {
        alert("Please Login to Continue.");
        navigate("/login");
    };

    const scrollToSection = (id) => {
        document.getElementById(id)?.scrollIntoView({
            behavior: "smooth",
        });
    };

    return (
        <div
            className={`relative min-h-screen overflow-hidden transition-colors duration-500 ${darkMode
                ? "bg-[#070B14] text-white"
                : "bg-[#F8FAFC] text-slate-900"
                }`}
        >

            {/* =====================================================
                3D SPACE BACKGROUND
            ====================================================== */}

            <ThreeDBackground darkMode={darkMode} />


            {/* =====================================================
                ALL PAGE CONTENT
            ====================================================== */}

            <div className="relative z-10">


                {/* =====================================================
                    NAVBAR
                ====================================================== */}

                <nav
                    className={`fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-xl ${darkMode
                        ? "border-white/10 bg-[#070B14]/80"
                        : "border-slate-200/70 bg-white/80"
                        }`}
                >

                    <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">

                        {/* Logo */}

                        <button
                            onClick={() =>
                                window.scrollTo({
                                    top: 0,
                                    behavior: "smooth",
                                })
                            }
                            className="flex items-center gap-3"
                        >
                            <span className="text-xl font-bold tracking-tight">
                                Skill
                                <span className="text-blue-500">
                                    Sync
                                </span>
                            </span>
                        </button>


                        {/* Navigation */}

                        <div className="hidden items-center gap-8 md:flex">

                            <button
                                onClick={() =>
                                    scrollToSection("features")
                                }
                                className={`text-sm font-medium transition-colors ${darkMode
                                    ? "text-slate-300 hover:text-white"
                                    : "text-slate-600 hover:text-slate-950"
                                    }`}
                            >
                                Features
                            </button>


                            <button
                                onClick={() =>
                                    scrollToSection("how-it-works")
                                }
                                className={`text-sm font-medium transition-colors ${darkMode
                                    ? "text-slate-300 hover:text-white"
                                    : "text-slate-600 hover:text-slate-950"
                                    }`}
                            >
                                How It Works
                            </button>


                            <button
                                onClick={() =>
                                    scrollToSection("verify-document-section")
                                }
                                className={`text-sm font-medium transition-colors ${darkMode
                                    ? "text-slate-300 hover:text-white"
                                    : "text-slate-600 hover:text-slate-950"
                                    }`}
                            >
                                Verify Document
                            </button>

                            <button
                                onClick={() =>
                                    scrollToSection("technology")
                                }
                                className={`text-sm font-medium transition-colors ${darkMode
                                    ? "text-slate-300 hover:text-white"
                                    : "text-slate-600 hover:text-slate-950"
                                    }`}
                            >
                                Technology
                            </button>

                            <button
                                onClick={() =>
                                    scrollToSection("contact")
                                }
                                className={`text-sm font-medium transition-colors ${darkMode
                                    ? "text-slate-300 hover:text-white"
                                    : "text-slate-600 hover:text-slate-950"
                                    }`}
                            >
                                Contact
                            </button>

                        </div>


                        {/* Right Side */}

                        <div className="flex items-center gap-3">

                            {/* Theme */}

                            <button
                                onClick={() =>
                                    setDarkMode(!darkMode)
                                }
                                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300 hover:scale-105 ${darkMode
                                    ? "border-white/10 bg-white/5 hover:bg-white/10"
                                    : "border-slate-200 bg-white hover:bg-slate-50"
                                    }`}
                                title={
                                    darkMode
                                        ? "Switch to Light Mode"
                                        : "Switch to Dark Mode"
                                }
                            >
                                {darkMode ? "☀️" : "🌙"}
                            </button>


                            {/* Verify Document Quick Action */}
                            <button
                                onClick={() => scrollToSection("verify-document-section")}
                                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                                    darkMode
                                        ? "border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20"
                                        : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                }`}
                                title="Public Document Verification"
                            >
                                📄 Verify Document
                            </button>

                            {/* Login */}
                            <button className="px-5 py-2 rounded-md border border-blue-600 text-blue-600 font-medium text-sm transition duration-200 hover:bg-blue-600 hover:text-white" onClick={() => navigate("/login")}>Login</button>

                            {/* Get Started */}
                            <RoleSelector type="register" />

                        </div>

                    </div>

                </nav>


                {/* =====================================================
                    HERO
                ====================================================== */}

                <section className="relative overflow-hidden pt-36 pb-24">

                    {/* Ambient Glow */}

                    <div className="pointer-events-none absolute inset-0 overflow-hidden">

                        <div
                            className={`absolute left-[10%] top-20 h-72 w-72 rounded-full blur-[120px] ${darkMode
                                ? "bg-blue-600/20"
                                : "bg-blue-600/10"
                                }`}
                        />

                        <div
                            className={`absolute right-[10%] top-40 h-80 w-80 rounded-full blur-[130px] ${darkMode
                                ? "bg-violet-600/20"
                                : "bg-violet-600/10"
                                }`}
                        />

                        <div
                            className={`absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-[120px] ${darkMode
                                ? "bg-cyan-500/10"
                                : "bg-cyan-500/10"
                                }`}
                        />

                    </div>


                    <div className="relative mx-auto max-w-7xl px-6 lg:px-8">

                        <div className="grid items-center gap-16 lg:grid-cols-2">


                            {/* =====================================================
                                HERO LEFT
                            ====================================================== */}

                            <div>

                                <div
                                    className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${darkMode
                                        ? "border-blue-400/20 bg-blue-500/10 text-blue-300"
                                        : "border-blue-200 bg-blue-50 text-blue-700"
                                        }`}
                                >

                                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />

                                    Blockchain-powered credential verification

                                </div>


                                <h1 className="max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">

                                    Your achievements.

                                    <br />

                                    <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400 bg-clip-text text-transparent">
                                        Verified forever.
                                    </span>

                                </h1>


                                <p
                                    className={`mt-7 max-w-xl text-lg leading-8 ${darkMode
                                        ? "text-slate-400"
                                        : "text-slate-600"
                                        }`}
                                >
                                    SkillSync securely stores and verifies
                                    academic, professional and skill
                                    credentials using blockchain technology.
                                </p>


                                {/* Buttons */}

                                <div className="mt-9 flex flex-col gap-4 sm:flex-row">

                                    <button
                                        onClick={() =>
                                            navigate("/register")
                                        }
                                        className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-7 py-3.5 font-semibold text-white shadow-xl shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/30"
                                    >
                                        Create Your Profile
                                        <span className="ml-2">
                                            →
                                        </span>
                                    </button>

                                    <button
                                        onClick={() =>
                                            scrollToSection("verify-document-section")
                                        }
                                        className={`rounded-xl border px-7 py-3.5 font-semibold transition-all duration-300 hover:-translate-y-1 ${darkMode
                                            ? "border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 shadow-lg shadow-violet-950/20"
                                            : "border-blue-200 bg-blue-50 text-blue-700 shadow-sm hover:bg-blue-100"
                                            }`}
                                    >
                                        📄 Verify Document
                                    </button>

                                    <button
                                        onClick={() =>
                                            navigate("/login")
                                        }
                                        className={`rounded-xl border px-7 py-3.5 font-semibold transition-all duration-300 hover:-translate-y-1 ${darkMode
                                            ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                                            : "border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                                            }`}
                                    >
                                        🔑 Sign In
                                    </button>

                                </div>


                                {/* Trust Indicators */}

                                <div className="mt-10 flex flex-wrap items-center gap-6">

                                    <div className="flex items-center gap-2">
                                        <span className="text-emerald-500">
                                            ✓
                                        </span>

                                        <span className="text-sm text-slate-500">
                                            Tamper resistant
                                        </span>
                                    </div>


                                    <div className="flex items-center gap-2">
                                        <span className="text-emerald-500">
                                            ✓
                                        </span>

                                        <span className="text-sm text-slate-500">
                                            Blockchain verified
                                        </span>
                                    </div>


                                    <div className="flex items-center gap-2">
                                        <span className="text-emerald-500">
                                            ✓
                                        </span>

                                        <span className="text-sm text-slate-500">
                                            Wallet connected
                                        </span>
                                    </div>

                                </div>

                            </div>


                            {/* =====================================================
                                CERTIFICATE CARD
                            ====================================================== */}

                            <div className="relative hidden min-h-[500px] items-center justify-center lg:flex">

                                {/* Soft Rings */}

                                <div className="absolute h-80 w-80 rounded-full border border-blue-500/20" />

                                <div className="absolute h-96 w-96 rounded-full border border-violet-500/10" />

                                <div className="absolute h-[28rem] w-[28rem] rounded-full border border-cyan-500/10" />


                                {/* Certificate */}

                                <div
                                    className={`relative w-[360px] rounded-3xl border p-7 shadow-2xl backdrop-blur-xl ${darkMode
                                        ? "border-white/10 bg-white/[0.06]"
                                        : "border-slate-200 bg-white shadow-slate-200/60"
                                        }`}
                                >

                                    <div className="flex items-center justify-between">

                                        <div className="flex items-center gap-3">

                                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-xl text-white">
                                                ◈
                                            </div>

                                            <div>

                                                <p className="font-semibold">
                                                    Certificate
                                                </p>

                                                <p className="text-xs text-slate-500">
                                                    Blockchain Credential
                                                </p>

                                            </div>

                                        </div>


                                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
                                            VERIFIED
                                        </span>

                                    </div>


                                    <div className="my-7 h-px bg-slate-500/10" />


                                    <p className="text-sm text-slate-500">
                                        Certificate Hash
                                    </p>


                                    <div
                                        className={`mt-2 rounded-xl p-4 font-mono text-xs ${darkMode
                                            ? "bg-black/30 text-slate-300"
                                            : "bg-slate-50 text-slate-600"
                                            }`}
                                    >
                                        0x8f42...a91c...7bd2
                                    </div>


                                    <div className="mt-5 grid grid-cols-2 gap-4">

                                        <div>

                                            <p className="text-xs text-slate-500">
                                                Network
                                            </p>

                                            <p className="mt-1 font-semibold">
                                                Ethereum
                                            </p>

                                        </div>


                                        <div>

                                            <p className="text-xs text-slate-500">
                                                Status
                                            </p>

                                            <p className="mt-1 font-semibold text-emerald-500">
                                                Authentic
                                            </p>

                                        </div>

                                    </div>

                                </div>


                                {/* Verification Popup */}

                                <div
                                    className={`absolute -bottom-4 -left-2 rounded-2xl border p-4 shadow-xl backdrop-blur-xl ${darkMode
                                        ? "border-white/10 bg-[#111827]/90"
                                        : "border-slate-200 bg-white"
                                        }`}
                                >

                                    <div className="flex items-center gap-3">

                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                                            ✓
                                        </div>

                                        <div>

                                            <p className="text-sm font-semibold">
                                                Verification Complete
                                            </p>

                                            <p className="text-xs text-slate-500">
                                                Secured on Ethereum
                                            </p>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                </section>


                {/* =====================================================
                    STATS
                ====================================================== */}

                <section
                    className={`border-y ${darkMode
                        ? "border-white/10 bg-white/[0.02]"
                        : "border-slate-200 bg-white"
                        }`}
                >

                    <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-slate-200/10 md:grid-cols-4">

                        <div className="p-7 text-center">
                            <p className="text-3xl font-bold">
                                100%
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                Tamper Resistant
                            </p>
                        </div>


                        <div className="p-7 text-center">
                            <p className="text-3xl font-bold">
                                24/7
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                Verification
                            </p>
                        </div>


                        <div className="p-7 text-center">
                            <p className="text-3xl font-bold">
                                Web3
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                Wallet Identity
                            </p>
                        </div>


                        <div className="p-7 text-center">
                            <p className="text-3xl font-bold">
                                Ethereum
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                Blockchain
                            </p>
                        </div>

                    </div>

                </section>


                {/* =====================================================
                    INSTANT DOCUMENT VERIFICATION (PUBLIC)
                ====================================================== */}

                <section
                    id="verify-document-section"
                    className="relative mx-auto max-w-5xl px-6 py-20 lg:px-8"
                >
                    <div className="mb-8 text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-500">
                            Instant Verification
                        </p>
                        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                            Check Document Registration
                        </h2>
                        <p className="mt-2 text-slate-400 text-sm max-w-xl mx-auto">
                            Anyone can upload a certificate to verify if it is authentically issued and registered on the blockchain.
                        </p>
                    </div>

                    <HomeDocumentVerifier darkMode={darkMode} />
                </section>


                {/* =====================================================
                    FEATURES
                ====================================================== */}

                <section
                    id="features"
                    className="mx-auto max-w-7xl px-6 py-28 lg:px-8"
                >

                    <div className="max-w-2xl">

                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-500">
                            Built for trust
                        </p>

                        <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                            Everything you need to prove your skills.
                        </h2>

                        <p className="mt-5 text-lg text-slate-500">
                            A single platform for managing, securing and
                            verifying professional credentials.
                        </p>

                    </div>


                    <div className="mt-14 grid gap-6 md:grid-cols-2">


                        {/* Certificates */}

                        <div
                            className={`group rounded-3xl border p-8 transition-all duration-300 hover:-translate-y-2 ${darkMode
                                ? "border-white/10 bg-white/[0.04] hover:border-blue-500/30"
                                : "border-slate-200 bg-white shadow-sm hover:shadow-xl"
                                }`}
                        >

                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-2xl">
                                📜
                            </div>

                            <h3 className="mt-6 text-2xl font-bold">
                                Certificates
                            </h3>

                            <p className="mt-3 leading-7 text-slate-500">
                                Upload and manage your academic and
                                professional certificates securely.
                            </p>

                            <button
                                onClick={loginRequired}
                                className="mt-6 font-semibold text-blue-500 transition group-hover:text-blue-400"
                            >
                                Upload Certificate →
                            </button>

                        </div>


                        {/* Skills */}

                        <div
                            className={`group rounded-3xl border p-8 transition-all duration-300 hover:-translate-y-2 ${darkMode
                                ? "border-white/10 bg-white/[0.04] hover:border-violet-500/30"
                                : "border-slate-200 bg-white shadow-sm hover:shadow-xl"
                                }`}
                        >

                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-2xl">
                                ⚡
                            </div>

                            <h3 className="mt-6 text-2xl font-bold">
                                Skills
                            </h3>

                            <p className="mt-3 leading-7 text-slate-500">
                                Showcase your technical and soft skills as
                                part of your professional identity.
                            </p>

                            <button
                                onClick={loginRequired}
                                className="mt-6 font-semibold text-violet-500 transition group-hover:text-violet-400"
                            >
                                Add Skills →
                            </button>

                        </div>


                        {/* Projects */}

                        <div
                            className={`group rounded-3xl border p-8 transition-all duration-300 hover:-translate-y-2 ${darkMode
                                ? "border-white/10 bg-white/[0.04] hover:border-cyan-500/30"
                                : "border-slate-200 bg-white shadow-sm hover:shadow-xl"
                                }`}
                        >

                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-2xl">
                                🚀
                            </div>

                            <h3 className="mt-6 text-2xl font-bold">
                                Projects
                            </h3>

                            <p className="mt-3 leading-7 text-slate-500">
                                Store project proofs and showcase real-world
                                achievements.
                            </p>

                            <button
                                onClick={loginRequired}
                                className="mt-6 font-semibold text-cyan-500 transition group-hover:text-cyan-400"
                            >
                                Add Project →
                            </button>

                        </div>


                        {/* Verification */}

                        <div
                            className={`group rounded-3xl border p-8 transition-all duration-300 hover:-translate-y-2 ${darkMode
                                ? "border-white/10 bg-white/[0.04] hover:border-emerald-500/30"
                                : "border-slate-200 bg-white shadow-sm hover:shadow-xl"
                                }`}
                        >

                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl">
                                ✓
                            </div>

                            <h3 className="mt-6 text-2xl font-bold">
                                Verification
                            </h3>

                            <p className="mt-3 leading-7 text-slate-500">
                                Organizations and companies can verify
                                credentials with blockchain-backed proof.
                            </p>

                            <button
                                onClick={() => scrollToSection("verify-document-section")}
                                className="mt-6 font-semibold text-emerald-500 transition group-hover:text-emerald-400"
                            >
                                Verify Document Authenticity →
                            </button>

                        </div>

                    </div>

                </section>


                {/* =====================================================
                    HOW IT WORKS
                ====================================================== */}

                <section
                    id="how-it-works"
                    className={`border-y ${darkMode
                        ? "border-white/10 bg-white/[0.02]"
                        : "border-slate-200 bg-slate-50"
                        }`}
                >

                    <div className="mx-auto max-w-7xl px-6 py-28 lg:px-8">

                        <div className="text-center">

                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-500">
                                Simple process
                            </p>

                            <h2 className="mt-4 text-4xl font-bold sm:text-5xl">
                                How SkillSync works
                            </h2>

                            <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-500">
                                From blockchain identity to trusted
                                credential verification in a few simple
                                steps.
                            </p>

                        </div>


                        <div className="mt-16 grid gap-6 md:grid-cols-3">

                            {[
                                {
                                    number: "01",
                                    title: "Create your identity",
                                    text: "Register with your email and password to get started.",
                                },
                                {
                                    number: "02",
                                    title: "Build your profile",
                                    text: "Add certificates, skills and projects to your digital identity.",
                                },
                                {
                                    number: "03",
                                    title: "Verify credentials",
                                    text: "Organizations and companies can verify your achievements.",
                                },
                            ].map((step) => (

                                <div
                                    key={step.number}
                                    className={`relative rounded-3xl border p-8 ${darkMode
                                        ? "border-white/10 bg-white/[0.04]"
                                        : "border-slate-200 bg-white"
                                        }`}
                                >

                                    <span className="text-sm font-bold text-blue-500">
                                        {step.number}
                                    </span>

                                    <h3 className="mt-5 text-xl font-bold">
                                        {step.title}
                                    </h3>

                                    <p className="mt-3 leading-7 text-slate-500">
                                        {step.text}
                                    </p>

                                </div>

                            ))}

                        </div>

                    </div>

                </section>


                {/* =====================================================
                    TECHNOLOGY
                ====================================================== */}

                <section
                    id="technology"
                    className="mx-auto max-w-7xl px-6 py-28 lg:px-8"
                >

                    <div className="text-center">

                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-500">
                            Powered by modern technology
                        </p>

                        <h2 className="mt-4 text-4xl font-bold sm:text-5xl">
                            Built for the Web3 era.
                        </h2>

                        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-500">
                            SkillSync combines blockchain, secure cloud
                            storage and modern web technologies.
                        </p>

                    </div>


                    <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">

                        {[
                            "Ethereum",
                            "Sepolia",
                            "Node.js",
                            "MongoDB Atlas",
                            "Cloudinary",
                            "React",
                        ].map((technology) => (

                            <div
                                key={technology}
                                className={`flex min-h-28 items-center justify-center rounded-2xl border p-5 text-center font-semibold transition-all duration-300 hover:-translate-y-1 ${darkMode
                                    ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                                    : "border-slate-200 bg-white shadow-sm hover:shadow-lg"
                                    }`}
                            >
                                {technology}
                            </div>

                        ))}

                    </div>

                </section>


                {/* =====================================================
                    CTA
                ====================================================== */}

                <section className="px-6 pb-28 lg:px-8">

                    <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 px-8 py-16 text-center text-white shadow-2xl sm:px-16">

                        <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />

                        <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-cyan-300/20 blur-3xl" />


                        <div className="relative">

                            <h2 className="text-3xl font-bold sm:text-4xl">
                                Make your achievements verifiable.
                            </h2>

                            <p className="mx-auto mt-4 max-w-2xl text-blue-100">
                                Build a trusted digital identity backed by
                                blockchain technology.
                            </p>

                            <button
                                onClick={() =>
                                    navigate("/register")
                                }
                                className="mt-8 rounded-xl bg-white px-7 py-3.5 font-semibold text-blue-700 shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
                            >
                                Get Started →
                            </button>

                        </div>

                    </div>

                </section>


                {/* =====================================================
                    FOOTER
                ====================================================== */}

                <footer
                    id="contact"
                    className={`border-t ${darkMode
                        ? "border-white/10 bg-[#050810]"
                        : "border-slate-200 bg-slate-950"
                        }`}
                >

                    <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">

                        <div className="grid gap-10 md:grid-cols-3">


                            {/* Brand */}

                            <div>

                                <span className="text-xl font-bold text-white">
                                    Skill
                                    <span className="text-blue-400">
                                        Sync
                                    </span>
                                </span>

                                <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
                                    A blockchain-powered platform for secure
                                    academic and professional credential
                                    verification.
                                </p>

                            </div>


                            {/* Platform */}

                            <div>

                                <h3 className="font-semibold text-white">
                                    Platform
                                </h3>

                                <div className="mt-4 space-y-3 text-sm text-slate-400">

                                    <button
                                        onClick={() =>
                                            scrollToSection("features")
                                        }
                                        className="block transition hover:text-white"
                                    >
                                        Features
                                    </button>

                                    <button
                                        onClick={() =>
                                            scrollToSection("how-it-works")
                                        }
                                        className="block transition hover:text-white"
                                    >
                                        How It Works
                                    </button>

                                    <button
                                        onClick={() =>
                                            scrollToSection("technology")
                                        }
                                        className="block transition hover:text-white"
                                    >
                                        Technology
                                    </button>

                                </div>

                            </div>


                            {/* Contact */}

                            <div>

                                <h3 className="font-semibold text-white">
                                    Contact
                                </h3>

                                <div className="mt-4 space-y-3 text-sm text-slate-400">

                                    <p>
                                        support@skillsync.com
                                    </p>

                                    <p>
                                        +91 9552016076
                                    </p>

                                    <p>
                                        GitHub / SkillSync
                                    </p>

                                </div>

                            </div>

                        </div>


                        <div className="mt-12 border-t border-white/10 pt-8 text-sm text-slate-500">

                            © {new Date().getFullYear()} SkillSync.
                            All rights reserved.

                        </div>

                    </div>

                </footer>


            </div>

        </div>
    );
};

export default Home;