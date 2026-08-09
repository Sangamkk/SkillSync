import { useEffect, useState } from "react";
import { getAllJobs, applyToJob } from "../../services/employmentService";
import MeshBackground from "../../components/common/MeshBackground";

function Jobs() {

    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    const [darkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });


    useEffect(() => {
        fetchJobs();
    }, []);


    async function fetchJobs() {

        try {

            const jobs = await getAllJobs();

            setJobs(jobs);

        } catch (err) {

            console.error(err);

        } finally {

            setLoading(false);

        }

    }


    async function handleApply(jobId) {

        try {

            await applyToJob(jobId);

            alert("Applied Successfully");

        } catch (err) {

            console.error(err);

        }

    }


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
                        Finding opportunities...
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
                        Opportunities
                    </p>

                    <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                        Explore Jobs
                    </h1>

                    <p
                        className={`mt-3 max-w-2xl text-sm leading-6 ${
                            darkMode
                                ? "text-slate-400"
                                : "text-slate-500"
                        }`}
                    >
                        Discover internships and employment
                        opportunities from verified organisations.
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
                            Available Opportunities
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
                            🔎
                        </div>

                        <h2 className="mt-5 text-xl font-bold">
                            No Jobs Available
                        </h2>

                        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                            There are currently no opportunities
                            available. Check back later.
                        </p>

                    </div>

                ) : (

                    /* ================= JOB CARDS ================= */

                    <div className="grid gap-5 md:grid-cols-2">

                        {jobs.map((job) => (

                            <div
                                key={job._id}
                                className={`group rounded-3xl border p-6 backdrop-blur-xl transition-all duration-300 ${
                                    darkMode
                                        ? "border-white/10 bg-white/[0.045] shadow-xl shadow-black/20 hover:-translate-y-1 hover:border-blue-500/20"
                                        : "border-slate-200 bg-white/85 shadow-sm hover:-translate-y-1 hover:shadow-lg"
                                }`}
                            >

                                {/* ================= TOP ================= */}

                                <div className="flex items-start justify-between gap-4">

                                    <div
                                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                                            darkMode
                                                ? "bg-blue-500/10 text-blue-400"
                                                : "bg-blue-50 text-blue-600"
                                        }`}
                                    >
                                        💼
                                    </div>


                                    <span
                                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                            darkMode
                                                ? "bg-violet-500/10 text-violet-400"
                                                : "bg-violet-50 text-violet-600"
                                        }`}
                                    >
                                        {job.employmentType}
                                    </span>

                                </div>


                                {/* ================= TITLE ================= */}

                                <h2
                                    className={`mt-6 text-xl font-bold ${
                                        darkMode
                                            ? "text-white"
                                            : "text-slate-900"
                                    }`}
                                >
                                    {job.title}
                                </h2>


                                {/* ================= DESCRIPTION ================= */}

                                <p
                                    className={`mt-3 text-sm leading-6 ${
                                        darkMode
                                            ? "text-slate-400"
                                            : "text-slate-500"
                                    }`}
                                >
                                    {job.description}
                                </p>


                                {/* ================= SKILLS ================= */}

                                <div className="mt-6">

                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Required Skills
                                    </p>

                                    <div className="mt-3 flex flex-wrap gap-2">

                                        {job.requiredSkills?.map(
                                            (skill, index) => (

                                                <span
                                                    key={index}
                                                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                                                        darkMode
                                                            ? "bg-white/[0.06] text-slate-300"
                                                            : "bg-slate-100 text-slate-600"
                                                    }`}
                                                >
                                                    {skill}
                                                </span>

                                            )
                                        )}

                                    </div>

                                </div>


                                {/* ================= DIVIDER ================= */}

                                <div
                                    className={`my-6 border-t ${
                                        darkMode
                                            ? "border-white/10"
                                            : "border-slate-100"
                                    }`}
                                />


                                {/* ================= APPLY ================= */}

                                <button
                                    onClick={() =>
                                        handleApply(job._id)
                                    }
                                    className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30"
                                >
                                    Apply Now →
                                </button>

                            </div>

                        ))}

                    </div>

                )}

            </div>

        </div>

    );
}

export default Jobs;