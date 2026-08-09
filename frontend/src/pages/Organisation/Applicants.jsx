import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ethers } from "ethers";

import { createOffer } from "../../services/blockchainService";

import {
    getApplicants,
    createEmploymentOffer,
} from "../../services/employmentService";

import { EmploymentType } from "../../utils/enums";

import MeshBackground from "../../components/common/MeshBackground";


function Applicants() {

    const { jobId } = useParams();

    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);

    const [employmentType, setEmploymentType] = useState("");
    const [deadline, setDeadline] = useState("");

    const [darkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });


    useEffect(() => {
        fetchApplicants();
    }, []);


    const fetchApplicants = async () => {

        try {

            const data = await getApplicants(jobId);

            setApplicants(data);

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }

    };


    const handleOffer = async (application) => {

        try {

            const employmentHash = crypto.randomUUID();

            const employmentHashBytes =
                ethers.id(employmentHash);

            const deadlineTimestamp = Math.floor(
                new Date(deadline).getTime() / 1000
            );


            // Blockchain

            const { txHash, offerId } =
                await createOffer(
                    employmentHashBytes,
                    EmploymentType[employmentType],
                    application.student.walletAddress,
                    deadlineTimestamp
                );


            // MongoDB

            await createEmploymentOffer(
                application._id,
                offerId,
                employmentHash,
                txHash
            );


            alert("Offer Sent");

        } catch (err) {

            console.error(err);

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


                {/* ================= PAGE HEADER ================= */}

                <div className="mb-8">

                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                        Recruitment
                    </p>

                    <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                        Applicants
                    </h1>

                    <p
                        className={`mt-3 max-w-2xl text-sm leading-6 ${
                            darkMode
                                ? "text-slate-400"
                                : "text-slate-500"
                        }`}
                    >
                        Review candidates who applied for this
                        opportunity and send verified employment offers.
                    </p>

                </div>


                {/* ================= LOADING ================= */}

                {loading && (

                    <div
                        className={`rounded-3xl border p-12 text-center backdrop-blur-xl ${
                            darkMode
                                ? "border-white/10 bg-white/[0.04]"
                                : "border-slate-200 bg-white/90 shadow-sm"
                        }`}
                    >

                        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />

                        <p className="text-sm text-slate-500">
                            Loading applicants...
                        </p>

                    </div>

                )}


                {/* ================= NO APPLICANTS ================= */}

                {!loading && applicants.length === 0 && (

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
                            👥
                        </div>

                        <h2 className="mt-5 text-xl font-bold">
                            No Applicants Yet
                        </h2>

                        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                            Applications for this job will appear here
                            once students start applying.
                        </p>

                    </div>

                )}


                {/* ================= APPLICANTS ================= */}

                {!loading && applicants.length > 0 && (

                    <div className="space-y-6">

                        {applicants.map((application) => (

                            <div
                                key={application._id}
                                className={`rounded-3xl border p-6 backdrop-blur-xl transition-all duration-300 sm:p-7 ${
                                    darkMode
                                        ? "border-white/10 bg-white/[0.045] shadow-xl shadow-black/20 hover:border-blue-500/20"
                                        : "border-slate-200 bg-white/90 shadow-sm hover:shadow-lg"
                                }`}
                            >

                                {/* ================= APPLICANT HEADER ================= */}

                                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                                    <div className="flex items-center gap-4">

                                        <div
                                            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold ${
                                                darkMode
                                                    ? "bg-blue-500/10 text-blue-400"
                                                    : "bg-blue-50 text-blue-600"
                                            }`}
                                        >
                                            {application.student?.name
                                                ?.charAt(0)
                                                ?.toUpperCase() || "S"}
                                        </div>


                                        <div>

                                            <h2 className="text-xl font-bold">
                                                {application.student?.name}
                                            </h2>

                                            <p className="mt-1 text-sm text-slate-500">
                                                {application.student?.email}
                                            </p>

                                        </div>

                                    </div>


                                    {/* STATUS */}

                                    <div
                                        className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-semibold ${
                                            application.status === "Applied"
                                                ? darkMode
                                                    ? "bg-blue-500/10 text-blue-400"
                                                    : "bg-blue-50 text-blue-600"
                                                : darkMode
                                                    ? "bg-slate-500/10 text-slate-400"
                                                    : "bg-slate-100 text-slate-600"
                                        }`}
                                    >
                                        {application.status}
                                    </div>

                                </div>


                                {/* ================= APPLICANT INFORMATION ================= */}

                                <div className="mt-7 grid gap-4 sm:grid-cols-2">

                                    <div
                                        className={`rounded-2xl border p-4 ${
                                            darkMode
                                                ? "border-white/10 bg-black/10"
                                                : "border-slate-100 bg-slate-50"
                                        }`}
                                    >

                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Email
                                        </p>

                                        <p className="mt-2 break-all text-sm font-medium">
                                            {application.student?.email}
                                        </p>

                                    </div>


                                    <div
                                        className={`rounded-2xl border p-4 ${
                                            darkMode
                                                ? "border-white/10 bg-black/10"
                                                : "border-slate-100 bg-slate-50"
                                        }`}
                                    >

                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Wallet Address
                                        </p>

                                        <p className="mt-2 break-all font-mono text-xs text-slate-500">
                                            {application.student?.walletAddress}
                                        </p>

                                    </div>

                                </div>


                                {/* ================= OFFER SECTION ================= */}

                                {application.status === "Applied" && (

                                    <div
                                        className={`mt-6 rounded-2xl border p-5 ${
                                            darkMode
                                                ? "border-violet-500/10 bg-violet-500/[0.03]"
                                                : "border-violet-100 bg-violet-50/40"
                                        }`}
                                    >

                                        <div className="mb-5">

                                            <p className="text-sm font-semibold">
                                                Employment Offer
                                            </p>

                                            <p className="mt-1 text-xs text-slate-500">
                                                Select the offer type and
                                                application deadline.
                                            </p>

                                        </div>


                                        <div className="grid gap-5 md:grid-cols-2">

                                            {/* Employment Type */}

                                            <div>

                                                <label
                                                    className={`mb-2 block text-sm font-semibold ${
                                                        darkMode
                                                            ? "text-slate-300"
                                                            : "text-slate-700"
                                                    }`}
                                                >
                                                    Employment Type
                                                </label>

                                                <select
                                                    value={employmentType}
                                                    onChange={(e) =>
                                                        setEmploymentType(
                                                            e.target.value
                                                        )
                                                    }
                                                    className={`w-full rounded-xl border px-4 py-3.5 outline-none transition ${
                                                        darkMode
                                                            ? "border-white/10 bg-[#111722] text-white focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                                                            : "border-slate-200 bg-white text-slate-900 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                                                    }`}
                                                    required
                                                >

                                                    <option value="">
                                                        Select Type
                                                    </option>

                                                    <option value="Internship">
                                                        Internship
                                                    </option>

                                                    <option value="Employment">
                                                        Employment
                                                    </option>

                                                </select>

                                            </div>


                                            {/* Deadline */}

                                            <div>

                                                <label
                                                    className={`mb-2 block text-sm font-semibold ${
                                                        darkMode
                                                            ? "text-slate-300"
                                                            : "text-slate-700"
                                                    }`}
                                                >
                                                    Application Deadline
                                                </label>

                                                <input
                                                    type="date"
                                                    value={deadline}
                                                    onChange={(e) =>
                                                        setDeadline(
                                                            e.target.value
                                                        )
                                                    }
                                                    className={`w-full rounded-xl border px-4 py-3.5 outline-none transition ${
                                                        darkMode
                                                            ? "border-white/10 bg-white/[0.04] text-white focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                                                            : "border-slate-200 bg-white text-slate-900 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                                                    }`}
                                                    required
                                                />

                                            </div>

                                        </div>


                                        {/* Send Offer */}

                                        <button
                                            onClick={() =>
                                                handleOffer(application)
                                            }
                                            className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30"
                                        >
                                            Send Employment Offer
                                        </button>

                                    </div>

                                )}

                            </div>

                        ))}

                    </div>

                )}

            </div>

        </div>

    );

}


export default Applicants;