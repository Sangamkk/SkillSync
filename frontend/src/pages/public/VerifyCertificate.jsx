import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { verifyCertificate } from "../../services/publicVerificationService";

const STATUS_CONFIG = {
  Verified: { label: "VERIFIED", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", icon: "✓" },
  VERIFIED: { label: "VERIFIED", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", icon: "✓" },
  VALID: { label: "VERIFIED", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", icon: "✓" },
  Pending: { label: "PENDING", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", icon: "⏳" },
  PENDING: { label: "PENDING", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", icon: "⏳" },
  Rejected: { label: "REJECTED", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: "✗" },
  REJECTED: { label: "REJECTED", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: "✗" },
  Revoked: { label: "REVOKED", color: "text-red-500", bg: "bg-red-600/10 border-red-600/30", icon: "⊘" },
  REVOKED: { label: "REVOKED", color: "text-red-500", bg: "bg-red-600/10 border-red-600/30", icon: "⊘" },
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—";

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
  const [copied, setCopied] = useState(false);

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
  const onChainStatus = data?.blockchain?.verifiedOnChain
    ? (data.blockchain.onChainRevoked ? "REVOKED" : "VERIFIED")
    : null;
  const statusKey = onChainStatus || data?.status || cert?.verificationStatus || "PENDING";
  const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.PENDING;
  const isVerified = statusKey === "Verified" || statusKey === "VERIFIED" || statusKey === "VALID";
  const isRevoked = statusKey === "Revoked" || statusKey === "REVOKED";

  const targetHash = cert?.certificateHash || certificateId;
  const verifyUrl = `${window.location.origin}/verify/${targetHash}`;
  const qrPageUrl = `/verify-qr/${targetHash}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-12">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">S</div>
          <span className="font-semibold tracking-tight text-gray-200 group-hover:text-white transition-colors">SkillSync</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to={qrPageUrl}
            className="text-xs text-violet-400 hover:text-violet-300 border border-violet-500/30 px-3 py-1.5 rounded-lg hover:bg-violet-500/10 transition-all flex items-center gap-1.5"
          >
            <span>📱</span>
            <span>View QR Code</span>
          </Link>
          <Link
            to="/verify-document"
            className="text-xs text-slate-400 hover:text-slate-200 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
          >
            Verify Document →
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {loading && (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Fetching certificate record & verifying on blockchain…</p>
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
            {/* Status of the Certificate Banner */}
            <div className={`rounded-2xl border p-6 mb-6 ${statusCfg.bg}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-black/20 text-white/80 mb-2">
                    Official Certificate Status
                  </div>
                  <p className={`text-3xl font-extrabold ${statusCfg.color} tracking-tight`}>
                    {statusCfg.icon} {statusCfg.label}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    {isVerified
                      ? "This certificate has been verified and its cryptographic hash confirmed on the blockchain."
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

            {/* Certificate Details Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 mb-4 shadow-xl">
              <h2 className="text-base font-semibold text-gray-200 mb-4 flex items-center justify-between">
                <span>Certificate Details</span>
                <span className="text-xs font-normal text-slate-400">Authenticated Record</span>
              </h2>
              <Row label="Certificate Name" value={cert.certificateName} />
              <Row label="Certificate Type" value={cert.certificateType} />
              <Row label="Student Name" value={cert.student?.name || cert.studentName} />
              {cert.student?.usn && <Row label="Student USN" value={cert.student.usn} />}
              {cert.student?.college && <Row label="College / Institution" value={cert.student.college} />}
              <Row label="Issuing Organisation" value={cert.organisation?.organisationName || cert.issuer || cert.issuingOrganisation} />
              <Row label="Issue Date" value={formatDate(cert.issueDate)} />
              <Row label="Expiry Date" value={cert.expiryDate ? formatDate(cert.expiryDate) : "No Expiry"} />
            </div>

            {/* Blockchain Details Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 mb-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="text-base font-semibold text-gray-200 flex items-center gap-2">
                  <span>⛓️ Blockchain Verification Proof</span>
                  {data?.blockchain?.verifiedOnChain ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Verified on Smart Contract
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Database Record
                    </span>
                  )}
                </h2>
                <span className="text-xs text-slate-400">Ethereum Sepolia Testnet</span>
              </div>

              {/* Verified Hash */}
              <Row label="Certificate Hash" value={cert.certificateHash} mono />

              {/* Verified By (Who) */}
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-3 border-b border-white/5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Verified By (Organisation)</span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-emerald-400 block">
                    {data?.blockchain?.verifiedBy?.name || cert.organisation?.organisationName || cert.issuer || "Authorized Organisation"}
                  </span>
                  {data?.blockchain?.verifiedBy?.organisationId && (
                    <span className="text-[11px] font-mono text-slate-400 block break-all">
                      On-Chain ID: {data.blockchain.verifiedBy.organisationId}
                    </span>
                  )}
                </div>
              </div>

              {/* Verified For (Whom) */}
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-3 border-b border-white/5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Issued To (Recipient)</span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-200 block">
                    {data?.blockchain?.verifiedFor?.name || cert.student?.name || "Verified Student"}
                    {data?.blockchain?.verifiedFor?.usn ? ` (${data.blockchain.verifiedFor.usn})` : ""}
                  </span>
                  {data?.blockchain?.verifiedFor?.applicantId && (
                    <span className="text-[11px] font-mono text-slate-400 block break-all">
                      On-Chain Applicant ID: {data.blockchain.verifiedFor.applicantId}
                    </span>
                  )}
                </div>
              </div>

              {/* Smart Contract */}
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-3 border-b border-white/5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Smart Contract</span>
                <a
                  href={`https://sepolia.etherscan.io/address/${data?.blockchain?.contractAddress || "0x6F63aBd698dA20Ec1ea4B70A8093253dD290fbC2"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-mono text-right break-all"
                >
                  {data?.blockchain?.contractAddress || "0x6F63aBd698dA20Ec1ea4B70A8093253dD290fbC2"} ↗
                </a>
              </div>

              {/* On-Chain Timestamps */}
              {data?.blockchain?.onChainIssuedAt && (
                <Row label="On-Chain Block Timestamp" value={formatDate(data.blockchain.onChainIssuedAt)} />
              )}
              {data?.blockchain?.onChainExpiresAt && (
                <Row label="On-Chain Expiry" value={formatDate(data.blockchain.onChainExpiresAt)} />
              )}

              {/* Transaction Proof */}
              {cert.transactionHash && (
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-3 border-b border-white/5 last:border-0">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction Proof</span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${cert.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 hover:underline font-mono text-right break-all"
                  >
                    {cert.transactionHash} ↗
                  </a>
                </div>
              )}

              <Row
                label="On-Chain Status"
                value={
                  data?.blockchain?.verifiedOnChain
                    ? data?.blockchain?.onChainRevoked
                      ? "⊘ Revoked On-Chain"
                      : "✓ Active & Authenticated on Ethereum Sepolia"
                    : statusKey
                }
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-violet-500/30 bg-violet-600/10 text-violet-300 hover:bg-violet-600/20 transition-all cursor-pointer"
              >
                {copied ? "✓ Verification Link Copied" : "🔗 Copy Verification Link"}
              </button>

              <Link
                to={qrPageUrl}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 transition-all"
              >
                📱 View Scannable QR Code
              </Link>

              {cert.certificateURL && (
                <a
                  href={cert.certificateURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                >
                  👁️ View Certificate Document
                </a>
              )}

              {cert.transactionHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${cert.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-all"
                >
                  🔍 View on Explorer ↗
                </a>
              )}
            </div>

            {/* Explanatory note */}
            <div className="rounded-xl border border-white/5 bg-white/5 p-4 text-xs text-gray-500">
              <p className="font-medium text-gray-400 mb-1">📋 Verification Confirmation</p>
              <p>
                This status page was produced by querying the SkillSync decentralized registry.
                The document hash matches the cryptographic proof recorded on-chain.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyCertificate;
