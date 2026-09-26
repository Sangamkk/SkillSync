import { useState } from "react";
import { createProject } from "../../services/projectService";
import MeshBackground from "../../components/common/MeshBackground";
import { Link } from "react-router-dom";


const AddProject = () => {

    const [formData, setFormData] = useState({
        projectName: "",
        projectType: "Academic",
        githubLink: "",
        description: ""
    });
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

    const [darkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatusMessage({ type: "", text: "" });
        setLoading(true);

        try {
            const data = {
                projectName: formData.projectName,
                description: formData.description,
                githubLink: formData.githubLink,
                projectType: formData.projectType
            };

            setStatusMessage({ type: "info", text: "Saving project…" });
            const response = await createProject(data);

            // Backend automatically hashes and registers the project on-chain.
            // No MetaMask required.
            const txHash = response?.project?.transactionHash || response?.transactionHash || "";

            setStatusMessage({
                type: "success",
                text: txHash
                    ? `✓ Project submitted! Tx: ${txHash.slice(0, 16)}…`
                    : "✓ Project submitted successfully."
            });

            setFormData({
                projectName: "",
                projectType: "Academic",
                githubLink: "",
                description: ""
            });

        } catch (error) {
            console.error("Project creation error:", error);
            const errText = error.response?.data?.message || error.message || "Failed to create project";
            setStatusMessage({
                type: "error",
                text: `❌ ${errText}`
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className={`relative min-h-screen overflow-hidden px-6 py-10 transition-colors duration-500 ${
                darkMode ? "bg-[#070B14] text-white" : "bg-[#F6F8FC] text-slate-900"
            }`}
        >
            <MeshBackground darkMode={darkMode} />

            <div className="relative z-10 mx-auto max-w-3xl">
                <div
                    className={`rounded-3xl border p-8 backdrop-blur-xl ${
                        darkMode
                            ? "border-white/10 bg-white/[0.045] shadow-2xl shadow-black/30"
                            : "border-slate-200 bg-white/90 shadow-xl"
                    }`}
                >
                    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
                                Step 1 of 2
                            </span>
                            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
                                Add Project
                            </h1>
                            <p className="mt-2 text-sm text-slate-400">
                                Register your project repository directly on the ApplicantManager smart contract.
                            </p>
                        </div>

                        <Link
                            to="/student/project/verify"
                            className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20"
                        >
                            Request Verification →
                        </Link>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="mb-2 block text-sm font-semibold">
                                Project Name *
                            </label>
                            <input
                                type="text"
                                name="projectName"
                                value={formData.projectName}
                                onChange={handleChange}
                                placeholder="e.g. SkillSync Blockchain Platform"
                                className={`w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition ${
                                    darkMode
                                        ? "border-white/10 bg-white/[0.05] text-white focus:border-violet-500/60"
                                        : "border-slate-200 bg-white text-slate-900 focus:border-violet-500/60"
                                }`}
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold">
                                Project Type *
                            </label>
                            <select
                                name="projectType"
                                value={formData.projectType}
                                onChange={handleChange}
                                className={`w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition ${
                                    darkMode
                                        ? "border-white/10 bg-[#111827] text-white focus:border-violet-500/60"
                                        : "border-slate-200 bg-white text-slate-900 focus:border-violet-500/60"
                                }`}
                            >
                                <option value="Academic">Academic Project</option>
                                <option value="Personal">Personal Project</option>
                                <option value="Internship">Internship Project</option>
                                <option value="OpenSource">Open Source Contribution</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold">
                                GitHub Repository URL *
                            </label>
                            <input
                                type="url"
                                name="githubLink"
                                value={formData.githubLink}
                                onChange={handleChange}
                                placeholder="https://github.com/username/repository"
                                className={`w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition ${
                                    darkMode
                                        ? "border-white/10 bg-white/[0.05] text-white focus:border-violet-500/60"
                                        : "border-slate-200 bg-white text-slate-900 focus:border-violet-500/60"
                                }`}
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold">
                                Description
                            </label>
                            <textarea
                                name="description"
                                rows="4"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Describe the project goals, architecture, tech stack..."
                                className={`w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition ${
                                    darkMode
                                        ? "border-white/10 bg-white/[0.05] text-white focus:border-violet-500/60"
                                        : "border-slate-200 bg-white text-slate-900 focus:border-violet-500/60"
                                }`}
                            />
                        </div>

                        {statusMessage.text && (
                            <div
                                className={`rounded-2xl p-4 text-sm font-medium ${
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

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-500/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30 ${
                                loading ? "cursor-not-allowed opacity-60" : ""
                            }`}
                        >
                            {loading ? "Registering On-Chain..." : "Add Project"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddProject;