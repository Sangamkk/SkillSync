import { useState } from "react";
import { applyOrganisation } from "../services/organizationService";
import MeshBackground from "../components/common/MeshBackground";

const RegisterOrganisation = () => {
    const [darkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });

    const [formData, setFormData] = useState({
        organisationName: "",
        email: "",
        registrationNumber: "",
        organisationType: "Company",
    });

    const [walletAddress, setWalletAddress] = useState("");

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const connectWallet = async () => {
        try {
            if (!window.ethereum) {
                alert("Please install MetaMask");
                return;
            }

            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            setWalletAddress(accounts[0]);
        } catch (error) {
            console.log(error);
            alert("Failed to connect MetaMask");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!walletAddress) {
            alert("Connect MetaMask First");
            return;
        }

        try {
            const response = await applyOrganisation({
                ...formData,
                walletAddress,
            });

            alert(response.message);

            setFormData({
                organisationName: "",
                email: "",
                registrationNumber: "",
                organisationType: "Company",
            });

            setWalletAddress("");
        } catch (error) {
            console.log(error);
            alert(
                error.response?.data?.message ||
                "Application Failed"
            );
        }
    };

    return (
        <div
            className={`relative min-h-screen overflow-hidden px-4 py-10 transition-colors duration-500 ${
                darkMode
                    ? "bg-[#070B14] text-white"
                    : "bg-slate-50 text-slate-900"
            }`}
        >

            {/* ================= MESH BACKGROUND ================= */}

            <MeshBackground darkMode={darkMode} />

            {/* ================= BACKGROUND GLOW ================= */}

            <div
                className={`pointer-events-none absolute -left-40 -top-40 h-[450px] w-[450px] rounded-full blur-[140px] ${
                    darkMode
                        ? "bg-violet-600/20"
                        : "bg-violet-500/10"
                }`}
            />

            <div
                className={`pointer-events-none absolute -bottom-40 -right-40 h-[450px] w-[450px] rounded-full blur-[140px] ${
                    darkMode
                        ? "bg-blue-600/20"
                        : "bg-blue-500/10"
                }`}
            />

            <div
                className={`pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px] ${
                    darkMode
                        ? "bg-cyan-500/5"
                        : "bg-cyan-500/10"
                }`}
            />


            {/* ================= MAIN CONTENT ================= */}

            <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">

                <div className="grid w-full items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">


                    {/* ================================================= */}
                    {/* LEFT SIDE */}
                    {/* ================================================= */}

                    <div className="hidden lg:block">

                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">
                            Organization Network
                        </p>


                        <h1 className="mt-4 max-w-xl text-5xl font-extrabold leading-tight tracking-tight">

                            Connect your
                            <br />

                            <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                                organization.
                            </span>

                        </h1>


                        <p
                            className={`mt-6 max-w-lg text-lg leading-8 ${
                                darkMode
                                    ? "text-slate-400"
                                    : "text-slate-600"
                            }`}
                        >
                            Join SkillSync and become part of a trusted
                            credential verification network powered by
                            blockchain technology.
                        </p>


                        {/* FEATURE CARDS */}

                        <div className="mt-10 grid max-w-lg gap-4">


                            {/* Trusted Organizations */}

                            <div
                                className={`flex items-center gap-4 rounded-2xl border p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 ${
                                    darkMode
                                        ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                                        : "border-slate-200 bg-white/70 hover:bg-white shadow-sm"
                                }`}
                            >

                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-xl">
                                    🏢
                                </div>

                                <div>

                                    <p className="font-semibold">
                                        Trusted Organizations
                                    </p>

                                    <p
                                        className={`mt-1 text-sm ${
                                            darkMode
                                                ? "text-slate-500"
                                                : "text-slate-500"
                                        }`}
                                    >
                                        Build credibility through verified identity
                                    </p>

                                </div>

                            </div>


                            {/* Blockchain Identity */}

                            <div
                                className={`flex items-center gap-4 rounded-2xl border p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 ${
                                    darkMode
                                        ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                                        : "border-slate-200 bg-white/70 hover:bg-white shadow-sm"
                                }`}
                            >

                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-xl">
                                    ⛓️
                                </div>

                                <div>

                                    <p className="font-semibold">
                                        Blockchain Identity
                                    </p>

                                    <p
                                        className={`mt-1 text-sm ${
                                            darkMode
                                                ? "text-slate-500"
                                                : "text-slate-500"
                                        }`}
                                    >
                                        Connect your organization to a wallet
                                    </p>

                                </div>

                            </div>


                            {/* Credential Verification */}

                            <div
                                className={`flex items-center gap-4 rounded-2xl border p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 ${
                                    darkMode
                                        ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                                        : "border-slate-200 bg-white/70 hover:bg-white shadow-sm"
                                }`}
                            >

                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-xl">
                                    ✓
                                </div>

                                <div>

                                    <p className="font-semibold">
                                        Credential Verification
                                    </p>

                                    <p
                                        className={`mt-1 text-sm ${
                                            darkMode
                                                ? "text-slate-500"
                                                : "text-slate-500"
                                        }`}
                                    >
                                        Help verify trusted student achievements
                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>


                    {/* ================================================= */}
                    {/* REGISTRATION CARD */}
                    {/* ================================================= */}

                    <div className="w-full max-w-xl lg:ml-auto">


                        {/* MOBILE HEADER */}

                        <div className="mb-7 text-center lg:hidden">

                            <h1 className="text-3xl font-bold tracking-tight">

                                Skill
                                <span className="text-blue-400">
                                    Sync
                                </span>

                            </h1>

                            <p
                                className={`mt-2 text-sm ${
                                    darkMode
                                        ? "text-slate-500"
                                        : "text-slate-500"
                                }`}
                            >
                                Organization registration
                            </p>

                        </div>


                        {/* CARD */}

                        <div
                            className={`rounded-3xl border p-7 shadow-2xl backdrop-blur-2xl sm:p-9 ${
                                darkMode
                                    ? "border-white/10 bg-white/[0.06] shadow-black/30"
                                    : "border-slate-200 bg-white/80 shadow-slate-300/30"
                            }`}
                        >


                            {/* HEADER */}

                            <div className="mb-8">

                                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-400">
                                    Organization Registration
                                </p>

                                <h2 className="mt-2 text-3xl font-bold tracking-tight">
                                    Join SkillSync
                                </h2>

                                <p
                                    className={`mt-2 text-sm leading-6 ${
                                        darkMode
                                            ? "text-slate-400"
                                            : "text-slate-500"
                                    }`}
                                >
                                    Register your organization to participate
                                    in trusted credential verification.
                                </p>

                            </div>


                            {/* FORM */}

                            <form
                                onSubmit={handleSubmit}
                                className="space-y-5"
                            >


                                {/* ORGANISATION NAME */}

                                <div>

                                    <label
                                        className={`mb-2 block text-sm font-medium ${
                                            darkMode
                                                ? "text-slate-300"
                                                : "text-slate-700"
                                        }`}
                                    >
                                        Organisation Name
                                    </label>

                                    <input
                                        type="text"
                                        name="organisationName"
                                        value={formData.organisationName}
                                        onChange={handleChange}
                                        placeholder="Google"
                                        required
                                        className={`w-full rounded-xl border px-4 py-3.5 outline-none transition duration-300 ${
                                            darkMode
                                                ? "border-white/10 bg-white/[0.05] text-white placeholder-slate-600 focus:border-violet-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-violet-500/10"
                                                : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                                        }`}
                                    />

                                </div>


                                {/* EMAIL */}

                                <div>

                                    <label
                                        className={`mb-2 block text-sm font-medium ${
                                            darkMode
                                                ? "text-slate-300"
                                                : "text-slate-700"
                                        }`}
                                    >
                                        Email
                                    </label>

                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="admin@google.com"
                                        required
                                        className={`w-full rounded-xl border px-4 py-3.5 outline-none transition duration-300 ${
                                            darkMode
                                                ? "border-white/10 bg-white/[0.05] text-white placeholder-slate-600 focus:border-violet-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-violet-500/10"
                                                : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                                        }`}
                                    />

                                </div>


                                {/* REGISTRATION NUMBER */}

                                <div>

                                    <label
                                        className={`mb-2 block text-sm font-medium ${
                                            darkMode
                                                ? "text-slate-300"
                                                : "text-slate-700"
                                        }`}
                                    >
                                        Registration Number
                                    </label>

                                    <input
                                        type="text"
                                        name="registrationNumber"
                                        value={formData.registrationNumber}
                                        onChange={handleChange}
                                        placeholder="REG123456"
                                        required
                                        className={`w-full rounded-xl border px-4 py-3.5 outline-none transition duration-300 ${
                                            darkMode
                                                ? "border-white/10 bg-white/[0.05] text-white placeholder-slate-600 focus:border-violet-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-violet-500/10"
                                                : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                                        }`}
                                    />

                                </div>


                                {/* ORGANISATION TYPE */}

                                <div>

                                    <label
                                        className={`mb-2 block text-sm font-medium ${
                                            darkMode
                                                ? "text-slate-300"
                                                : "text-slate-700"
                                        }`}
                                    >
                                        Organisation Type
                                    </label>

                                    <select
                                        name="organisationType"
                                        value={formData.organisationType}
                                        onChange={handleChange}
                                        className={`w-full cursor-pointer rounded-xl border px-4 py-3.5 outline-none transition duration-300 ${
                                            darkMode
                                                ? "border-white/10 bg-[#111827] text-white focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                                                : "border-slate-200 bg-white text-slate-900 focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                                        }`}
                                    >

                                        <option>Company</option>
                                        <option>University</option>
                                        <option>ResearchLab</option>
                                        <option>NGO</option>
                                        <option>Government</option>
                                        <option>Other</option>

                                    </select>

                                </div>


                                {/* WALLET SECTION */}

                                <div
                                    className={`rounded-2xl border p-4 ${
                                        darkMode
                                            ? "border-orange-500/10 bg-orange-500/[0.03]"
                                            : "border-orange-200 bg-orange-50/60"
                                    }`}
                                >

                                    <div className="mb-4 flex items-center gap-3">

                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-xl">
                                            🦊
                                        </div>

                                        <div>

                                            <p className="text-sm font-semibold">
                                                Blockchain Wallet
                                            </p>

                                            <p
                                                className={`text-xs ${
                                                    darkMode
                                                        ? "text-slate-500"
                                                        : "text-slate-500"
                                                }`}
                                            >
                                                Connect your organization's MetaMask wallet
                                            </p>

                                        </div>

                                    </div>


                                    <button
                                        type="button"
                                        onClick={connectWallet}
                                        className={`w-full rounded-xl py-3.5 font-semibold transition duration-300 ${
                                            walletAddress
                                                ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                                                : "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/30"
                                        }`}
                                    >

                                        {walletAddress
                                            ? "✓ Wallet Connected"
                                            : "🦊 Connect MetaMask"}

                                    </button>


                                    {/* CONNECTED WALLET */}

                                    {walletAddress && (

                                        <div className="mt-4">

                                            <label
                                                className={`mb-2 block text-xs font-medium uppercase tracking-wider ${
                                                    darkMode
                                                        ? "text-slate-500"
                                                        : "text-slate-500"
                                                }`}
                                            >
                                                Connected Wallet
                                            </label>

                                            <input
                                                type="text"
                                                value={walletAddress}
                                                readOnly
                                                className={`w-full rounded-xl border px-4 py-3 font-mono text-xs outline-none ${
                                                    darkMode
                                                        ? "border-emerald-500/20 bg-emerald-500/[0.05] text-emerald-300"
                                                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                }`}
                                            />

                                        </div>

                                    )}

                                </div>


                                {/* SUBMIT */}

                                <button
                                    type="submit"
                                    className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/30"
                                >
                                    Submit Application →
                                </button>


                                {/* SECURITY */}

                                <div
                                    className={`flex items-center justify-center gap-4 pt-1 text-xs ${
                                        darkMode
                                            ? "text-slate-600"
                                            : "text-slate-500"
                                    }`}
                                >

                                    <span className="flex items-center gap-1.5">

                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                                        Secure Application

                                    </span>


                                    <span className="flex items-center gap-1.5">

                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />

                                        Wallet Verified

                                    </span>

                                </div>

                            </form>

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
};

export default RegisterOrganisation;