import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStudentProjects } from "../../../services/projectService";
import { getStudentRequests } from "../../../services/requestService";
import ApplicantManagerAbi from "../../../abhi/ApplicantManager.json";
import { ethers } from "ethers";
import MeshBackground from "../../../components/common/MeshBackground";

const formatProjectId = (value) => {
    if (!value) return "—";
    const normalized = String(value).startsWith("0x") ? String(value) : `0x${String(value)}`;
    return normalized.length > 22 ? `${normalized.slice(0, 12)}...${normalized.slice(-10)}` : normalized;
};

const normalizeProjectId = (value) => {
    if (!value) return null;
    const cleaned = String(value).startsWith("0x") ? String(value) : `0x${String(value)}`;
    return cleaned.toLowerCase();
};

const getStatusLabel = (status) => {
    switch (status) {
        case 0:
            return "PENDING";
        case 1:
            return "VERIFIED";
        case 2:
            return "REJECTED";
        case 3:
            return "CANCELLED";
        default:
            return "UNKNOWN";
    }
};

const MyProjects = () => {
    const [projects, setProjects] = useState([]);
    const [requestHistory, setRequestHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [darkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });

    const loadProjects = async () => {
        try {
            setLoading(true);
            setError("");

            const userStr = localStorage.getItem("user");
            const walletAddress = userStr ? JSON.parse(userStr).walletAddress : null;

            const [studentProjects, studentRequests] = await Promise.all([
                getStudentProjects().catch(() => []),
                getStudentRequests().catch(() => [])
            ]);

            const projectList = Array.isArray(studentProjects) ? studentProjects : [];
            const requests = Array.isArray(studentRequests) ? studentRequests : [];

            let blockchainRecords = [];

            if (walletAddress) {
                try {
                    const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com");
                    const contract = new ethers.Contract(
                        import.meta.env.VITE_APPLICANT_MANAGER_ADDRESS,
                        ApplicantManagerAbi.abi,
                        provider
                    );

                    blockchainRecords = await Promise.all(
                        projectList.map(async (project) => {
                            const pid = normalizeProjectId(project.githubHash || project.projectHash);
                            if (!pid) return { projectId: project._id, history: [] };

                            try {
                                const verifications = await contract.getProjectVerifications(pid);
                                return {
                                    projectId: project._id,
                                    projectHash: pid,
                                    history: (verifications || []).map((item) => ({
                                        verifier: item.verifier,
                                        verifiedAt: Number(item.verifiedAt),
                                        revoked: Boolean(item.revoked),
                                        status: item.revoked ? "REVOKED" : "VERIFIED"
                                    }))
                                };
                            } catch (chainErr) {
                                console.warn("Blockchain verification fetch failed for project:", project.projectName, chainErr);
                                return { projectId: project._id, projectHash: pid, history: [] };
                            }
                        })
                    );
                } catch (chainErr) {
                    console.error("Project verification history fetch failed:", chainErr);
                }
            }

            const projectMap = new Map(blockchainRecords.map((entry) => [entry.projectId, entry]));

            const enrichedProjects = projectList.map((project) => {
                const projectHash = normalizeProjectId(project.githubHash || project.projectHash);
                const verificationEntries = (projectMap.get(project._id)?.history || []).map((entry) => ({
                    ...entry,
                    type: "BLOCKCHAIN",
                    label: entry.revoked ? "REVOKED" : "VERIFIED"
                }));

                const requestEntries = requests
                    .filter((req) => normalizeProjectId(req.credentialHash) === projectHash)
                    .map((req) => ({
                        type: "REQUEST",
                        label: getStatusLabel(req.status),
                        requestId: req.id,
                        expectedVerifier: req.expectedVerifier,
                        status: req.status,
                        createdAt: Number(req.createdAt),
                        expiresAt: Number(req.expiresAt),
                        reason: ""
                    }));

                return {
                    ...project,
                    projectHash,
                    verificationHistory: [...verificationEntries, ...requestEntries]
                };
            });

            setProjects(enrichedProjects);
            setRequestHistory(requests);
        } catch (err) {
            console.error("Failed to load student projects:", err);
            setError("Unable to load your projects right now.");
            setProjects([]);
            setRequestHistory([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
    }, []);

    return (
        <div
            className={`relative min-h-screen overflow-hidden px-6 py-10 transition-colors duration-500 ${
                darkMode ? "bg-[#070B14] text-white" : "bg-[#F6F8FC] text-slate-900"
            }`}
        >
            <MeshBackground darkMode={darkMode} />

            <div className="relative z-10 mx-auto max-w-6xl">
                <div
                    className={`mb-8 rounded-3xl border p-7 backdrop-blur-xl ${
                        darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/85 shadow-sm"
                    }`}
                >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
                                Student Projects
                            </p>
                            <h1 className="mt-2 text-3xl font-bold tracking-tight">My Projects</h1>
                            <p className="mt-2 text-sm text-slate-400">
                                Track blockchain registration and verification history for every project.
                            </p>
                        </div>

                        <Link
                            to="/student/project/add"
                            className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-500"
                        >
                            + Add Project
                        </Link>
                    </div>
                </div>

                {requestHistory.length > 0 && (
                    <div className={`mb-8 rounded-3xl border p-6 ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/85"}`}>
                        <h2 className="mb-4 text-xl font-bold">My Verification Requests</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            {requestHistory.map((request) => {
                                const requestStatus = getStatusLabel(request.status);
                                return (
                                    <div key={request.id} className={`rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-[#0b1020]" : "border-slate-200 bg-slate-50"}`}>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-semibold">Request #{request.id}</span>
                                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                                                request.status === 0
                                                    ? "bg-amber-500/10 text-amber-400"
                                                    : request.status === 1
                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                    : request.status === 2
                                                    ? "bg-rose-500/10 text-rose-400"
                                                    : "bg-slate-500/10 text-slate-400"
                                            }`}>
                                                {requestStatus}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm text-slate-400">
                                            Project ID: <span className="font-mono text-[11px] text-slate-200">{formatProjectId(request.credentialHash)}</span>
                                        </p>
                                        <p className="mt-1 text-sm text-slate-400">Verifier: {request.expectedVerifier}</p>
                                        <p className="mt-1 text-sm text-slate-400">Created: {new Date(Number(request.createdAt) * 1000).toLocaleString()}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="rounded-3xl border border-slate-200 bg-white/80 p-10 text-center text-slate-500">
                        Loading your projects...
                    </div>
                ) : error ? (
                    <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
                        {error}
                    </div>
                ) : projects.length === 0 ? (
                    <div
                        className={`rounded-3xl border p-10 text-center backdrop-blur-xl ${
                            darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/85"
                        }`}
                    >
                        <p className="text-lg font-semibold">No projects found</p>
                        <p className="mt-2 text-sm text-slate-400">
                            Add a project to register it on-chain and start verification.
                        </p>
                        <Link
                            to="/student/project/add"
                            className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-500"
                        >
                            Register a Project
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {projects.map((project) => (
                            <div
                                key={project._id}
                                className={`rounded-3xl border p-6 backdrop-blur-xl ${
                                    darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/85 shadow-sm"
                                }`}
                            >
                                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Project</p>
                                            <h2 className="mt-2 text-2xl font-bold">{project.projectName}</h2>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2 text-sm text-slate-400">
                                            <p><span className="font-semibold text-slate-500">Type:</span> {project.projectType}</p>
                                            <p><span className="font-semibold text-slate-500">Project ID:</span> <span className="font-mono text-[11px] text-slate-200">{formatProjectId(project.projectHash || project.githubHash)}</span></p>
                                            <p className="sm:col-span-2"><span className="font-semibold text-slate-500">GitHub:</span> <a href={project.githubLink} target="_blank" rel="noreferrer" className="text-violet-400 underline">{project.githubLink}</a></p>
                                            <p className="sm:col-span-2"><span className="font-semibold text-slate-500">Description:</span> {project.description || "No description provided."}</p>
                                            <p><span className="font-semibold text-slate-500">On-Chain:</span> {project.onChainRegistered ? "✓ Registered" : "Not registered"}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2">
                                        {project.onChainRegistered && (
                                            <Link
                                                to={`/student/project/verify?projectId=${encodeURIComponent(project.projectHash || project.githubHash || project._id)}`}
                                                className="inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500"
                                            >
                                                + Request Verification
                                            </Link>
                                        )}
                                        {!project.onChainRegistered && (
                                            <Link
                                                to="/student/project/verify"
                                                className="inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500"
                                            >
                                                Request Verification
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <h3 className="mb-4 text-lg font-semibold">Verification History</h3>
                                    {(project.verificationHistory || []).length === 0 ? (
                                        <div className={`rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-[#0b1020]" : "border-slate-200 bg-slate-50"}`}>
                                            <p className="text-sm text-slate-400">No verification records yet. Requests can be sent to approved organisations.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {(project.verificationHistory || []).map((entry, index) => (
                                                <div key={`${project._id}-${index}`} className={`rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-[#0b1020]" : "border-slate-200 bg-slate-50"}`}>
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                        <div>
                                                            <p className="text-sm font-semibold">Verification #{index + 1}</p>
                                                            <p className="text-xs text-slate-400">Organization: {entry.verifier || entry.expectedVerifier || "—"}</p>
                                                        </div>
                                                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                                                            entry.label === "VERIFIED"
                                                                ? "bg-emerald-500/10 text-emerald-400"
                                                                : entry.label === "PENDING"
                                                                ? "bg-amber-500/10 text-amber-400"
                                                                : entry.label === "REJECTED"
                                                                ? "bg-rose-500/10 text-rose-400"
                                                                : "bg-slate-500/10 text-slate-400"
                                                        }`}>
                                                            {entry.label || "UNKNOWN"}
                                                        </span>
                                                    </div>

                                                    {entry.verifier && (
                                                        <p className="mt-2 text-xs text-slate-400">Verifier: {entry.verifier}</p>
                                                    )}
                                                    {entry.expectedVerifier && (
                                                        <p className="mt-1 text-xs text-slate-400">Expected Verifier: {entry.expectedVerifier}</p>
                                                    )}
                                                    {entry.requestId && (
                                                        <p className="mt-1 text-xs text-slate-400">Request ID: {entry.requestId}</p>
                                                    )}
                                                    {(entry.verifiedAt || entry.createdAt) && (
                                                        <p className="mt-1 text-xs text-slate-400">Date: {new Date(Number(entry.verifiedAt || entry.createdAt) * 1000).toLocaleString()}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyProjects;
