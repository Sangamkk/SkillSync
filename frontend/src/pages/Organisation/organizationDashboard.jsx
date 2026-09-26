import { useEffect, useState } from "react";
import {
    getPendingRequests,
    getOrganisationRequestHistory,
    approveRequest,
    rejectRequest
} from "../../services/verificationService";
import {
    getCertificateByHash,
    getCertificateDocument,
    updateCertificateStatus,
    getIssuedCertificates,
} from "../../services/certificateService";
import { getPendingProjects } from "../../services/projectService";
import { getMyJobs, getOrganisationEmployees } from "../../services/employmentService";
import MeshBackground from "../../components/common/MeshBackground";
import { Link, useNavigate } from "react-router-dom";
import { mlBackend } from "../../services/mlServices";
import { CredentialType, RequestType } from "../../utils/enums";

const formatHash = (h) => {
    if (!h) return "—";
    return h.length > 20 ? `${h.slice(0, 10)}...${h.slice(-8)}` : h;
};

const getStudentDisplay = (student) => {
    if (!student) return "—";
    if (typeof student === "string") return student;
    const name = student.name || "Student";
    const extra = student.email || student.usn || "";
    return extra ? `${name} (${extra})` : name;
};

const OrganisationRequests = () => {
    const [activeTab, setActiveTab] = useState("pending"); // "pending" | "history" | "issued"
    const [requests, setRequests] = useState([]);
    const [historyRequests, setHistoryRequests] = useState([]);
    const [issuedCertificates, setIssuedCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [actionMessage, setActionMessage] = useState({ id: null, text: "", type: "" });
    const [orgStats, setOrgStats] = useState({
        pendingProjects: 0,
        myJobs: 0,
        myEmployees: 0
    });

    const [darkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });

    const navigate = useNavigate();

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadRequests(),
                loadHistoryRequests(),
                loadIssuedCertificates(),
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
        try {
            const pending = await getPendingRequests().catch(() => []);
            const reqList = Array.isArray(pending) ? pending : [];

            const data = [];
            for (const request of reqList) {
                let certificate = (request.certificate && typeof request.certificate === "object" && request.certificate.certificateName)
                    ? request.certificate
                    : null;

                if (!certificate) {
                    const certHash = request.certificateHash || request.credentialHash || request.certificate?.certificateHash;
                    if (certHash) {
                        try {
                            certificate = await getCertificateByHash(certHash).catch(() => null);
                        } catch {
                            certificate = null;
                        }
                    }
                }

                data.push({ request, certificate: certificate || {} });
            }

            setRequests(data);
        } catch (error) {
            console.error("Failed to load requests:", error);
            setRequests([]);
        }
    };

    const loadHistoryRequests = async () => {
        try {
            const data = await getOrganisationRequestHistory().catch(() => []);
            setHistoryRequests(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load past request history:", err);
            setHistoryRequests([]);
        }
    };

    const loadIssuedCertificates = async () => {
        try {
            const certs = await getIssuedCertificates().catch(() => []);
            setIssuedCertificates(Array.isArray(certs) ? certs : []);
        } catch (err) {
            console.error("Failed to load issued certificates:", err);
            setIssuedCertificates([]);
        }
    };

    const handleViewCertificate = async (certificateHash, fallbackUrl) => {
        const hash = typeof certificateHash === "object"
            ? (certificateHash?.certificateHash || certificateHash?._id)
            : certificateHash;

        const directUrl = typeof certificateHash === "object"
            ? certificateHash?.certificateURL
            : fallbackUrl;

        if (!hash && !directUrl) {
            alert("No certificate hash or document available.");
            return;
        }

        const documentWindow = window.open("about:blank", "_blank");
        if (!documentWindow) {
            alert("Popup blocked by browser. Please allow popups for this site.");
            return;
        }

        documentWindow.opener = null;
        try {
            documentWindow.document.write(`
                <html>
                    <head><title>Loading Certificate...</title></head>
                    <body style="background:#070B14;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui,sans-serif;">
                        <div style="text-align:center;">
                            <div style="width:36px;height:36px;border:3px solid #8b5cf6;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px;"></div>
                            <p style="font-size:14px;color:#94a3b8;">Loading certificate document for viewing...</p>
                        </div>
                        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
                    </body>
                </html>
            `);
        } catch {
            // Ignore if blocked
        }

        try {
            if (hash) {
                try {
                    const documentUrl = await getCertificateDocument(hash);
                    documentWindow.location.href = documentUrl;
                    return;
                } catch (streamErr) {
                    console.warn("Document stream failed, trying direct URL:", streamErr);
                }
            }

            if (directUrl) {
                documentWindow.location.href = directUrl;
                return;
            }

            throw new Error("Document could not be retrieved.");
        } catch (error) {
            console.error("Error loading certificate document:", error);
            documentWindow.close();
            alert("Failed to load certificate document: " + (error.response?.data?.message || error.message));
        }
    };

    const handleApprove = async (item) => {
        const reqId = (item.request._id || item.request.id || "").toString();
        setProcessingId(reqId);
        setActionMessage({ id: reqId, text: "Processing approval on-chain…", type: "info" });

        try {
            const result = await approveRequest(reqId);
            const txHash = result?.transactionHash || result?.txHash || "";
            setActionMessage({
                id: reqId,
                text: txHash
                    ? `✓ Approved! Tx: ${txHash.slice(0, 14)}…`
                    : "✓ Verification approved successfully on-chain.",
                type: "success"
            });
            setTimeout(async () => {
                await Promise.all([loadRequests(), loadHistoryRequests(), loadOrgStats()]);
                setActionMessage({ id: null, text: "", type: "" });
            }, 1500);
        } catch (error) {
            console.error("Certificate approval error:", error);
            const errText = error.response?.data?.message || error.message || "Approval failed";
            setActionMessage({ id: reqId, text: `❌ ${errText}`, type: "error" });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (item) => {
        const reason = window.prompt("Reason for certificate rejection:", "Document verification failed");
        if (reason === null) return;

        const reqId = (item.request._id || item.request.id || "").toString();
        setProcessingId(reqId);
        setActionMessage({ id: reqId, text: "Processing rejection…", type: "info" });

        try {
            await rejectRequest(reqId, reason);
            setActionMessage({ id: reqId, text: "Certificate request rejected.", type: "success" });
            setTimeout(async () => {
                await Promise.all([loadRequests(), loadHistoryRequests(), loadOrgStats()]);
                setActionMessage({ id: null, text: "", type: "" });
            }, 1500);
        } catch (error) {
            console.error("Certificate rejection error:", error);
            const errText = error.response?.data?.message || error.message || "Rejection failed";
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
            {/* Background */}
            <MeshBackground darkMode={darkMode} />

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

            {/* Main Content */}
            <div className="relative z-10 mx-auto max-w-6xl">

                {/* Header */}
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
                            Verify pending credentials, review past request history, and manage blockchain-issued certificates.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:items-center">
                        <Link
                            to="/organisation/issue-certificate"
                            className="rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition hover:opacity-90"
                        >
                            📜 Issue Certificate
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
                    </div>
                </div>

                {/* Organisation Stats Cards */}
                <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div
                        onClick={() => setActiveTab("pending")}
                        className={`cursor-pointer rounded-2xl border p-5 backdrop-blur-xl transition-all hover:scale-[1.02] ${
                            activeTab === "pending"
                                ? "border-violet-500/50 ring-2 ring-violet-500/30"
                                : darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white shadow-sm"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Requests</p>
                            <span className="text-lg">⏳</span>
                        </div>
                        <div className="mt-3 flex items-baseline justify-between">
                            <p className="text-2xl font-bold">{requests.length}</p>
                            <span className="text-xs font-semibold text-amber-400">Needs Review</span>
                        </div>
                    </div>

                    <div
                        onClick={() => setActiveTab("history")}
                        className={`cursor-pointer rounded-2xl border p-5 backdrop-blur-xl transition-all hover:scale-[1.02] ${
                            activeTab === "history"
                                ? "border-violet-500/50 ring-2 ring-violet-500/30"
                                : darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white shadow-sm"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Request History</p>
                            <span className="text-lg">📜</span>
                        </div>
                        <div className="mt-3 flex items-baseline justify-between">
                            <p className="text-2xl font-bold">{historyRequests.length}</p>
                            <span className="text-xs font-semibold text-violet-400">Past Decisions</span>
                        </div>
                    </div>

                    <div
                        onClick={() => setActiveTab("issued")}
                        className={`cursor-pointer rounded-2xl border p-5 backdrop-blur-xl transition-all hover:scale-[1.02] ${
                            activeTab === "issued"
                                ? "border-violet-500/50 ring-2 ring-violet-500/30"
                                : darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white shadow-sm"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Issued Certificates</p>
                            <span className="text-lg">🎓</span>
                        </div>
                        <div className="mt-3 flex items-baseline justify-between">
                            <p className="text-2xl font-bold">{issuedCertificates.length}</p>
                            <span className="text-xs font-semibold text-emerald-400">On-Chain Registry</span>
                        </div>
                    </div>

                    <div className={`rounded-2xl border p-5 backdrop-blur-xl ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white shadow-sm"}`}>
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Jobs & Team</p>
                            <span className="text-lg">💼</span>
                        </div>
                        <div className="mt-3 flex items-baseline justify-between">
                            <p className="text-2xl font-bold">{orgStats.myJobs} / {orgStats.myEmployees}</p>
                            <span className="text-xs text-slate-400">Jobs · Employees</span>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
                    <button
                        type="button"
                        onClick={() => setActiveTab("pending")}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === "pending"
                                ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
                                : darkMode
                                ? "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                        }`}
                    >
                        <span>⏳ Pending Requests</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            activeTab === "pending" ? "bg-white/20 text-white" : "bg-violet-500/20 text-violet-400"
                        }`}>
                            {requests.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("history")}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === "history"
                                ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
                                : darkMode
                                ? "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                        }`}
                    >
                        <span>📜 Past Request History</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            activeTab === "history" ? "bg-white/20 text-white" : "bg-slate-500/20 text-slate-400"
                        }`}>
                            {historyRequests.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("issued")}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === "issued"
                                ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
                                : darkMode
                                ? "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                        }`}
                    >
                        <span>🎓 Issued Certificate History</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            activeTab === "issued" ? "bg-white/20 text-white" : "bg-emerald-500/20 text-emerald-400"
                        }`}>
                            {issuedCertificates.length}
                        </span>
                    </button>
                </div>

                {/* Loading indicator */}
                {loading && (
                    <div className="py-16 text-center text-slate-400">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                        <p className="mt-3 text-sm">Loading records...</p>
                    </div>
                )}

                {/* ================= TAB 1: PENDING REQUESTS ================= */}
                {!loading && activeTab === "pending" && (
                    <>
                        {requests.length === 0 ? (
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
                                    ✨
                                </div>
                                <h2 className="mt-5 text-xl font-bold">No Pending Requests</h2>
                                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                                    All submitted verification requests have been processed. New student submissions will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2">
                                {requests.map((item, index) => {
                                    const reqId = (item.request?._id || item.request?.id || index).toString();
                                    const isPending =
                                        item.request?.status === "Pending" ||
                                        item.request?.status === undefined ||
                                        Number(item.request?.status) === 0;

                                    const isCertificateRequest =
                                        !item.request?.requestType ||
                                        item.request?.requestType === "certificate" ||
                                        Number(item.request?.requestType) === RequestType.AddCertificate;

                                    const studentDisplay = getStudentDisplay(item.request?.student);

                                    return (
                                        <div
                                            key={reqId}
                                            className={`rounded-3xl border p-6 backdrop-blur-xl transition-all duration-300 ${darkMode
                                                ? "border-white/10 bg-white/[0.045] shadow-xl shadow-black/20 hover:-translate-y-1 hover:border-violet-500/20"
                                                : "border-slate-200 bg-white/85 shadow-sm hover:-translate-y-1 hover:shadow-lg"
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div
                                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${darkMode
                                                        ? "bg-violet-500/10 text-violet-400"
                                                        : "bg-violet-50 text-violet-600"
                                                        }`}
                                                >
                                                    📜
                                                </div>
                                                <span
                                                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${darkMode
                                                        ? "bg-amber-500/10 text-amber-400"
                                                        : "bg-amber-50 text-amber-600"
                                                        }`}
                                                >
                                                    PENDING VERIFICATION
                                                </span>
                                            </div>

                                            <h2 className="mt-6 text-xl font-bold">
                                                {item.certificate?.certificateName || "Certificate Request"}
                                            </h2>

                                            <div className="mt-5 space-y-3">
                                                <div
                                                    className={`rounded-2xl p-4 ${darkMode ? "bg-white/[0.03]" : "bg-slate-50"}`}
                                                >
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Issuer</p>
                                                    <p className="mt-1 text-sm font-medium">{item.certificate?.issuer || "—"}</p>
                                                </div>

                                                <div
                                                    className={`rounded-2xl p-4 ${darkMode ? "bg-white/[0.03]" : "bg-slate-50"}`}
                                                >
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Certificate Type</p>
                                                    <p className="mt-1 text-sm font-medium">
                                                        {item.certificate?.certificateType || item.request?.requestType || "Certificate"}
                                                    </p>
                                                </div>

                                                <div
                                                    className={`rounded-2xl p-4 ${darkMode ? "bg-white/[0.03]" : "bg-slate-50"}`}
                                                >
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Student</p>
                                                    <p className="mt-1 break-all font-mono text-xs text-slate-400">{studentDisplay}</p>
                                                </div>
                                            </div>

                                            {/* Action Feedback */}
                                            {actionMessage.id === reqId && actionMessage.text && (
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

                                            {/* View Certificate Document */}
                                            <button
                                                type="button"
                                                onClick={() => handleViewCertificate(
                                                    item.certificate?.certificateHash || item.request?.credentialHash,
                                                    item.certificate?.certificateURL
                                                )}
                                                className="mt-6 flex w-full items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/5 py-3 text-sm font-semibold text-violet-400 transition-all hover:bg-violet-500/10 cursor-pointer"
                                            >
                                                View Certificate Document ↗
                                            </button>

                                            {/* ML Analysis */}
                                            {isPending && item.certificate?._id && (
                                                <div className="mt-4 grid grid-cols-2 gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDirectPredict(item)}
                                                        className={`rounded-xl py-3 text-sm font-semibold transition-all duration-300 cursor-pointer ${darkMode
                                                            ? "border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                                                            : "border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                            }`}
                                                    >
                                                        🤖 Direct Predict
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleExtractCertificate(item)}
                                                        className={`rounded-xl py-3 text-sm font-semibold transition-all duration-300 cursor-pointer ${darkMode
                                                            ? "border border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
                                                            : "border border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100"
                                                            }`}
                                                    >
                                                        🔍 Extract Certificate
                                                    </button>
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            {isCertificateRequest && isPending && (
                                                <div className="mt-4 flex gap-3">
                                                    <button
                                                        disabled={processingId === reqId}
                                                        onClick={() => handleApprove(item)}
                                                        className={`flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl cursor-pointer ${processingId === reqId ? "cursor-not-allowed opacity-60" : ""
                                                            }`}
                                                    >
                                                        {processingId === reqId ? "Verifying..." : "✓ Approve & Verify On-Chain"}
                                                    </button>
                                                    <button
                                                        disabled={processingId === reqId}
                                                        onClick={() => handleReject(item)}
                                                        className={`rounded-xl border px-5 py-3 text-sm font-semibold transition-all duration-300 cursor-pointer ${darkMode
                                                            ? "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10"
                                                            : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                                            } ${processingId === reqId ? "cursor-not-allowed opacity-60" : ""}`}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* ================= TAB 2: PAST REQUEST HISTORY ================= */}
                {!loading && activeTab === "history" && (
                    <>
                        {historyRequests.length === 0 ? (
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
                                <h2 className="mt-5 text-xl font-bold">No Past Requests</h2>
                                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                                    Requests that your organisation approves or rejects will be archived here with full audit history.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2">
                                {historyRequests.map((req) => {
                                    const cert = req.certificate || {};
                                    const studentDisplay = getStudentDisplay(req.student);
                                    const isApproved = req.status === "Approved" || req.status === "Verified";
                                    const hash = cert.certificateHash || req.credentialHash;

                                    return (
                                        <div
                                            key={req._id}
                                            className={`rounded-3xl border p-6 backdrop-blur-xl transition-all duration-300 ${darkMode
                                                ? "border-white/10 bg-white/[0.045] shadow-xl shadow-black/20 hover:-translate-y-1 hover:border-violet-500/20"
                                                : "border-slate-200 bg-white/85 shadow-sm hover:-translate-y-1 hover:shadow-lg"
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div
                                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                                                        isApproved ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                                    }`}
                                                >
                                                    {isApproved ? "✓" : "✗"}
                                                </div>
                                                <span
                                                    className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase ${
                                                        isApproved
                                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                                            : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                                    }`}
                                                >
                                                    {isApproved ? "✓ VERIFIED / APPROVED" : "REJECTED"}
                                                </span>
                                            </div>

                                            <h2 className="mt-6 text-xl font-bold">
                                                {cert.certificateName || req.project?.projectName || "Verification Request"}
                                            </h2>

                                            <div className="mt-5 space-y-3 text-xs text-slate-400">
                                                <div className={`rounded-2xl p-4 ${darkMode ? "bg-white/[0.03]" : "bg-slate-50"}`}>
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Student</p>
                                                    <p className="mt-1 text-sm font-medium text-white">{studentDisplay}</p>
                                                </div>

                                                <div className={`rounded-2xl p-4 ${darkMode ? "bg-white/[0.03]" : "bg-slate-50"}`}>
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Type & Hash</p>
                                                    <p className="mt-1 text-sm font-medium text-slate-300">
                                                        {cert.certificateType || req.requestType || "Certificate"} · <span className="font-mono text-xs text-violet-300">{formatHash(hash)}</span>
                                                    </p>
                                                </div>

                                                {req.rejectionReason && (
                                                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-rose-400">
                                                        <p className="text-xs font-semibold uppercase tracking-wider">Rejection Reason</p>
                                                        <p className="mt-1 text-sm">{req.rejectionReason}</p>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between text-slate-500 pt-1">
                                                    <span>Decision Date:</span>
                                                    <span>{new Date(req.updatedAt || req.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="mt-6 flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleViewCertificate(hash, cert.certificateURL)}
                                                    className="flex-1 rounded-xl border border-violet-500/20 bg-violet-500/5 py-2.5 text-xs font-semibold text-violet-400 transition hover:bg-violet-500/10 cursor-pointer"
                                                >
                                                    👁️ View Document
                                                </button>

                                                {hash && (
                                                    <Link
                                                        to={`/verify-qr/${hash}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition"
                                                    >
                                                        <span>🔍 Verify On-Chain</span>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* ================= TAB 3: ISSUED CERTIFICATE HISTORY ================= */}
                {!loading && activeTab === "issued" && (
                    <>
                        {issuedCertificates.length === 0 ? (
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
                                    🎓
                                </div>
                                <h2 className="mt-5 text-xl font-bold">No Issued Certificates</h2>
                                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                                    Certificates directly issued by your organisation and recorded on the blockchain will be listed here.
                                </p>
                                <Link
                                    to="/organisation/issue-certificate"
                                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 text-xs font-semibold text-white shadow-lg shadow-violet-500/20 hover:opacity-95"
                                >
                                    📜 Issue New Certificate
                                </Link>
                            </div>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2">
                                {issuedCertificates.map((cert) => {
                                    const studentDisplay = getStudentDisplay(cert.student);
                                    const isRevoked = cert.verificationStatus === "Revoked";
                                    const hash = cert.certificateHash || cert._id;

                                    return (
                                        <div
                                            key={cert._id}
                                            className={`rounded-3xl border p-6 backdrop-blur-xl transition-all duration-300 ${darkMode
                                                ? "border-white/10 bg-white/[0.045] shadow-xl shadow-black/20 hover:-translate-y-1 hover:border-violet-500/20"
                                                : "border-slate-200 bg-white/85 shadow-sm hover:-translate-y-1 hover:shadow-lg"
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div
                                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-violet-300 text-xl"
                                                >
                                                    🎓
                                                </div>
                                                <span
                                                    className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase ${
                                                        isRevoked
                                                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                                    }`}
                                                >
                                                    {isRevoked ? "⊘ REVOKED" : "✓ ON-CHAIN ISSUED"}
                                                </span>
                                            </div>

                                            <h2 className="mt-6 text-xl font-bold">
                                                {cert.certificateName || "Issued Certificate"}
                                            </h2>

                                            <div className="mt-5 space-y-3 text-xs text-slate-400">
                                                <div className={`rounded-2xl p-4 ${darkMode ? "bg-white/[0.03]" : "bg-slate-50"}`}>
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recipient Student</p>
                                                    <p className="mt-1 text-sm font-medium text-white">{studentDisplay}</p>
                                                    {cert.student?.college && (
                                                        <p className="mt-0.5 text-xs text-slate-400">{cert.student.college}</p>
                                                    )}
                                                </div>

                                                <div className={`rounded-2xl p-4 ${darkMode ? "bg-white/[0.03]" : "bg-slate-50"}`}>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Type</p>
                                                            <p className="mt-0.5 text-xs font-medium text-slate-300">{cert.certificateType || "Certificate"}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Issued On</p>
                                                            <p className="mt-0.5 text-xs font-medium text-slate-300">
                                                                {cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className={`rounded-2xl p-4 ${darkMode ? "bg-white/[0.03]" : "bg-slate-50"}`}>
                                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Certificate Hash</p>
                                                    <p className="mt-1 font-mono text-xs text-violet-300 break-all">{formatHash(cert.certificateHash)}</p>
                                                </div>

                                                {cert.txHash && (
                                                    <div className="flex items-center justify-between text-slate-500 pt-1">
                                                        <span>Tx Hash:</span>
                                                        <a
                                                            href={`https://sepolia.etherscan.io/tx/${cert.txHash}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="font-mono text-xs text-blue-400 hover:underline"
                                                        >
                                                            {formatHash(cert.txHash)} ↗
                                                        </a>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="mt-6 flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleViewCertificate(hash, cert.certificateURL)}
                                                    className="flex-1 rounded-xl border border-violet-500/20 bg-violet-500/5 py-2.5 text-xs font-semibold text-violet-400 transition hover:bg-violet-500/10 cursor-pointer"
                                                >
                                                    👁️ View Document
                                                </button>

                                                <Link
                                                    to={`/verify-qr/${hash}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 rounded-xl border border-violet-500/30 bg-violet-600/20 px-3 py-2.5 text-xs font-semibold text-violet-300 hover:bg-violet-600/30 transition"
                                                    title="View scannable QR Code"
                                                >
                                                    <span>📱 QR Code</span>
                                                </Link>

                                                <Link
                                                    to={`/verify/${hash}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition"
                                                >
                                                    <span>🔍 Verify</span>
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

            </div>
        </div>
    );
};

export default OrganisationRequests;