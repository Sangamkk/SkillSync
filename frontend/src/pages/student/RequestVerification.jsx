import { useState, useEffect } from "react";
import { getStudentProjects, updateProjectStatus } from "../../services/projectService";
import { getVerifiedOrganisations } from "../../services/adminService";
import { createProjectVerificationRequest, getStudentRequests } from "../../services/requestService";
import ApplicantManagerAbi from "../../abhi/ApplicantManager.json";
import MeshBackground from "../../components/common/MeshBackground";
import { Link, useSearchParams } from "react-router-dom";
import { ethers } from "ethers";

const normalizeProjectId = (value) => {
    if (!value) return null;
    const normalized = String(value).startsWith("0x") ? String(value) : `0x${String(value)}`;
    return normalized.toLowerCase();
};

const formatProjectId = (value) => {
    if (!value) return "—";
    const normalized = String(value).startsWith("0x") ? String(value) : `0x${String(value)}`;
    return normalized.length > 22 ? `${normalized.slice(0, 12)}...${normalized.slice(-10)}` : normalized;
};

const RequestVerification = () => {
    const [projects, setProjects] = useState([]);
    const [organisations, setOrganisations] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedOrgWallet, setSelectedOrgWallet] = useState("");
    const [selectedOrgName, setSelectedOrgName] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [projectHistory, setProjectHistory] = useState([]);
    const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });
    const [searchParams] = useSearchParams();

    const [darkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadProjectHistory = async (project) => {
        if (!project) {
            setProjectHistory([]);
            return;
        }

        const projectHash = normalizeProjectId(project.githubHash || project.projectHash || project.id);
        if (!projectHash) {
            setProjectHistory([]);
            return;
        }

        try {
            const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com");
            const contract = new ethers.Contract(
                import.meta.env.VITE_APPLICANT_MANAGER_ADDRESS,
                ApplicantManagerAbi.abi,
                provider
            );
            const verifications = await contract.getProjectVerifications(projectHash);
            const history = (verifications || []).map((entry) => ({
                verifier: entry.verifier,
                verifiedAt: Number(entry.verifiedAt),
                revoked: Boolean(entry.revoked),
                label: entry.revoked ? "REVOKED" : "VERIFIED"
            }));
            setProjectHistory(history);
        } catch (error) {
            console.warn("Unable to fetch project verification history:", error);
            setProjectHistory([]);
        }
    };

    const loadData = async () => {
        setFetching(true);
        try {
            const [myProjects, orgs] = await Promise.all([
                getStudentProjects().catch(() => []),
                getVerifiedOrganisations().catch(() => [])
            ]);

            const registered = (myProjects || []).filter(
                (p) => p.onChainRegistered || (p.txHash && p.txHash.length > 0)
            );

            setProjects(registered);
            setOrganisations(orgs || []);

            const incomingProjectId = searchParams.get("projectId");
            if (incomingProjectId) {
                const preselected = registered.find((project) => {
                    const targetHash = normalizeProjectId(project.githubHash || project.projectHash);
                    const targetId = project._id;
                    return targetHash === normalizeProjectId(incomingProjectId) || targetId === incomingProjectId;
                });

                if (preselected) {
                    setSelectedProjectId(preselected._id);
                    setSelectedProject(preselected);
                    await loadProjectHistory(preselected);
                }
            }
        } catch (err) {
            console.error("Error loading verification data:", err);
        } finally {
            setFetching(false);
        }
    };

    const handleProjectSelect = async (e) => {
        const id = e.target.value;
        setSelectedProjectId(id);
        const proj = projects.find((p) => p._id === id);
        setSelectedProject(proj || null);
        await loadProjectHistory(proj || null);
    };

    const handleOrgSelect = async (e) => {
        const wallet = e.target.value;
        setSelectedOrgWallet(wallet);
        const org = organisations.find((o) => o.walletAddress === wallet);
        setSelectedOrgName(org?.organisationName || "");

        if (selectedProject && wallet) {
            const studentRequests = await getStudentRequests().catch(() => []);
            const projectHash = normalizeProjectId(selectedProject.githubHash || selectedProject.projectHash);
            const duplicatePending = studentRequests.some((request) => {
                return (
                    normalizeProjectId(request.credentialHash) === projectHash &&
                    request.expectedVerifier?.toLowerCase() === wallet.toLowerCase() &&
                    Number(request.status) === 0
                );
            });

            if (duplicatePending) {
                setStatusMessage({
                    type: "error",
                    text: "A pending request already exists for this project and organisation. Please choose a different organisation."
                });
            } else {
                setStatusMessage({ type: "", text: "" });
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatusMessage({ type: "", text: "" });

        if (!selectedProject) {
            setStatusMessage({ type: "error", text: "Please select a registered project." });
            return;
        }

        if (!selectedOrgWallet) {
            setStatusMessage({ type: "error", text: "Please select a verifying organisation." });
            return;
        }

        const projectHash = normalizeProjectId(selectedProject.githubHash || selectedProject.projectHash);
        const studentRequests = await getStudentRequests().catch(() => []);
        const duplicatePending = studentRequests.some((request) => {
            return (
                normalizeProjectId(request.credentialHash) === projectHash &&
                request.expectedVerifier?.toLowerCase() === selectedOrgWallet.toLowerCase() &&
                Number(request.status) === 0
            );
        });

        if (duplicatePending) {
            setStatusMessage({
                type: "error",
                text: "This organisation already has an active pending request for this project. Please choose a different organisation."
            });
            return;
        }

        setLoading(true);
        try {
            const projectHashToSubmit = projectHash || (selectedProject.githubHash || selectedProject.projectHash);
            const normalizedHash = projectHashToSubmit.startsWith("0x") ? projectHashToSubmit : `0x${projectHashToSubmit}`;

            setStatusMessage({
                type: "info",
                text: "Creating on-chain verification request on RequestManager... Please confirm in MetaMask."
            });

            const txHash = await createProjectVerificationRequest(
                normalizedHash,
                selectedOrgWallet,
                0
            );

            console.log("Verification request tx:", txHash);

            await updateProjectStatus(selectedProject._id, "PENDING", txHash, "", {
                issuer: selectedOrgName,
                issuerWallet: selectedOrgWallet
            });

            setStatusMessage({
                type: "success",
                text: `✓ Verification request submitted successfully on-chain! Tx: ${txHash.slice(0, 16)}...`
            });

            setSelectedProjectId("");
            setSelectedProject(null);
            setSelectedOrgWallet("");
            setSelectedOrgName("");
            setProjectHistory([]);

            loadData();

        } catch (error) {
            console.error("Request verification error:", error);
            const errMsg = error.code === 4001 || error.action === "sendTransaction"
                ? "Verification request cancelled."
                : (error.shortMessage || error.reason || error.message || "Failed to create verification request");
            setStatusMessage({ type: "error", text: `❌ ${errMsg}` });
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
                                Step 2 of 2
                            </span>
                            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
                                Request Project Verification
                            </h1>
                            <p className="mt-2 text-sm text-slate-400">
                                Submit an on-chain verification request for an existing registered project to an organization.
                            </p>
                        </div>

                        <Link
                            to="/student/project/add"
                            className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20"
                        >
                            ← Add New Project
                        </Link>
                    </div>

                    {fetching ? (
                        <div className="p-8 text-center text-sm text-slate-400">
                            Loading your registered projects...
                        </div>
                    ) : projects.length === 0 ? (
                        <div className={`rounded-2xl border p-8 text-center ${darkMode ? "border-white/10 bg-black/20" : "border-slate-200 bg-slate-50"}`}>
                            <p className="text-sm font-semibold text-amber-400">No On-Chain Registered Projects Found</p>
                            <p className="mt-2 text-xs text-slate-400">
                                You must register a project on the blockchain first before requesting verification.
                            </p>
                            <Link
                                to="/student/project/add"
                                className="mt-4 inline-block rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-violet-500"
                            >
                                Register a Project On-Chain →
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="mb-2 block text-sm font-semibold">
                                    Select Registered Project *
                                </label>
                                <select
                                    value={selectedProjectId}
                                    onChange={handleProjectSelect}
                                    className={`w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition ${
                                        darkMode
                                            ? "border-white/10 bg-[#111827] text-white focus:border-violet-500/60"
                                            : "border-slate-200 bg-white text-slate-900 focus:border-violet-500/60"
                                    }`}
                                    required
                                >
                                    <option value="">Select a Project</option>
                                    {projects.map((proj) => (
                                        <option key={proj._id} value={proj._id}>
                                            {proj.projectName} ({proj.projectType}) — Status: {proj.status}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedProject && (
                                <div className={`rounded-2xl border p-5 space-y-2 text-xs ${darkMode ? "border-violet-500/20 bg-violet-500/[0.03]" : "border-violet-200 bg-violet-50/50"}`}>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-violet-300">{selectedProject.projectName}</h3>
                                        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-bold text-emerald-400">
                                            Registered On-Chain ✓
                                        </span>
                                    </div>
                                    <p><span className="font-semibold text-slate-400">Project ID:</span> <span className="font-mono text-[10px] text-slate-200">{formatProjectId(selectedProject.githubHash || selectedProject.projectHash)}</span></p>
                                    <p><span className="font-semibold text-slate-400">Type:</span> {selectedProject.projectType}</p>
                                    <p><span className="font-semibold text-slate-400">GitHub:</span> <a href={selectedProject.githubLink} target="_blank" rel="noopener noreferrer" className="text-violet-400 underline">{selectedProject.githubLink}</a></p>
                                    {selectedProject.description && <p><span className="font-semibold text-slate-400">Description:</span> {selectedProject.description}</p>}
                                </div>
                            )}

                            {selectedProject && (
                                <div className={`rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-[#0b1020]" : "border-slate-200 bg-slate-50"}`}>
                                    <h3 className="mb-3 text-sm font-bold">Existing Verifications</h3>
                                    {projectHistory.length === 0 ? (
                                        <p className="text-xs text-slate-400">No blockchain verification records yet for this project.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {projectHistory.map((entry, index) => (
                                                <div key={`${entry.verifier}-${index}`} className={`rounded-xl border p-3 ${darkMode ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-white"}`}>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-xs font-semibold text-slate-200">{entry.verifier}</p>
                                                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                                                            entry.label === "VERIFIED"
                                                                ? "bg-emerald-500/10 text-emerald-400"
                                                                : entry.label === "REVOKED"
                                                                ? "bg-rose-500/10 text-rose-400"
                                                                : "bg-amber-500/10 text-amber-400"
                                                        }`}>
                                                            {entry.label}
                                                        </span>
                                                    </div>
                                                    {entry.verifiedAt > 0 && (
                                                        <p className="mt-1 text-[10px] text-slate-400">Timestamp: {new Date(entry.verifiedAt * 1000).toLocaleString()}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="mb-2 block text-sm font-semibold">
                                    Select Verifying Organisation *
                                </label>
                                <select
                                    value={selectedOrgWallet}
                                    onChange={handleOrgSelect}
                                    className={`w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition ${
                                        darkMode
                                            ? "border-white/10 bg-[#111827] text-white focus:border-violet-500/60"
                                            : "border-slate-200 bg-white text-slate-900 focus:border-violet-500/60"
                                    }`}
                                    required
                                >
                                    <option value="">Select an Organisation</option>
                                    {organisations.map((org) => (
                                        <option key={org._id} value={org.walletAddress}>
                                            {org.organisationName} ({org.organisationType})
                                        </option>
                                    ))}
                                </select>
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
                                {loading ? "Creating Request On-Chain..." : "Request Verification"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RequestVerification;
