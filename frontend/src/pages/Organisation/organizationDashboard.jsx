import { useEffect, useState } from "react";

import {
    getIssuerRequests,
    approveVerificationRequest,
    rejectVerificationRequest
} from "../../services/requestService"
import {
    getCertificateByHash,
    getCertificateDocument,
    updateCertificateStatus
} from "../../services/certificateService";
import { getPendingProjects } from "../../services/projectService";
import { getMyJobs, getOrganisationEmployees } from "../../services/employmentService";
import { CredentialType, RequestType } from "../../utils/enums";
import MeshBackground from "../../components/common/MeshBackground";
import { Link } from "react-router-dom";
import { mlBackend } from "../../services/mlServices";
import { useNavigate } from "react-router-dom";

const OrganisationRequests = () => {

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [actionMessage, setActionMessage] = useState({ id: null, text: "", type: "" });
    const [orgStats, setOrgStats] = useState({
        pendingCerts: 0,
        pendingProjects: 0,
        myJobs: 0,
        myEmployees: 0
    });

    const [darkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });

    useEffect(() => {
        loadRequestsAndStats();
    }, []);
    const navigate = useNavigate();

    const loadRequestsAndStats = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadRequests(),
                loadOrgStats()
            ]);
        } catch (err) {
            console.error("Error loading dashboard data:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadOrgStats = async () => {
        try {
            const [pendingProjs, jobs, employees] = await Promise.all([
                getPendingProjects().catch(() => []),
                getMyJobs().catch(() => []),
                getOrganisationEmployees().catch(() => [])
            ]);

            setOrgStats({
                pendingProjects: (pendingProjs || []).length,
                myJobs: (jobs || []).length,
                myEmployees: (employees || []).length
            });
        } catch (err) {
            console.error("Error loading org stats:", err);
        }
    };

    const loadRequests = async () => {
        setLoading(true);
        console.log("Loading Requests...");

        try {
            const blockchainRequests = await getIssuerRequests();
            console.log("Blockchain Requests:", blockchainRequests);

            const data = [];

            for (const request of blockchainRequests) {
                console.log("Request:", request);

                if (Number(request.credentialType) !== CredentialType.Certificate) {
                    continue;
                }

                try {
                    const certificate = await getCertificateByHash(
                        request.credentialHash
                    );

                    console.log("Certificate:", certificate);

                    if (certificate) {
                        data.push({
                            request,
                            certificate,
                        });
                    }
                } catch (certErr) {
                    console.error("Error loading cert for request:", certErr);
                }
            }

            console.log("Final Data:", data);
            setRequests(data);
        } catch (error) {
            console.error("Failed to load requests:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewCertificate = async (certificateHash) => {
        const documentWindow = window.open("about:blank", "_blank");
        console.log("Certificate document window:", { isNull: documentWindow === null });

        if (!documentWindow) {
            console.error("Certificate document window was blocked by the browser.");
            return;
        }

        documentWindow.opener = null;

        try {
            const documentUrl = await getCertificateDocument(certificateHash);
            documentWindow.location.href = documentUrl;
        } catch (error) {
            console.error("Error loading certificate document:", error);
            documentWindow.close();
        }
    };

    const handleApprove = async (item) => {
        const reqId = item.request.id.toString();
        setProcessingId(reqId);
        setActionMessage({ id: reqId, text: "Prompting MetaMask transaction...", type: "info" });

        try {
            setActionMessage({ id: reqId, text: "Waiting for blockchain confirmation...", type: "info" });
            const txHash = await approveVerificationRequest(item.request.id);

            setActionMessage({ id: reqId, text: "Synchronizing database status...", type: "info" });
            await updateCertificateStatus(item.certificate.certificateHash, "Verified", txHash);

            setActionMessage({ id: reqId, text: `✓ Certificate Verified on-chain! Tx: ${txHash.slice(0, 14)}...`, type: "success" });
            setTimeout(() => {
                loadRequests();
                setActionMessage({ id: null, text: "", type: "" });
            }, 1500);
        } catch (error) {
            console.error("Certificate approval error:", error);
            const errText = error.shortMessage || error.reason || error.message || "Approval failed";
            setActionMessage({ id: reqId, text: `❌ ${errText}`, type: "error" });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (item) => {
        const reason = window.prompt("Reason for certificate rejection:", "Document verification failed");
        if (reason === null) return;

        const reqId = item.request.id.toString();
        setProcessingId(reqId);
        setActionMessage({ id: reqId, text: "Prompting MetaMask transaction to reject...", type: "info" });

        try {
            setActionMessage({ id: reqId, text: "Waiting for blockchain confirmation...", type: "info" });
            const txHash = await rejectVerificationRequest(item.request.id);

            setActionMessage({ id: reqId, text: "Updating database status...", type: "info" });
            await updateCertificateStatus(item.certificate.certificateHash, "Rejected", txHash, reason);

            setActionMessage({ id: reqId, text: "Certificate Request Rejected.", type: "success" });
            setTimeout(() => {
                loadRequests();
                setActionMessage({ id: null, text: "", type: "" });
            }, 1500);
        } catch (error) {
            console.error("Certificate rejection error:", error);
            const errText = error.shortMessage || error.reason || error.message || "Rejection failed";
            setActionMessage({ id: reqId, text: `❌ ${errText}`, type: "error" });
        } finally {
            setProcessingId(null);
        }
    };

    const handleDirectPredict = async (item) => {
        try {
            const certificateId = item.certificate._id;
            const result = await mlBackend(certificateId);
            console.log("Prediction result:", result);
            alert(`Prediction: ${result.prediction.label} Confidence: ${(result.prediction.confidence * 100).toFixed(2)}%`);
        } catch (error) {
            console.error(
                "Direct prediction error:",
                error.response?.data || error.message
            );
        }
    };

    const handleExtractCertificate = (item) => {

        const certificateId = item.certificate._id;

        navigate(`/organisation/extract-certificate/${certificateId}`);

    };


    return (

        <div
            className={`relative min-h-screen overflow-hidden px-6 py-10 transition-colors duration-500 ${darkMode
                ? "bg-[#070B14] text-white"
                : "bg-[#F6F8FC] text-slate-900"
                }`}
        >

            {/* ================= MESH BACKGROUND ================= */}

            <MeshBackground darkMode={darkMode} />


            {/* ================= BACKGROUND GLOW ================= */}

            <div
                className={`pointer-events-none fixed -left-40 -top-40 h-96 w-96 rounded-full blur-[130px] ${darkMode
                    ? "bg-blue-600/15"
                    : "bg-blue-500/10"
                    }`}
            />

            <div
                className={`pointer-events-none fixed -bottom-40 -right-40 h-96 w-96 rounded-full blur-[130px] ${darkMode
                    ? "bg-violet-600/15"
                    : "bg-violet-500/10"
                    }`}
            />


            {/* ================= MAIN CONTENT ================= */}

            <div className="relative z-10 mx-auto max-w-6xl">


                {/* ================= HEADER ================= */}

                <div className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">

                    <div>

                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">
                            Organisation Portal
                        </p>

                        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                            Dashboard & Verification
                        </h1>

                        <p
                            className={`mt-2 max-w-2xl text-sm leading-6 ${darkMode
                                ? "text-slate-400"
                                : "text-slate-500"
                                }`}
                        >
                            Review pending credentials, verify projects, and manage employment offers.
                        </p>

                    </div>

                    <div className="flex flex-wrap gap-2 sm:items-center">
                        <Link
                            to="/organisation/project"
                            className="rounded-xl bg-blue-600/90 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-600"
                        >
                            📂 Pending Projects {orgStats.pendingProjects > 0 && `(${orgStats.pendingProjects})`}
                        </Link>
                        <Link
                            to="/organisation/jobs/new"
                            className="rounded-xl bg-violet-600/90 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-600"
                        >
                            ➕ Post Job
                        </Link>
                        <Link
                            to="/organisation/jobs"
                            className="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                        >
                            💼 My Jobs ({orgStats.myJobs})
                        </Link>
                        <Link
                            to="/organisation/employees"
                            className="rounded-xl bg-emerald-600/90 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
                        >
                            👥 Employees ({orgStats.myEmployees})
                        </Link>
                        <Link to="/organisation/certificates" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500">📜 Certificates</Link>
                    </div>

                </div>

                {/* ================= ORGANISATION STATS CARDS ================= */}
                <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className={`rounded-2xl border p-5 backdrop-blur-xl ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white shadow-sm"}`}>
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Certificate Requests</p>
                            <span className="text-lg">📜</span>
                        </div>
                        <div className="mt-3 flex items-baseline justify-between">
                            <p className="text-2xl font-bold">{requests.length}</p>
                            <span className="text-xs font-semibold text-violet-400">Pending Review</span>
                        </div>
                    </div>

                    <div className={`rounded-2xl border p-5 backdrop-blur-xl ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white shadow-sm"}`}>
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Project Requests</p>
                            <span className="text-lg">📂</span>
                        </div>
                        <div className="mt-3 flex items-baseline justify-between">
                            <p className="text-2xl font-bold">{orgStats.pendingProjects}</p>
                            <span className="text-xs font-semibold text-blue-400">Awaiting Verification</span>
                        </div>
                    </div>

                    <div className={`rounded-2xl border p-5 backdrop-blur-xl ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white shadow-sm"}`}>
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Postings</p>
                            <span className="text-lg">💼</span>
                        </div>
                        <div className="mt-3 flex items-baseline justify-between">
                            <p className="text-2xl font-bold">{orgStats.myJobs}</p>
                            <span className="text-xs text-slate-400">Published Jobs</span>
                        </div>
                    </div>

                    <div className={`rounded-2xl border p-5 backdrop-blur-xl ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white shadow-sm"}`}>
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Employees</p>
                            <span className="text-lg">👥</span>
                        </div>
                        <div className="mt-3 flex items-baseline justify-between">
                            <p className="text-2xl font-bold">{orgStats.myEmployees}</p>
                            <span className="text-xs font-semibold text-emerald-400">Active Team</span>
                        </div>
                    </div>
                </div>


                {/* ================= REQUEST COUNT ================= */}

                <div
                    className={`mb-6 inline-flex items-center gap-3 rounded-2xl border px-5 py-3 ${darkMode
                        ? "border-white/10 bg-white/[0.04]"
                        : "border-slate-200 bg-white shadow-sm"
                        }`}
                >

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                        ✓
                    </div>

                    <div>

                        <p className="text-xs text-slate-500">
                            Pending Requests
                        </p>

                        <p className="text-lg font-bold">
                            {requests.length}
                        </p>

                    </div>

                </div>


                {/* ================= EMPTY STATE ================= */}

                {requests.length === 0 && (

                    <div
                        className={`rounded-3xl border p-12 text-center backdrop-blur-xl ${darkMode
                            ? "border-white/10 bg-white/[0.04]"
                            : "border-slate-200 bg-white/80 shadow-sm"
                            }`}
                    >

                        <div
                            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-2xl ${darkMode
                                ? "bg-violet-500/10"
                                : "bg-violet-50"
                                }`}
                        >
                            📜
                        </div>

                        <h2 className="mt-5 text-xl font-bold">
                            No Requests Found
                        </h2>

                        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                            Certificate verification requests will
                            appear here when they are submitted.
                        </p>

                    </div>

                )}


                {/* ================= REQUESTS ================= */}

                {requests.length > 0 && (

                    <div className="grid gap-6 md:grid-cols-2">

                        {requests.map((item, index) => (

                            <div
                                key={index}
                                className={`rounded-3xl border p-6 backdrop-blur-xl transition-all duration-300 ${darkMode
                                    ? "border-white/10 bg-white/[0.045] shadow-xl shadow-black/20 hover:-translate-y-1 hover:border-violet-500/20"
                                    : "border-slate-200 bg-white/85 shadow-sm hover:-translate-y-1 hover:shadow-lg"
                                    }`}
                            >

                                {/* Card Header */}

                                <div className="flex items-start justify-between gap-4">

                                    <div
                                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${darkMode
                                            ? "bg-violet-500/10 text-violet-400"
                                            : "bg-violet-50 text-violet-600"
                                            }`}
                                    >
                                        📜
                                    </div>

                                    {item.request.status === 1 || item.certificate.verificationStatus === "Verified" ? (
                                        <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                                            ✓ VERIFIED
                                        </span>
                                    ) : item.request.status === 2 || item.certificate.verificationStatus === "Rejected" ? (
                                        <span className="rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400">
                                            REJECTED
                                        </span>
                                    ) : (
                                        <span
                                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${darkMode
                                                ? "bg-amber-500/10 text-amber-400"
                                                : "bg-amber-50 text-amber-600"
                                                }`}
                                        >
                                            PENDING VERIFICATION
                                        </span>
                                    )}

                                </div>


                                {/* Certificate Name */}

                                <h2 className="mt-6 text-xl font-bold">
                                    {item.certificate.certificateName}
                                </h2>


                                {/* Details */}

                                <div className="mt-5 space-y-3">

                                    {/* Issuer */}

                                    <div
                                        className={`rounded-2xl p-4 ${darkMode
                                            ? "bg-white/[0.03]"
                                            : "bg-slate-50"
                                            }`}
                                    >

                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            Issuer
                                        </p>

                                        <p className="mt-1 text-sm font-medium">
                                            {item.certificate.issuer}
                                        </p>

                                    </div>


                                    {/* Certificate Type */}

                                    <div
                                        className={`rounded-2xl p-4 ${darkMode
                                            ? "bg-white/[0.03]"
                                            : "bg-slate-50"
                                            }`}
                                    >

                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            Certificate Type
                                        </p>

                                        <p className="mt-1 text-sm font-medium">
                                            {item.certificate.certificateType}
                                        </p>

                                    </div>

                                    {/* Student Wallet */}
                                    <div
                                        className={`rounded-2xl p-4 ${darkMode
                                            ? "bg-white/[0.03]"
                                            : "bg-slate-50"
                                            }`}
                                    >
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            Student Address
                                        </p>
                                        <p className="mt-1 break-all font-mono text-xs text-slate-400">
                                            {item.request.student}
                                        </p>
                                    </div>

                                </div>

                                {/* ACTION FEEDBACK */}
                                {actionMessage.id === item.request.id.toString() && actionMessage.text && (
                                    <div
                                        className={`mt-4 rounded-2xl p-3 text-xs font-medium ${actionMessage.type === "success"
                                            ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                            : actionMessage.type === "error"
                                                ? "border border-red-500/30 bg-red-500/10 text-red-400"
                                                : "border border-blue-500/30 bg-blue-500/10 text-blue-400"
                                            }`}
                                    >
                                        {actionMessage.text}
                                    </div>
                                )}


                                {/* View Certificate */}

                                <button
                                    type="button"
                                    onClick={() => handleViewCertificate(item.certificate.certificateHash)}
                                    className="mt-6 flex w-full items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/5 py-3 text-sm font-semibold text-violet-400 transition-all hover:bg-violet-500/10"
                                >
                                    View Certificate Document ↗
                                </button>

                                {/* ML ANALYSIS BUTTONS */}

                                {Number(item.request.status) === 0 && (
                                    <div className="mt-4 grid grid-cols-2 gap-3">

                                        {/* DIRECT PREDICTION */}

                                        <button
                                            type="button"
                                            onClick={() => handleDirectPredict(item)}
                                            className={`rounded-xl py-3 text-sm font-semibold transition-all duration-300 ${darkMode
                                                ? "border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                                                : "border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                }`}
                                        >
                                            🤖 Direct Predict
                                        </button>


                                        {/* EXTRACTION */}

                                        <button
                                            type="button"
                                            onClick={() => handleExtractCertificate(item)}
                                            className={`rounded-xl py-3 text-sm font-semibold transition-all duration-300 ${darkMode
                                                ? "border border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
                                                : "border border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100"
                                                }`}
                                        >
                                            🔍 Extract Certificate
                                        </button>

                                    </div>
                                )}

                                {/* ACTION BUTTONS */}
                                {Number(item.request.credentialType) === CredentialType.Certificate &&
                                    Number(item.request.requestType) === RequestType.AddCertificate &&
                                    Number(item.request.status) === 0 &&
                                    item.certificate.verificationStatus !== "Verified" &&
                                    item.certificate.verificationStatus !== "Rejected" &&
                                    item.certificate.verificationStatus !== "Cancelled" && (
                                        <div className="mt-4 flex gap-3">
                                            <button
                                                disabled={processingId === item.request.id.toString()}
                                                onClick={() => handleApprove(item)}
                                                className={`flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${processingId === item.request.id.toString() ? "cursor-not-allowed opacity-60" : ""
                                                    }`}
                                            >
                                                {processingId === item.request.id.toString() ? "Verifying..." : "✓ Approve & Verify On-Chain"}
                                            </button>
                                            <button
                                                disabled={processingId === item.request.id.toString()}
                                                onClick={() => handleReject(item)}
                                                className={`rounded-xl border px-5 py-3 text-sm font-semibold transition-all duration-300 ${darkMode
                                                    ? "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10"
                                                    : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                                    } ${processingId === item.request.id.toString() ? "cursor-not-allowed opacity-60" : ""}`}
                                            >
                                                Reject
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
};

export default OrganisationRequests;