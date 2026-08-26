import { useEffect, useState } from "react";
import { getPendingProjects, updateProjectStatus } from "../../services/projectService";
import {
    getIssuerRequests,
    approveVerificationRequest,
    rejectVerificationRequest
} from "../../services/requestService";
import MeshBackground from "../../components/common/MeshBackground";
import { Link } from "react-router-dom";

const PendingProjects = () => {

    const [projects, setProjects] = useState([]);
    const [issuerRequests, setIssuerRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [statusMessage, setStatusMessage] = useState({ id: null, text: "", type: "" });

    const [darkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pendingData, reqs] = await Promise.all([
                getPendingProjects().catch(() => []),
                getIssuerRequests().catch(() => [])
            ]);
            console.log("Pending Projects:", pendingData);
            console.log("Issuer on-chain requests:", reqs);
            setProjects(pendingData || []);
            setIssuerRequests(reqs || []);
        } catch (error) {
            console.error("Failed to load pending projects:", error);
        } finally {
            setLoading(false);
        }
    };

    const findOnChainRequestId = (project) => {
        const rawHash = (project.githubHash || "").toLowerCase();
        const formattedHash = rawHash.startsWith("0x") ? rawHash : "0x" + rawHash;

        const matchedReq = issuerRequests.find((r) => {
            const rHash = (r.credentialHash || "").toLowerCase();
            return rHash === formattedHash || rHash === rawHash;
        });

        return matchedReq ? matchedReq.id : null;
    };

    const handleApprove = async (project) => {
        const projId = project._id;
        setProcessingId(projId);
        setStatusMessage({ id: projId, text: "Finding on-chain verification request...", type: "info" });

        try {
            const reqId = findOnChainRequestId(project);
            if (reqId === null || reqId === undefined) {
                throw new Error("No matching on-chain verification request was found for this project.");
            }

            setStatusMessage({
                id: projId,
                text: `Prompting MetaMask to approve request #${reqId.toString()} on-chain...`,
                type: "info"
            });

            const txHash = await approveVerificationRequest(reqId);
            console.log("On-chain approval tx:", txHash);

            setStatusMessage({ id: projId, text: "Updating database verification status...", type: "info" });
            await updateProjectStatus(projId, "APPROVED", txHash, "");

            setStatusMessage({
                id: projId,
                text: `✓ Project verified successfully. Tx: ${txHash.slice(0, 14)}...`,
                type: "success"
            });

            setTimeout(() => {
                loadData();
                setStatusMessage({ id: null, text: "", type: "" });
            }, 1500);
        } catch (error) {
            console.error("Project approval error:", error);
            const errText = error.shortMessage || error.reason || error.message || "Approval failed";
            setStatusMessage({ id: projId, text: `❌ ${errText}`, type: "error" });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (project) => {
        const reason = window.prompt(
            "Enter reason for rejection:",
            "Project does not meet repository standards or verification criteria."
        );

        if (reason === null || String(reason).trim() === "") {
            setStatusMessage({ id: project._id, text: "❌ Rejection reason is required.", type: "error" });
            return;
        }

        const projId = project._id;
        setProcessingId(projId);
        setStatusMessage({ id: projId, text: "Processing rejection...", type: "info" });

        try {
            const reqId = findOnChainRequestId(project);
            if (reqId === null || reqId === undefined) {
                throw new Error("No matching on-chain verification request was found for this project.");
            }

            setStatusMessage({
                id: projId,
                text: `Prompting MetaMask to reject request #${reqId.toString()} on-chain...`,
                type: "info"
            });

            const txHash = await rejectVerificationRequest(reqId);
            console.log("On-chain rejection tx:", txHash);

            await updateProjectStatus(projId, "REJECTED", txHash, reason);

            setStatusMessage({ id: projId, text: "Project verification rejected.", type: "success" });

            setTimeout(() => {
                loadData();
                setStatusMessage({ id: null, text: "", type: "" });
            }, 1500);
        } catch (error) {
            console.error("Project rejection error:", error);
            const errText = error.shortMessage || error.reason || error.message || "Rejection failed";
            setStatusMessage({ id: projId, text: `❌ ${errText}`, type: "error" });
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div
            className={`relative min-h-screen overflow-hidden px-6 py-10 transition-colors duration-500 ${
                darkMode ? "bg-[#070B14] text-white" : "bg-[#F6F8FC] text-slate-900"
            }`}
        >
            <MeshBackground darkMode={darkMode} />

            <div className="relative z-10 mx-auto max-w-6xl">
                {/* Header */}
                <div
                    className={`mb-8 rounded-3xl border p-7 backdrop-blur-xl ${
                        darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/85 shadow-sm"
                    }`}
                >
                    <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
                                Organisation Portal
                            </p>
                            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                                Pending Project Verifications
                            </h1>
                            <p className="mt-2 max-w-xl text-sm text-slate-400">
                                Review student GitHub repositories and attest to project completion on-chain.
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            <Link
                                to="/organisation"
                                className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-2.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20"
                            >
                                ← Certificate Requests
                            </Link>

                            <div
                                className={`flex h-16 min-w-16 flex-col items-center justify-center rounded-2xl border ${
                                    darkMode ? "border-violet-500/20 bg-violet-500/10" : "border-violet-200 bg-violet-50"
                                }`}
                            >
                                <span className="text-xl font-bold text-violet-400">{projects.length}</span>
                                <span className="text-[10px] text-slate-400">Pending</span>
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-400">Loading pending projects...</div>
                ) : projects.length === 0 ? (
                    <div
                        className={`rounded-3xl border p-12 text-center backdrop-blur-xl ${
                            darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/85 shadow-sm"
                        }`}
                    >
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl text-emerald-500">
                            ✓
                        </div>
                        <h2 className="mt-5 text-xl font-semibold">No Pending Projects</h2>
                        <p className="mt-2 text-sm text-slate-400">
                            All student project verification requests have been processed.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                        {projects.map((project) => {
                            const onChainId = findOnChainRequestId(project);
                            return (
                                <div
                                    key={project._id}
                                    className={`rounded-3xl border p-6 backdrop-blur-xl transition duration-300 ${
                                        darkMode
                                            ? "border-white/10 bg-white/[0.045] shadow-xl hover:-translate-y-1 hover:border-violet-500/20"
                                            : "border-slate-200 bg-white/85 shadow-sm hover:-translate-y-1 hover:shadow-lg"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div
                                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                                                darkMode ? "bg-violet-500/10 text-violet-400" : "bg-violet-50 text-violet-600"
                                            }`}
                                        >
                                            💻
                                        </div>
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                                darkMode ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"
                                            }`}
                                        >
                                            PENDING VERIFICATION
                                        </span>
                                    </div>

                                    <h2 className="mt-5 text-xl font-bold">{project.projectName}</h2>
                                    <p className="mt-2 text-sm text-slate-400">{project.description || "No description provided."}</p>

                                    <div className="mt-5 space-y-2 text-xs">
                                        <div className={`rounded-xl p-3 ${darkMode ? "bg-white/[0.03]" : "bg-slate-50"}`}>
                                            <span className="font-semibold text-slate-500">Student: </span>
                                            <span className="font-medium text-slate-200">
                                                {project.student?.name} {project.student?.usn ? `(${project.student.usn})` : ""}
                                            </span>
                                        </div>

                                        <div className={`rounded-xl p-3 ${darkMode ? "bg-white/[0.03]" : "bg-slate-50"}`}>
                                            <span className="font-semibold text-slate-500">Student Wallet: </span>
                                            <span className="font-medium text-slate-200 break-all">{project.student?.walletAddress || "—"}</span>
                                        </div>

                                        <div className={`rounded-xl p-3 ${darkMode ? "bg-white/[0.03]" : "bg-slate-50"}`}>
                                            <span className="font-semibold text-slate-500">Project ID: </span>
                                            <span className="font-medium font-mono text-[10px] text-slate-200 break-all">{project.githubHash ? (project.githubHash.startsWith("0x") ? project.githubHash : `0x${project.githubHash}`) : "—"}</span>
                                        </div>

                                        <div className={`rounded-xl p-3 ${darkMode ? "bg-white/[0.03]" : "bg-slate-50"}`}>
                                            <span className="font-semibold text-slate-500">Type: </span>
                                            <span className="font-medium text-slate-200">{project.projectType}</span>
                                            {onChainId !== null && onChainId !== undefined && (
                                                <span className="ml-2 rounded bg-violet-500/20 px-2 py-0.5 font-mono text-[10px] text-violet-300">
                                                    Req #{onChainId.toString()}
                                                </span>
                                            )}
                                        </div>

                                        <div className={`rounded-xl p-3 ${darkMode ? "bg-white/[0.03]" : "bg-slate-50"}`}>
                                            <span className="font-semibold text-slate-500">Requested: </span>
                                            <span className="font-medium text-slate-200">{project.createdAt ? new Date(project.createdAt).toLocaleString() : "—"}</span>
                                        </div>
                                    </div>

                                    {statusMessage.id === project._id && statusMessage.text && (
                                        <div
                                            className={`mt-4 rounded-2xl p-3 text-xs font-medium ${
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

                                    <a
                                        href={project.githubLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-5 flex w-full items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/5 py-3 text-xs font-semibold text-violet-400 transition hover:bg-violet-500/10"
                                    >
                                        Inspect GitHub Repository ↗
                                    </a>

                                    <div className="mt-4 flex gap-3">
                                        <button
                                            disabled={processingId === project._id}
                                            onClick={() => handleApprove(project)}
                                            className={`flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 py-3 text-xs font-semibold text-white shadow-lg shadow-emerald-500/10 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl ${
                                                processingId === project._id ? "cursor-not-allowed opacity-60" : ""
                                            }`}
                                        >
                                            {processingId === project._id ? "Verifying..." : "✓ Approve & Verify On-Chain"}
                                        </button>
                                        <button
                                            disabled={processingId === project._id}
                                            onClick={() => handleReject(project)}
                                            className={`rounded-xl border px-4 py-3 text-xs font-semibold transition duration-300 ${
                                                darkMode
                                                    ? "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10"
                                                    : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                            } ${processingId === project._id ? "cursor-not-allowed opacity-60" : ""}`}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PendingProjects;