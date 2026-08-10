import { useEffect, useState } from "react";
import { getProfile } from "../../services/studentService";
import { useNavigate } from "react-router-dom";
import MeshBackground from "../../components/common/MeshBackground";
import { Link } from "react-router-dom";

const Dashboard = () => {

    const [user, setUser] = useState(null);
    const [darkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });
    const navigate = useNavigate();
    useEffect(() => {
        fetchProfile();
    }, []);
    const fetchProfile = async () => {
        try {
            const user = JSON.parse(
                localStorage.getItem("user")
            );
            console.log(user);
            const walletAddress = JSON.parse(localStorage.getItem("user")).walletAddress;
            const profile = await getProfile(walletAddress);
            setUser(profile);
        } catch (error) {
            console.error(error);
        }
    };


    const nxtPage = () => {
        navigate("/certificate");
    };


    return (

        <div
            className={`relative min-h-screen overflow-hidden px-6 py-10 transition-colors duration-500 ${darkMode
                    ? "bg-[#070B14] text-white"
                    : "bg-[#F6F8FC] text-slate-900"
                }`}
        >

            {/* ================= MESH ================= */}

            <MeshBackground darkMode={darkMode} />


            {/* ================= BACKGROUND GLOW ================= */}

            <div
                className={`pointer-events-none fixed -left-40 -top-40 h-96 w-96 rounded-full blur-[130px] ${darkMode
                        ? "bg-blue-600/15"
                        : "bg-blue-500/10"
                    }`}
            />

            <Link
                to="/student/jobs"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
                Browse Jobs
            </Link>

            <br />


            <Link
                to="/student/offers"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
                Job Offers
            </Link>
            
            <br />

            <Link
                to="/student/project"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
                Add Project
            </Link>

            <div
                className={`pointer-events-none fixed -bottom-40 -right-40 h-96 w-96 rounded-full blur-[130px] ${darkMode
                        ? "bg-violet-600/15"
                        : "bg-violet-500/10"
                    }`}
            />


            {/* ================= MAIN ================= */}

            <div className="relative z-10 mx-auto max-w-6xl">


                {/* ================= HEADER ================= */}

                <div
                    className={`mb-6 rounded-3xl border p-7 backdrop-blur-xl ${darkMode
                            ? "border-white/10 bg-white/[0.04]"
                            : "border-slate-200 bg-white/85 shadow-sm"
                        }`}
                >

                    <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">

                        <div>

                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                                Student Dashboard
                            </p>

                            <h1
                                className={`mt-2 text-3xl font-bold tracking-tight ${darkMode
                                        ? "text-white"
                                        : "text-slate-900"
                                    }`}
                            >
                                Welcome back
                                {user?.name
                                    ? `, ${user.name}`
                                    : ""}
                            </h1>

                            <p
                                className={`mt-2 text-sm ${darkMode
                                        ? "text-slate-400"
                                        : "text-slate-500"
                                    }`}
                            >
                                Manage your digital identity and
                                professional credentials.
                            </p>

                        </div>


                        {/* Blockchain Status */}

                        <div
                            className={`flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${darkMode
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-600"
                                }`}
                        >

                            <span className="h-2 w-2 rounded-full bg-emerald-500" />

                            Blockchain Identity

                        </div>

                    </div>

                </div>


                {/* ================= PROFILE + IDENTITY ================= */}

                <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">


                    {/* ================= STUDENT INFORMATION ================= */}

                    <div
                        className={`rounded-3xl border p-7 backdrop-blur-xl ${darkMode
                                ? "border-white/10 bg-white/[0.04]"
                                : "border-slate-200 bg-white/85 shadow-sm"
                            }`}
                    >

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">
                                    Profile
                                </p>

                                <h2
                                    className={`mt-2 text-2xl font-bold ${darkMode
                                            ? "text-white"
                                            : "text-slate-900"
                                        }`}
                                >
                                    Student Information
                                </h2>

                            </div>


                            <div
                                className={`flex h-11 w-11 items-center justify-center rounded-xl ${darkMode
                                        ? "bg-blue-500/10 text-blue-400"
                                        : "bg-blue-50 text-blue-600"
                                    }`}
                            >
                                ◈
                            </div>

                        </div>


                        {/* ================= INFORMATION ================= */}

                        <div className="mt-8 grid gap-4 sm:grid-cols-2">


                            {/* Full Name */}

                            <div
                                className={`rounded-2xl p-5 ${darkMode
                                        ? "bg-white/[0.035]"
                                        : "bg-slate-50"
                                    }`}
                            >

                                <p className="text-xs uppercase tracking-wider text-slate-500">
                                    Full Name
                                </p>

                                <p
                                    className={`mt-2 font-semibold ${darkMode
                                            ? "text-slate-100"
                                            : "text-slate-800"
                                        }`}
                                >
                                    {user?.name || "—"}
                                </p>

                            </div>


                            {/* Email */}

                            <div
                                className={`rounded-2xl p-5 ${darkMode
                                        ? "bg-white/[0.035]"
                                        : "bg-slate-50"
                                    }`}
                            >

                                <p className="text-xs uppercase tracking-wider text-slate-500">
                                    Email
                                </p>

                                <p
                                    className={`mt-2 break-all font-semibold ${darkMode
                                            ? "text-slate-100"
                                            : "text-slate-800"
                                        }`}
                                >
                                    {user?.email || "—"}
                                </p>

                            </div>


                            {/* USN */}

                            <div
                                className={`rounded-2xl p-5 ${darkMode
                                        ? "bg-white/[0.035]"
                                        : "bg-slate-50"
                                    }`}
                            >

                                <p className="text-xs uppercase tracking-wider text-slate-500">
                                    USN
                                </p>

                                <p
                                    className={`mt-2 font-semibold ${darkMode
                                            ? "text-slate-100"
                                            : "text-slate-800"
                                        }`}
                                >
                                    {user?.usn || "—"}
                                </p>

                            </div>


                            {/* College */}

                            <div
                                className={`rounded-2xl p-5 ${darkMode
                                        ? "bg-white/[0.035]"
                                        : "bg-slate-50"
                                    }`}
                            >

                                <p className="text-xs uppercase tracking-wider text-slate-500">
                                    College
                                </p>

                                <p
                                    className={`mt-2 font-semibold ${darkMode
                                            ? "text-slate-100"
                                            : "text-slate-800"
                                        }`}
                                >
                                    {user?.college || "—"}
                                </p>

                            </div>

                        </div>


                        {/* ================= WALLET ================= */}

                        <div
                            className={`mt-4 rounded-2xl border p-5 ${darkMode
                                    ? "border-blue-500/10 bg-blue-500/[0.04]"
                                    : "border-blue-100 bg-blue-50/50"
                                }`}
                        >

                            <div className="flex items-center gap-3">

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-lg">
                                    🦊
                                </div>

                                <div className="min-w-0">

                                    <p className="text-xs uppercase tracking-wider text-slate-500">
                                        Connected Wallet
                                    </p>

                                    <p
                                        className={`mt-1 break-all font-mono text-xs ${darkMode
                                                ? "text-slate-300"
                                                : "text-slate-600"
                                            }`}
                                    >
                                        {user?.walletAddress || "—"}
                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>


                    {/* ================= DIGITAL IDENTITY ================= */}

                    <div
                        className={`relative overflow-hidden rounded-3xl border p-7 backdrop-blur-xl ${darkMode
                                ? "border-white/10 bg-[#111827]/90"
                                : "border-slate-200 bg-white/85 shadow-sm"
                            }`}
                    >

                        <div
                            className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-[80px] ${darkMode
                                    ? "bg-blue-600/15"
                                    : "bg-blue-500/10"
                                }`}
                        />


                        <div className="relative">

                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">
                                Digital Identity
                            </p>


                            {/* Avatar */}

                            <div className="mt-8 flex items-center justify-center">

                                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-violet-600/10">

                                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-3xl font-bold text-white shadow-xl shadow-blue-500/20">

                                        {user?.name
                                            ? user.name
                                                .charAt(0)
                                                .toUpperCase()
                                            : "S"}

                                    </div>

                                </div>

                            </div>


                            {/* Name */}

                            <div className="mt-7 text-center">

                                <h3
                                    className={`text-xl font-bold ${darkMode
                                            ? "text-white"
                                            : "text-slate-900"
                                        }`}
                                >
                                    {user?.name || "Student"}
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    {user?.role || "STUDENT"}
                                </p>

                            </div>


                            {/* Identity Status */}

                            <div
                                className={`mt-7 rounded-2xl border p-4 text-center ${darkMode
                                        ? "border-emerald-500/20 bg-emerald-500/[0.05]"
                                        : "border-emerald-200 bg-emerald-50"
                                    }`}
                            >

                                <div className="flex items-center justify-center gap-2">

                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />

                                    <span className="text-sm font-semibold text-emerald-500">
                                        Identity Active
                                    </span>

                                </div>

                                <p className="mt-2 text-xs text-slate-500">
                                    Connected to SkillSync blockchain
                                </p>

                            </div>

                        </div>

                    </div>

                </div>


                {/* ================= CERTIFICATES ================= */}

                <div
                    className={`mt-6 rounded-3xl border p-7 backdrop-blur-xl ${darkMode
                            ? "border-white/10 bg-white/[0.04]"
                            : "border-slate-200 bg-white/85 shadow-sm"
                        }`}
                >

                    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

                        <div>

                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">
                                Credentials
                            </p>

                            <h2
                                className={`mt-2 text-2xl font-bold ${darkMode
                                        ? "text-white"
                                        : "text-slate-900"
                                    }`}
                            >
                                Manage Certificates
                            </h2>

                            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                                Upload and manage your academic and
                                professional certificates.
                            </p>

                        </div>


                        <button
                            onClick={nxtPage}
                            className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                        >
                            View Certificates →
                        </button>

                    </div>

                </div>

            </div>

        </div>

    );
};

export default Dashboard;