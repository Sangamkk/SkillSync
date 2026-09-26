import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  getPendingRequests,
  approveRequest,
  rejectRequest,
} from "../../services/verificationService";
import { getCertificateDocument } from "../../services/certificateService";
import MeshBackground from "../../components/common/MeshBackground";

const PendingVerifications = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [msg, setMsg] = useState({ id: null, text: "", type: "" });
  const [darkMode] = useState(() => localStorage.getItem("skillsync-theme") !== "light");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPendingRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load pending verifications error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (req) => {
    const id = req._id || req.id;
    setProcessing(id);
    setMsg({ id, text: "Processing approval…", type: "info" });
    try {
      const result = await approveRequest(id);
      const txHash = result?.transactionHash || result?.txHash;
      setMsg({
        id,
        text: txHash ? `✓ Approved · Tx: ${txHash.slice(0, 14)}…` : "✓ Verification approved.",
        type: "success",
      });
      setTimeout(() => { load(); setMsg({ id: null, text: "", type: "" }); }, 1800);
    } catch (err) {
      setMsg({ id, text: `❌ ${err.response?.data?.message || err.message}`, type: "error" });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (req) => {
    const reason = window.prompt("Reason for rejection:", "");
    if (reason === null) return;
    const id = req._id || req.id;
    setProcessing(id);
    setMsg({ id, text: "Processing rejection…", type: "info" });
    try {
      await rejectRequest(id, reason);
      setMsg({ id, text: "✓ Request rejected.", type: "success" });
      setTimeout(() => { load(); setMsg({ id: null, text: "", type: "" }); }, 1800);
    } catch (err) {
      setMsg({ id, text: `❌ ${err.response?.data?.message || err.message}`, type: "error" });
    } finally {
      setProcessing(null);
    }
  };

  const handleViewDoc = async (hash) => {
    if (!hash) return;
    const w = window.open("about:blank", "_blank");
    if (!w) {
      alert("Popup blocked by browser. Please allow popups for this site.");
      return;
    }
    w.opener = null;
    try {
      const url = await getCertificateDocument(hash);
      w.location.href = url;
    } catch {
      w.close();
      alert("Unable to load document.");
    }
  };

  const base = darkMode ? "min-h-screen bg-gray-950 text-white" : "min-h-screen bg-slate-50 text-gray-900";
  const card = darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white shadow-sm";

  return (
    <div className={`relative ${base}`}>
      <MeshBackground darkMode={darkMode} />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <Link to="/organisation" className={`text-xs mb-3 inline-block ${darkMode ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}>
            ← Dashboard
          </Link>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-500 mb-1">Organisation</p>
          <h1 className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>Pending Verifications</h1>
          <p className={`text-sm mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
            Review and approve or reject student certificate verification requests.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-10 text-gray-400">
            <span className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            Loading requests…
          </div>
        ) : requests.length === 0 ? (
          <div className={`rounded-2xl border p-12 text-center ${card}`}>
            <p className="text-3xl mb-3">🎉</p>
            <p className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>No pending verification requests</p>
            <p className={`text-sm mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>All caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const id = req._id || req.id;
              const isProcessing = processing === id;
              const reqMsg = msg.id === id ? msg : null;
              return (
                <div key={id} className={`rounded-2xl border p-5 ${card}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                        {req.certificateName || req.certificate?.certificateName || "Certificate Request"}
                      </p>
                      <p className={`text-sm mt-0.5 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Student: {req.studentName || req.student?.name || "—"}
                      </p>
                      <p className={`text-xs mt-0.5 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                        Type: {req.requestType || "Certificate Verification"}
                      </p>
                      {req.certificateHash && (
                        <p className="text-xs font-mono text-violet-400 mt-1 truncate">
                          {req.certificateHash.slice(0, 20)}…
                        </p>
                      )}
                      {req.transactionHash && (
                        <p className="text-xs font-mono text-emerald-400 mt-0.5">
                          tx: {req.transactionHash.slice(0, 14)}…
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {(req.certificateHash || req.certificate?.certificateHash) && (
                        <button
                          type="button"
                          onClick={() => handleViewDoc(req.certificateHash || req.certificate?.certificateHash)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-all"
                        >
                          View Doc
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleApprove(req)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50 transition-all"
                      >
                        {isProcessing ? "…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleReject(req)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  {reqMsg && (
                    <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${
                      reqMsg.type === "success"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : reqMsg.type === "error"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-blue-500/10 text-blue-400"
                    }`}>
                      {reqMsg.text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingVerifications;
