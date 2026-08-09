import { useState } from "react";
import { organisationLogin } from "../services/organisationLogin";
import MeshBackground from "../components/common/MeshBackground";

const OrganisationLogin = () => {

    const [darkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });

    const handleLogin = async () => {

        try {

            const result = await organisationLogin();

            alert("Login Successful");

            console.log(result);

        } catch (error) {

            alert(error.message);

        }

    };

    return (

        <div
            className={`relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12 transition-colors duration-500 ${
                darkMode
                    ? "bg-[#070B14] text-white"
                    : "bg-[#F6F8FC] text-slate-900"
            }`}
        >

            {/* ================= MESH BACKGROUND ================= */}

            <MeshBackground darkMode={darkMode} />


            {/* ================= BACKGROUND GLOW ================= */}

            <div
                className={`pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full blur-[120px] ${
                    darkMode
                        ? "bg-blue-600/20"
                        : "bg-blue-500/10"
                }`}
            />

            <div
                className={`pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full blur-[120px] ${
                    darkMode
                        ? "bg-violet-600/20"
                        : "bg-violet-500/10"
                }`}
            />


            {/* ================= MAIN CONTENT ================= */}

            <div className="relative z-10 w-full max-w-md">


                {/* ================= BRAND ================= */}

                <div className="mb-8 text-center">

                    <h1
                        className={`text-3xl font-bold tracking-tight ${
                            darkMode
                                ? "text-white"
                                : "text-slate-900"
                        }`}
                    >
                        Skill<span className="text-blue-500">Sync</span>
                    </h1>

                    <p
                        className={`mt-2 text-sm ${
                            darkMode
                                ? "text-slate-500"
                                : "text-slate-500"
                        }`}
                    >
                        Blockchain-powered credential verification
                    </p>

                </div>


                {/* ================= LOGIN CARD ================= */}

                <div
                    className={`rounded-3xl border p-8 shadow-2xl backdrop-blur-2xl sm:p-10 ${
                        darkMode
                            ? "border-white/10 bg-white/[0.06] shadow-black/30"
                            : "border-slate-200 bg-white/85 shadow-slate-300/30"
                    }`}
                >


                    {/* ================= HEADING ================= */}

                    <div className="text-center">

                        <p
                            className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                                darkMode
                                    ? "text-violet-400"
                                    : "text-violet-600"
                            }`}
                        >
                            Organisation Portal
                        </p>

                        <h2
                            className={`mt-3 text-3xl font-bold ${
                                darkMode
                                    ? "text-white"
                                    : "text-slate-900"
                            }`}
                        >
                            Welcome Back
                        </h2>

                        <p
                            className={`mt-2 text-sm leading-6 ${
                                darkMode
                                    ? "text-slate-400"
                                    : "text-slate-500"
                            }`}
                        >
                            Connect your organisation wallet to
                            access SkillSync.
                        </p>

                    </div>


                    {/* ================= WALLET SECTION ================= */}

                    <div
                        className={`mt-8 rounded-2xl border p-5 ${
                            darkMode
                                ? "border-violet-500/20 bg-violet-500/[0.05]"
                                : "border-violet-200 bg-violet-50/60"
                        }`}
                    >

                        <div className="flex items-start gap-4">

                            <div
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
                                    darkMode
                                        ? "bg-orange-500/10"
                                        : "bg-orange-100"
                                }`}
                            >
                                🦊
                            </div>

                            <div>

                                <h3
                                    className={`font-semibold ${
                                        darkMode
                                            ? "text-white"
                                            : "text-slate-900"
                                    }`}
                                >
                                    MetaMask Wallet
                                </h3>

                                <p
                                    className={`mt-1 text-sm leading-5 ${
                                        darkMode
                                            ? "text-slate-400"
                                            : "text-slate-500"
                                    }`}
                                >
                                    Use your registered organisation
                                    wallet to securely sign in.
                                </p>

                            </div>

                        </div>

                    </div>


                    {/* ================= LOGIN BUTTON ================= */}

                    <button
                        onClick={handleLogin}
                        className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/30 active:translate-y-0"
                    >
                        🦊 Login with MetaMask
                    </button>


                    {/* ================= SECURITY INFO ================= */}

                    <div
                        className={`mt-6 flex items-center justify-center gap-5 text-xs ${
                            darkMode
                                ? "text-slate-500"
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


                {/* ================= FOOTER ================= */}

                <p
                    className={`mt-6 text-center text-xs ${
                        darkMode
                            ? "text-slate-600"
                            : "text-slate-400"
                    }`}
                >
                    SkillSync Organisation Network
                </p>

            </div>

        </div>

    );
};

export default OrganisationLogin;