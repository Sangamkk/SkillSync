import { useEffect, useState } from "react";

import {
    getOrganisationEmployees,
    terminateEmployment,
} from "../../services/employmentService";

import {
    terminateEmployment as terminateEmploymentOnChain,
} from "../../services/blockchainServices/blockchainService";

import MeshBackground from "../../components/common/MeshBackground";


function Employees() {

    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [terminatingId, setTerminatingId] = useState(null);
    const [statusMessage, setStatusMessage] = useState({ id: null, text: "", type: "" });

    const [darkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });

    useEffect(() => {
        fetchEmployees();
    }, []);

    async function fetchEmployees() {
        setLoading(true);
        try {
            const data = await getOrganisationEmployees();
            setEmployees(data || []);
        } catch (err) {
            console.error("Error fetching employees:", err);
        } finally {
            setLoading(false);
        }
    }

    async function handleTerminate(offerId) {
        const confirmTerminate = window.confirm("Are you sure you want to terminate this employment on-chain?");
        if (!confirmTerminate) return;

        setTerminatingId(offerId);
        setStatusMessage({ id: offerId, text: "Prompting MetaMask transaction to terminate employment...", type: "info" });

        try {
            // Step 1: Blockchain termination
            setStatusMessage({ id: offerId, text: "Waiting for on-chain confirmation...", type: "info" });
            const txHash = await terminateEmploymentOnChain(offerId);

            // Step 2: MongoDB / Backend
            setStatusMessage({ id: offerId, text: "Updating database status...", type: "info" });
            await terminateEmployment(offerId);

            setStatusMessage({ id: offerId, text: `✓ Employment Terminated. Tx: ${txHash ? txHash.slice(0, 14) : ""}...`, type: "success" });

            setTimeout(() => {
                fetchEmployees();
                setStatusMessage({ id: null, text: "", type: "" });
            }, 1500);
        } catch (err) {
            console.error("Termination error:", err);
            const errMsg = err.shortMessage || err.reason || err.message || "Termination failed";
            setStatusMessage({ id: offerId, text: `❌ ${errMsg}`, type: "error" });
        } finally {
            setTerminatingId(null);
        }
    }


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

                <div className="mb-8">

                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                        Workforce
                    </p>

                    <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                        Employees
                    </h1>

                    <p
                        className={`mt-3 max-w-2xl text-sm leading-6 ${
                            darkMode
                                ? "text-slate-400"
                                : "text-slate-500"
                        }`}
                    >
                        Manage employees hired through verified
                        SkillSync employment offers.
                    </p>

                </div>


                {/* ================= EMPLOYEE COUNT ================= */}

                <div
                    className={`mb-6 inline-flex items-center gap-3 rounded-2xl border px-5 py-3 ${
                        darkMode
                            ? "border-white/10 bg-white/[0.04]"
                            : "border-slate-200 bg-white shadow-sm"
                    }`}
                >

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                        👥
                    </div>

                    <div>

                        <p className="text-xs text-slate-500">
                            Total Employees
                        </p>

                        <p className="text-lg font-bold">
                            {employees.length}
                        </p>

                    </div>

                </div>


                {/* ================= EMPTY STATE ================= */}

                {employees.length === 0 && (

                    <div
                        className={`rounded-3xl border p-12 text-center backdrop-blur-xl ${
                            darkMode
                                ? "border-white/10 bg-white/[0.04]"
                                : "border-slate-200 bg-white/90 shadow-sm"
                        }`}
                    >

                        <div
                            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-2xl ${
                                darkMode
                                    ? "bg-blue-500/10"
                                    : "bg-blue-50"
                            }`}
                        >
                            👤
                        </div>

                        <h2 className="mt-5 text-xl font-bold">
                            No Employees Found
                        </h2>

                        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                            Employees will appear here after employment
                            offers are successfully accepted.
                        </p>

                    </div>

                )}


                {/* ================= EMPLOYEES ================= */}

                {employees.length > 0 && (

                    <div className="grid gap-5 md:grid-cols-2">

                        {employees.map((emp) => (

                            <div
                                key={emp._id}
                                className={`rounded-3xl border p-6 backdrop-blur-xl transition-all duration-300 ${
                                    darkMode
                                        ? "border-white/10 bg-white/[0.045] shadow-xl shadow-black/20 hover:-translate-y-1 hover:border-blue-500/20"
                                        : "border-slate-200 bg-white/90 shadow-sm hover:-translate-y-1 hover:shadow-lg"
                                }`}
                            >


                                {/* ================= EMPLOYEE HEADER ================= */}

                                <div className="flex items-center justify-between gap-4">

                                    <div className="flex min-w-0 items-center gap-4">

                                        <div
                                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold ${
                                                darkMode
                                                    ? "bg-blue-500/10 text-blue-400"
                                                    : "bg-blue-50 text-blue-600"
                                            }`}
                                        >
                                            {emp.student?.name
                                                ?.charAt(0)
                                                ?.toUpperCase() || "E"}
                                        </div>


                                        <div className="min-w-0">

                                            <h2 className="truncate text-lg font-bold">
                                                {emp.student?.name}
                                            </h2>

                                            <p className="mt-1 truncate text-sm text-slate-500">
                                                {emp.student?.email}
                                            </p>

                                        </div>

                                    </div>


                                    {/* STATUS */}

                                    <span
                                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                                            emp.status === "Active"
                                                ? darkMode
                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                    : "bg-emerald-50 text-emerald-600"
                                                : darkMode
                                                    ? "bg-slate-500/10 text-slate-400"
                                                    : "bg-slate-100 text-slate-600"
                                        }`}
                                    >
                                        {emp.status}
                                    </span>

                                </div>


                                {/* ================= POSITION ================= */}

                                <div
                                    className={`mt-6 rounded-2xl border p-4 ${
                                        darkMode
                                            ? "border-white/10 bg-black/10"
                                            : "border-slate-100 bg-slate-50"
                                    }`}
                                >

                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Position
                                    </p>

                                    <p className="mt-2 font-semibold">
                                        {emp.job?.title}
                                    </p>

                                </div>


                                {/* ================= EMPLOYMENT INFO ================= */}

                                <div className="mt-4 grid grid-cols-2 gap-4">

                                    <div
                                        className={`rounded-2xl p-4 ${
                                            darkMode
                                                ? "bg-white/[0.03]"
                                                : "bg-slate-50"
                                        }`}
                                    >

                                        <p className="text-xs text-slate-500">
                                            Status
                                        </p>

                                        <p className="mt-1 text-sm font-semibold">
                                            {emp.status}
                                        </p>

                                    </div>


                                    <div
                                        className={`rounded-2xl p-4 ${
                                            darkMode
                                                ? "bg-white/[0.03]"
                                                : "bg-slate-50"
                                        }`}
                                    >

                                        <p className="text-xs text-slate-500">
                                            Offer ID
                                        </p>

                                        <p className="mt-1 break-all font-mono text-xs text-slate-500">
                                            {emp.offerId}
                                        </p>

                                    </div>

                                </div>

                                {/* STATUS MESSAGE */}
                                {statusMessage.id === emp.offerId && statusMessage.text && (
                                    <div
                                        className={`mt-4 rounded-xl p-3 text-xs font-medium ${
                                            statusMessage.type === "success"
                                                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                                : statusMessage.type === "error"
                                                ? "border border-red-500/30 bg-red-500/10 text-red-400"
                                                : "border border-blue-500/30 bg-blue-500/10 text-blue-400"
                                        }`}
                                    >
                                        {statusMessage.text}
                                    </div>
                                )}


                                {/* ================= TERMINATE ================= */}

                                {emp.status !== "Terminated" && (
                                    <button
                                        disabled={terminatingId === emp.offerId}
                                        className={`mt-5 w-full rounded-xl border py-3 font-semibold transition-all duration-300 ${
                                            darkMode
                                                ? "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10"
                                                : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                        } ${terminatingId === emp.offerId ? "cursor-not-allowed opacity-60" : ""}`}
                                        onClick={() =>
                                            handleTerminate(emp.offerId)
                                        }
                                    >
                                        {terminatingId === emp.offerId ? "Terminating On-Chain..." : "Terminate Employment"}
                                    </button>
                                )}

                            </div>

                        ))}

                    </div>

                )}

            </div>

        </div>

    );

}


export default Employees;