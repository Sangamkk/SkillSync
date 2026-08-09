import { useState } from "react";
import { createJob } from "../../services/employmentService";
import MeshBackground from "../../components/common/MeshBackground";

function CreateJob() {

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        requiredSkills: "",
        employmentType: "Internship",
        location: "",
        stipend: "",
    });

    const [darkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });


    const handleChange = (e) => {

        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });

    };


    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            await createJob({
                ...formData,

                requiredSkills: formData.requiredSkills
                    .split(",")
                    .map((skill) => skill.trim())
                    .filter(Boolean),
            });


            alert("Job Created");


            setFormData({
                title: "",
                description: "",
                requiredSkills: "",
                employmentType: "Internship",
                location: "",
                stipend: "",
            });

        } catch (error) {

            console.error(error);
            alert("Failed to create job");

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

            <div className="relative z-10 mx-auto max-w-4xl">


                {/* ================= HEADER ================= */}

                <div className="mb-8">

                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                        Recruitment
                    </p>

                    <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                        Create Job
                    </h1>

                    <p
                        className={`mt-3 max-w-2xl text-sm leading-6 ${
                            darkMode
                                ? "text-slate-400"
                                : "text-slate-500"
                        }`}
                    >
                        Publish a new opportunity and let qualified
                        candidates discover your organisation.
                    </p>

                </div>


                {/* ================= FORM CARD ================= */}

                <div
                    className={`rounded-3xl border p-7 shadow-2xl backdrop-blur-xl sm:p-9 ${
                        darkMode
                            ? "border-white/10 bg-white/[0.045] shadow-black/30"
                            : "border-slate-200 bg-white/90 shadow-slate-200/70"
                    }`}
                >


                    {/* CARD HEADER */}

                    <div
                        className={`mb-8 flex items-center gap-4 border-b pb-6 ${
                            darkMode
                                ? "border-white/10"
                                : "border-slate-200"
                        }`}
                    >

                        <div
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${
                                darkMode
                                    ? "bg-violet-500/10 text-violet-400"
                                    : "bg-violet-50 text-violet-600"
                            }`}
                        >
                            +
                        </div>

                        <div>

                            <h2 className="text-lg font-semibold">
                                Job Details
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Provide the details candidates need
                                before applying.
                            </p>

                        </div>

                    </div>


                    {/* ================= FORM ================= */}

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-6"
                    >


                        {/* JOB TITLE */}

                        <div>

                            <label
                                className={`mb-2 block text-sm font-semibold ${
                                    darkMode
                                        ? "text-slate-300"
                                        : "text-slate-700"
                                }`}
                            >
                                Job Title
                            </label>

                            <input
                                type="text"
                                name="title"
                                placeholder="Frontend Developer"
                                value={formData.title}
                                onChange={handleChange}
                                required
                                className={`w-full rounded-xl border px-4 py-3.5 outline-none transition ${
                                    darkMode
                                        ? "border-white/10 bg-white/[0.04] text-white placeholder-slate-600 focus:border-blue-500/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-blue-500/10"
                                        : "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                }`}
                            />

                        </div>


                        {/* DESCRIPTION */}

                        <div>

                            <label
                                className={`mb-2 block text-sm font-semibold ${
                                    darkMode
                                        ? "text-slate-300"
                                        : "text-slate-700"
                                }`}
                            >
                                Job Description
                            </label>

                            <textarea
                                name="description"
                                placeholder="Describe the role, responsibilities and expectations..."
                                value={formData.description}
                                onChange={handleChange}
                                required
                                rows="6"
                                className={`w-full resize-none rounded-xl border px-4 py-3.5 outline-none transition ${
                                    darkMode
                                        ? "border-white/10 bg-white/[0.04] text-white placeholder-slate-600 focus:border-blue-500/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-blue-500/10"
                                        : "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                }`}
                            />

                        </div>


                        {/* REQUIRED SKILLS */}

                        <div>

                            <label
                                className={`mb-2 block text-sm font-semibold ${
                                    darkMode
                                        ? "text-slate-300"
                                        : "text-slate-700"
                                }`}
                            >
                                Required Skills
                            </label>

                            <input
                                type="text"
                                name="requiredSkills"
                                placeholder="React, Node.js, MongoDB"
                                value={formData.requiredSkills}
                                onChange={handleChange}
                                className={`w-full rounded-xl border px-4 py-3.5 outline-none transition ${
                                    darkMode
                                        ? "border-white/10 bg-white/[0.04] text-white placeholder-slate-600 focus:border-blue-500/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-blue-500/10"
                                        : "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                }`}
                            />

                            <p className="mt-2 text-xs text-slate-500">
                                Separate multiple skills using commas.
                            </p>

                        </div>


                        {/* EMPLOYMENT TYPE */}

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
                                name="employmentType"
                                value={formData.employmentType}
                                onChange={handleChange}
                                className={`w-full rounded-xl border px-4 py-3.5 outline-none transition ${
                                    darkMode
                                        ? "border-white/10 bg-[#111722] text-white focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10"
                                        : "border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                }`}
                            >

                                <option value="Internship">
                                    Internship
                                </option>

                                <option value="FullTime">
                                    Full Time
                                </option>

                                <option value="PartTime">
                                    Part Time
                                </option>

                            </select>

                        </div>


                        {/* LOCATION + STIPEND */}

                        <div className="grid gap-6 sm:grid-cols-2">


                            {/* LOCATION */}

                            <div>

                                <label
                                    className={`mb-2 block text-sm font-semibold ${
                                        darkMode
                                            ? "text-slate-300"
                                            : "text-slate-700"
                                    }`}
                                >
                                    Location
                                </label>

                                <input
                                    type="text"
                                    name="location"
                                    placeholder="Bengaluru / Remote"
                                    value={formData.location}
                                    onChange={handleChange}
                                    className={`w-full rounded-xl border px-4 py-3.5 outline-none transition ${
                                        darkMode
                                            ? "border-white/10 bg-white/[0.04] text-white placeholder-slate-600 focus:border-blue-500/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-blue-500/10"
                                            : "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                    }`}
                                />

                            </div>


                            {/* STIPEND */}

                            <div>

                                <label
                                    className={`mb-2 block text-sm font-semibold ${
                                        darkMode
                                            ? "text-slate-300"
                                            : "text-slate-700"
                                    }`}
                                >
                                    Stipend
                                </label>

                                <input
                                    type="number"
                                    name="stipend"
                                    placeholder="25000"
                                    value={formData.stipend}
                                    onChange={handleChange}
                                    className={`w-full rounded-xl border px-4 py-3.5 outline-none transition ${
                                        darkMode
                                            ? "border-white/10 bg-white/[0.04] text-white placeholder-slate-600 focus:border-blue-500/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-blue-500/10"
                                            : "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                    }`}
                                />

                            </div>

                        </div>


                        {/* ================= SUBMIT ================= */}

                        <div
                            className={`border-t pt-7 ${
                                darkMode
                                    ? "border-white/10"
                                    : "border-slate-200"
                            }`}
                        >

                            <button
                                type="submit"
                                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30"
                            >
                                Create Job
                            </button>

                            <p className="mt-3 text-center text-xs text-slate-500">
                                Your job will be published for eligible
                                candidates.
                            </p>

                        </div>

                    </form>

                </div>

            </div>

        </div>

    );
}

export default CreateJob;