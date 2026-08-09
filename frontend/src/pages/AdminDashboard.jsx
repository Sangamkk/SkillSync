import { useEffect, useState } from "react";
import { registerOrganisation } from "../services/organisationBlockchain";
import {
    getPendingApplications,
    approveOrganisation,
    rejectOrganisation,
} from "../services/adminService";
import MeshBackground from "../components/common/MeshBackground";

const AdminDashboard = () => {

    const [applications, setApplications] = useState([]);

    const [darkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });


    useEffect(() => {
        fetchApplications();
    }, []);


    const fetchApplications = async () => {
        try {

            const data = await getPendingApplications();

            setApplications(data);

        } catch (error) {

            console.log(error);

        }
    };


    const handleApprove = async (app) => {

        try {

            const txHash =
                await registerOrganisation(
                    app.walletAddress,
                    0
                );

            await approveOrganisation(
                app._id,
                txHash
            );

            alert("Approved");

            fetchApplications();

        } catch (error) {

            console.log(error);

        }
    };


    const handleReject = async (app) => {

        try {

            await rejectOrganisation(app._id);

            alert("Application Rejected");

            await fetchApplications();

        } catch (error) {

            console.log(error);

        }

    };


    return (

        <div
            className={`relative min-h-screen overflow-hidden px-6 py-10 transition-colors duration-500 ${
                darkMode
                    ? "bg-[#070B14] text-white"
                    : "bg-[#F6F8FC] text-slate-900"
            }`}
        >

            {/* ================= MESH ================= */}

            <MeshBackground darkMode={darkMode} />


            {/* ================= BACKGROUND GLOW ================= */}

            <div
                className={`pointer-events-none fixed -left-40 -top-40 h-96 w-96 rounded-full blur-[130px] ${
                    darkMode
                        ? "bg-blue-600/15"
                        : "bg-blue-500/10"
                }`}
            />

            <div
                className={`pointer-events-none fixed -bottom-40 -right-40 h-96 w-96 rounded-full blur-[130px] ${
                    darkMode
                        ? "bg-violet-600/15"
                        : "bg-violet-500/10"
                }`}
            />


            {/* ================= MAIN ================= */}

            <div className="relative z-10 mx-auto max-w-6xl">


                {/* ================= HEADER ================= */}

                <div
                    className={`mb-8 rounded-3xl border p-7 backdrop-blur-xl ${
                        darkMode
                            ? "border-white/10 bg-white/[0.04]"
                            : "border-slate-200 bg-white/85 shadow-sm"
                    }`}
                >

                    <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">

                        <div>

                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">
                                Administration
                            </p>

                            <h1
                                className={`mt-2 text-3xl font-bold tracking-tight sm:text-4xl ${
                                    darkMode
                                        ? "text-white"
                                        : "text-slate-900"
                                }`}
                            >
                                Organisation Requests
                            </h1>

                            <p
                                className={`mt-2 max-w-xl text-sm leading-6 ${
                                    darkMode
                                        ? "text-slate-400"
                                        : "text-slate-500"
                                }`}
                            >
                                Review and manage pending organisation
                                registrations.
                            </p>

                        </div>


                        {/* Pending Count */}

                        <div
                            className={`flex h-20 min-w-20 flex-col items-center justify-center rounded-2xl border ${
                                darkMode
                                    ? "border-blue-500/20 bg-blue-500/10"
                                    : "border-blue-200 bg-blue-50"
                            }`}
                        >

                            <span className="text-2xl font-bold text-blue-500">
                                {applications.length}
                            </span>

                            <span
                                className={`text-xs ${
                                    darkMode
                                        ? "text-slate-400"
                                        : "text-slate-500"
                                }`}
                            >
                                Pending
                            </span>

                        </div>

                    </div>

                </div>


                {/* ================= EMPTY STATE ================= */}

                {applications.length === 0 ? (

                    <div
                        className={`rounded-3xl border p-12 text-center backdrop-blur-xl ${
                            darkMode
                                ? "border-white/10 bg-white/[0.04]"
                                : "border-slate-200 bg-white/85 shadow-sm"
                        }`}
                    >

                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl text-emerald-500">
                            ✓
                        </div>

                        <h2
                            className={`mt-5 text-xl font-semibold ${
                                darkMode
                                    ? "text-white"
                                    : "text-slate-900"
                            }`}
                        >
                            No Pending Requests
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            All organisation applications have been reviewed.
                        </p>

                    </div>

                ) : (

                    /* ================= APPLICATIONS ================= */

                    <div className="space-y-5">

                        {applications.map((app) => (

                            <div
                                key={app._id}
                                className={`rounded-3xl border p-6 backdrop-blur-xl transition-all duration-300 ${
                                    darkMode
                                        ? "border-white/10 bg-white/[0.04] hover:-translate-y-1 hover:border-blue-500/20"
                                        : "border-slate-200 bg-white/85 shadow-sm hover:-translate-y-1 hover:shadow-lg"
                                }`}
                            >

                                {/* ================= ORGANISATION HEADER ================= */}

                                <div
                                    className={`flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between ${
                                        darkMode
                                            ? "border-white/10"
                                            : "border-slate-200"
                                    }`}
                                >

                                    <div className="flex items-center gap-4">

                                        <div
                                            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${
                                                darkMode
                                                    ? "bg-violet-500/10"
                                                    : "bg-violet-50"
                                            }`}
                                        >
                                            🏢
                                        </div>

                                        <div>

                                            <h2
                                                className={`text-xl font-bold ${
                                                    darkMode
                                                        ? "text-white"
                                                        : "text-slate-900"
                                                }`}
                                            >
                                                {app.organisationName}
                                            </h2>

                                            <p className="mt-1 text-sm text-slate-500">
                                                Organisation Application
                                            </p>

                                        </div>

                                    </div>


                                    <span
                                        className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                                            darkMode
                                                ? "bg-amber-500/10 text-amber-400"
                                                : "bg-amber-50 text-amber-600"
                                        }`}
                                    >
                                        PENDING REVIEW
                                    </span>

                                </div>


                                {/* ================= DETAILS ================= */}

                                <div className="mt-6 grid gap-4 sm:grid-cols-2">


                                    {/* Email */}

                                    <div
                                        className={`rounded-2xl p-4 ${
                                            darkMode
                                                ? "bg-white/[0.03]"
                                                : "bg-slate-50"
                                        }`}
                                    >

                                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                            Email
                                        </p>

                                        <p
                                            className={`mt-2 break-all text-sm font-medium ${
                                                darkMode
                                                    ? "text-slate-200"
                                                    : "text-slate-700"
                                            }`}
                                        >
                                            {app.email}
                                        </p>

                                    </div>


                                    {/* Registration Number */}

                                    <div
                                        className={`rounded-2xl p-4 ${
                                            darkMode
                                                ? "bg-white/[0.03]"
                                                : "bg-slate-50"
                                        }`}
                                    >

                                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                            Registration Number
                                        </p>

                                        <p
                                            className={`mt-2 text-sm font-medium ${
                                                darkMode
                                                    ? "text-slate-200"
                                                    : "text-slate-700"
                                            }`}
                                        >
                                            {app.registrationNumber}
                                        </p>

                                    </div>


                                    {/* Organisation Type */}

                                    <div
                                        className={`rounded-2xl p-4 ${
                                            darkMode
                                                ? "bg-white/[0.03]"
                                                : "bg-slate-50"
                                        }`}
                                    >

                                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                            Organisation Type
                                        </p>

                                        <p
                                            className={`mt-2 text-sm font-medium ${
                                                darkMode
                                                    ? "text-slate-200"
                                                    : "text-slate-700"
                                            }`}
                                        >
                                            {app.organisationType}
                                        </p>

                                    </div>


                                    {/* Wallet */}

                                    <div
                                        className={`rounded-2xl p-4 ${
                                            darkMode
                                                ? "bg-white/[0.03]"
                                                : "bg-slate-50"
                                        }`}
                                    >

                                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                            Wallet Address
                                        </p>

                                        <p
                                            className={`mt-2 break-all font-mono text-xs ${
                                                darkMode
                                                    ? "text-slate-300"
                                                    : "text-slate-600"
                                            }`}
                                        >
                                            {app.walletAddress}
                                        </p>

                                    </div>

                                </div>


                                {/* ================= ACTIONS ================= */}

                                <div className="mt-6 flex flex-col gap-3 sm:flex-row">

                                    <button
                                        className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                                        onClick={() =>
                                            handleApprove(app)
                                        }
                                    >
                                        ✓ Approve Organisation
                                    </button>


                                    <button
                                        className={`rounded-xl border px-5 py-3 font-semibold transition-all duration-300 sm:flex-none ${
                                            darkMode
                                                ? "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10"
                                                : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                        }`}
                                        onClick={() =>
                                            handleReject(app)
                                        }
                                    >
                                        Reject
                                    </button>

                                </div>

                            </div>

                        ))}

                    </div>

                )}

            </div>

        </div>
    );
};

export default AdminDashboard;