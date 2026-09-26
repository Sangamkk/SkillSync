import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { verifyCertificate } from "../../services/publicVerificationService";

const STATUS_CONFIG = {
  Verified: { label: "VERIFIED", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", icon: "✓" },
  VERIFIED: { label: "VERIFIED", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", icon: "✓" },
  Pending: { label: "PENDING", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", icon: "⏳" },
  PENDING: { label: "PENDING", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", icon: "⏳" },
  Rejected: { label: "REJECTED", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: "✗" },
  REJECTED: { label: "REJECTED", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: "✗" },
  Revoked: { label: "REVOKED", color: "text-red-500", bg: "bg-red-600/10 border-red-600/30", icon: "⊘" },
  REVOKED: { label: "REVOKED", color: "text-red-500", bg: "bg-red-600/10 border-red-600/30", icon: "⊘" },
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—";

const truncHash = (h) => (!h ? "—" : h.length > 20 ? `${h.slice(0, 14)}…${h.slice(-8)}` : h);

const Row = ({ label, value, mono }) => (
  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-3 border-b border-white/5 last:border-0">
    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
    <span className={`text-sm text-gray-200 text-right break-all ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
  </div>
);

const VerifyCertificate = () => {
  const { certificateId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!certificateId) return;
    setLoading(true);
    verifyCertificate(certificateId)
      .then((res) => setData(res))
      .catch((err) => {
        const msg = err.response?.data?.message || err.message || "Certificate not found.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [certificateId]);

  const cert = data?.certificate;
  const statusKey = cert?.verificationStatus || cert?.blockchainStatus || "PENDING";
  const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.PENDING;
  const isVerified =
    statusKey === "Verified" || statusKey === "VERIFIED";
  const isRevoked = statusKey === "Revoked" || statusKey === "REVOKED";

  const verifyUrl = `${window.location.origin}/verify/${certificateId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl).then(() => alert("Verification link copied!"));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-12">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">S</div>
          <span className="font-semibold tracking-tight text-gray-200 group-hover:text-white transition-colors">SkillSync</span>
        </Link>
        <Link to="/verify-document" className="text-xs text-violet-400 hover:text-violet-300 border border-violet-500/30 px-3 py-1.5 rounded-lg hover:bg-violet-500/10 transition-all">
          Verify a Document →
        </Link>
      </div>

      <div className="max-w-2xl mx-auto">
        {loading && (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Fetching certificate record…</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <p className="text-2xl mb-3">⚠️</p>
            <h1 className="text-lg font-semibold text-red-400 mb-2">Certificate Not Found</h1>
            <p className="text-gray-500 text-sm">{error}</p>
            <Link to="/" className="mt-4 inline-block text-xs text-violet-400 hover:underline">← Back to home</Link>
          </div>
        )}

        {!loading && cert && (
          <>
            {/* Status banner */}
            <div className={`rounded-2xl border p-6 mb-6 ${statusCfg.bg}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-3xl font-bold ${statusCfg.color}`}>
                    {statusCfg.icon} {statusCfg.label}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    {isVerified
                      ? "This certificate has been verified and its hash confirmed on-chain."
                      : isRevoked
                        ? "This certificate has been revoked by the issuing organisation."
                        : "This certificate is awaiting blockchain verification."}
                  </p>
                </div>
                {isVerified && (
                  <div className="text-5xl opacity-20">🔗</div>
                )}
              </div>
            </div>

            {/* Details card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 mb-4">
              <h2 className="text-base font-semibold text-gray-200 mb-4">Certificate Details</h2>
              <Row label="Certificate Name" value={cert.certificateName} />
              <Row label="Certificate Type" value={cert.certificateType} />
              <Row label="Student" value={cert.student?.name || cert.studentName} />
              <Row label="Issuing Organisation" value={cert.organisation?.organisationName || cert.issuer || cert.issuingOrganisation} />
              <Row label="Issue Date" value={formatDate(cert.issueDate)} />
              <Row label="Expiry Date" value={cert.expiryDate ? formatDate(cert.expiryDate) : "No Expiry"} />
            </div>

            {/* Blockchain details */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 mb-4">
              <h2 className="text-base font-semibold text-gray-200 mb-4">Blockchain Information</h2>
              <Row label="Certificate Hash" value={cert.certificateHash} mono />
              <Row label="Transaction Hash" value={cert.transactionHash || cert.txHash} mono />
              <Row label="Block Number" value={cert.blockNumber ? String(cert.blockNumber) : "—"} />
              <Row label="Blockchain Status" value={cert.blockchainStatus || statusKey} />
              {cert.verificationTimestamp && (
                <Row label="Verified At" value={formatDate(cert.verificationTimestamp)} />
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 transition-all"
              >
                🔗 Copy Verification Link
              </button>
              <Link
                to="/verify-document"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-all"
              >
                📄 Verify a Document
              </Link>
              {cert.transactionHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${cert.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-all"
                >
                  🔍 View on Explorer ↗
                </a>
              )}
            </div>

            {/* Important distinction */}
            <div className="rounded-xl border border-white/5 bg-white/5 p-4 text-xs text-gray-500">
              <p className="font-medium text-gray-400 mb-1">📋 Verification Note</p>
              <p>
                "Certificate record found" confirms the certificate exists in the SkillSync database.
                "Blockchain Verified" means the document hash has been confirmed on the blockchain.
                To verify a physical document, use{" "}
                <Link to="/verify-document" className="text-violet-400 hover:underline">Document Verification</Link>.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyCertificate;
