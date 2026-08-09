import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    getMyJobs,
    deleteJob,
} from "../../services/employmentService";

import MeshBackground from "../../components/common/MeshBackground";

function MyJobs() {

    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    const [darkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });

    const navigate = useNavigate();


    useEffect(() => {
        fetchJobs();
    }, []);


    const fetchJobs = async () => {

        try {

            const data = await getMyJobs();

            setJobs(data);

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }

    };


    const handleDelete = async (jobId) => {

        try {

            await deleteJob(jobId);

            setJobs((prev) =>
                prev.filter(
                    (job) => job._id !== jobId
                )
            );

        } catch (error) {

            console.error(error);

        }

    };


    /* ================= LOADING ================= */

    if (loading) {

        return (

            <div
                className={`relative flex min-h-screen items-center justify-center overflow-hidden transition-colors duration-500 ${
                    darkMode
                        ? "bg-[#070B14] text-white"
                        : "bg-[#F6F8FC] text-slate-900"
                }`}
            >

                <MeshBackground darkMode={darkMode} />

                <div className="relative z-10 text-center">

                    <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />

                    <p className="mt-4 text-sm text-slate-500">
                        Loading your jobs...
                    </p>

                </div>

            </div>

        );

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
                        Recruitment
                    </p>

                    <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                        My Jobs
                    </h1>

                    <p
                        className={`mt-3 max-w-2xl text-sm leading-6 ${
                            darkMode
                                ? "text-slate-400"
                                : "text-slate-500"
                        }`}
                    >
                        Manage the opportunities published by your
                        organisation and review incoming applicants.
                    </p>

                </div>


                {/* ================= JOB COUNT ================= */}

                <div
                    className={`mb-6 inline-flex items-center gap-3 rounded-2xl border px-5 py-3 ${
                        darkMode
                            ? "border-white/10 bg-white/[0.04]"
                            : "border-slate-200 bg-white shadow-sm"
                    }`}
                >

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                        💼
                    </div>

                    <div>

                        <p className="text-xs text-slate-500">
                            Published Jobs
                        </p>

                        <p className="text-lg font-bold">
                            {jobs.length}
                        </p>

                    </div>

                </div>


                {/* ================= EMPTY STATE ================= */}

                {jobs.length === 0 ? (

                    <div
                        className={`rounded-3xl border p-12 text-center backdrop-blur-xl ${
                            darkMode
                                ? "border-white/10 bg-white/[0.04]"
                                : "border-slate-200 bg-white/85 shadow-sm"
                        }`}
                    >

                        <div
                            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-2xl ${
                                darkMode
                                    ? "bg-blue-500/10"
                                    : "bg-blue-50"
                            }`}
                        >
                            💼
                        </div>

                        <h2 className="mt-5 text-xl font-bold">
                            No Jobs Posted Yet
                        </h2>

                        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                            Create your first opportunity to start
                            receiving applications from students.
                        </p>

                    </div>

                ) : (

                    /* ================= JOB CARDS ================= */

                    <div className="grid gap-5 md:grid-cols-2">

                        {jobs.map((job) => (

                            <div
                                key={job._id}
                                className={`rounded-3xl border p-6 backdrop-blur-xl transition-all duration-300 ${
                                    darkMode
                                        ? "border-white/10 bg-white/[0.045] shadow-xl shadow-black/20 hover:-translate-y-1 hover:border-blue-500/20"
                                        : "border-slate-200 bg-white/90 shadow-sm hover:-translate-y-1 hover:shadow-lg"
                                }`}
                            >

                                {/* ================= JOB HEADER ================= */}

                                <div className="flex items-start justify-between gap-4">

                                    <div>

                                        <div
                                            className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${
                                                darkMode
                                                    ? "bg-violet-500/10 text-violet-400"
                                                    : "bg-violet-50 text-violet-600"
                                            }`}
                                        >
                                            ◆
                                        </div>

                                        <h2 className="text-xl font-bold">
                                            {job.title}
                                        </h2>

                                    </div>


                                    <span
                                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                                            darkMode
                                                ? "bg-blue-500/10 text-blue-400"
                                                : "bg-blue-50 text-blue-600"
                                        }`}
                                    >
                                        {job.employmentType}
                                    </span>

                                </div>


                                {/* ================= DESCRIPTION ================= */}

                                <p
                                    className={`mt-5 text-sm leading-6 ${
                                        darkMode
                                            ? "text-slate-400"
                                            : "text-slate-500"
                                    }`}
                                >
                                    {job.description}
                                </p>


                                {/* ================= JOB DETAILS ================= */}

                                <div className="mt-6 grid grid-cols-2 gap-3">

                                    <div
                                        className={`rounded-2xl p-4 ${
                                            darkMode
                                                ? "bg-white/[0.03]"
                                                : "bg-slate-50"
                                        }`}
                                    >

                                        <p className="text-xs text-slate-500">
                                            Employment Type
                                        </p>

                                        <p className="mt-1 text-sm font-semibold">
                                            {job.employmentType}
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
                                            Job ID
                                        </p>

                                        <p className="mt-1 break-all font-mono text-xs text-slate-500">
                                            {job._id}
                                        </p>

                                    </div>

                                </div>


                                {/* ================= ACTIONS ================= */}

                                <div
                                    className={`mt-6 flex flex-col gap-3 border-t pt-5 ${
                                        darkMode
                                            ? "border-white/10"
                                            : "border-slate-100"
                                    }`}
                                >

                                    <button
                                        onClick={() =>
                                            navigate(
                                                `/organisation/jobs/${job._id}/applications`
                                            )
                                        }
                                        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                                    >
                                        View Applicants →
                                    </button>


                                    <button
                                        onClick={() =>
                                            handleDelete(job._id)
                                        }
                                        className={`w-full rounded-xl border py-3 font-semibold transition-all duration-300 ${
                                            darkMode
                                                ? "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10"
                                                : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                        }`}
                                    >
                                        Remove Job
                                    </button>

                                </div>

                            </div>

                        ))}

                    </div>

                )}

            </div>

        </div>

    );
}

export default MyJobs;