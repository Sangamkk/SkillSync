import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import QRCode from "qrcode";
import { verifyCertificate } from "../../services/publicVerificationService";

const CertificateQRPage = () => {
  const { certificateId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

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
  const targetHash = cert?.certificateHash || certificateId;
  const statusPageUrl = `${window.location.origin}/verify/${targetHash}`;

  useEffect(() => {
    if (!targetHash) return;
    QRCode.toDataURL(statusPageUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: "#0b1020",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error("QR Code Generation Error:", err));
  }, [targetHash, statusPageUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(statusPageUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white px-4 py-12 flex flex-col justify-between">
      {/* Header Navigation */}
      <div className="max-w-2xl mx-auto w-full mb-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-violet-500/25">
            S
          </div>
          <div>
            <span className="font-bold tracking-tight text-white group-hover:text-violet-300 transition-colors">
              SkillSync
            </span>
            <span className="block text-[10px] uppercase tracking-wider text-slate-400">
              Credential Verification
            </span>
          </div>
        </Link>
        <Link
          to={statusPageUrl}
          className="text-xs font-semibold text-violet-400 hover:text-violet-300 border border-violet-500/30 px-3.5 py-1.5 rounded-xl hover:bg-violet-500/10 transition-all"
        >
          Direct Status Page →
        </Link>
      </div>

      {/* Main QR Card */}
      <div className="max-w-xl mx-auto w-full">
        {loading && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-12 text-center shadow-2xl">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white">Generating Verification QR...</h3>
            <p className="text-slate-400 text-sm mt-1">Connecting to blockchain ledger...</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 backdrop-blur-xl p-10 text-center shadow-2xl">
            <p className="text-4xl mb-3">⚠️</p>
            <h2 className="text-xl font-bold text-red-400 mb-2">Certificate Not Found</h2>
            <p className="text-slate-400 text-sm">{error}</p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-all"
            >
              ← Back to Home
            </Link>
          </div>
        )}

        {!loading && cert && (
          <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-b from-[#13192e] to-[#0c101d] backdrop-blur-2xl p-7 sm:p-10 shadow-2xl shadow-violet-500/10 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold uppercase tracking-wider bg-violet-500/15 border border-violet-500/30 text-violet-300 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Blockchain Verification QR</span>
            </div>

            {/* Certificate Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {cert.certificateName || "Verified Certificate"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
              Issued by{" "}
              <span className="text-slate-200 font-semibold">
                {cert.issuer || cert.organisation?.organisationName || "Authorized Organisation"}
              </span>{" "}
              · {cert.certificateType || "Credential"}
            </p>

            {/* QR Code Presentation Box with Hover Tooltip */}
            <div className="my-8 flex flex-col items-center">
              <div className="relative inline-block">
                {/* Hover Tooltip displaying the link */}
                <div
                  className={`absolute -top-14 left-1/2 -translate-x-1/2 w-max max-w-[340px] sm:max-w-md px-3.5 py-1.5 rounded-xl bg-slate-900 border border-violet-500/60 shadow-2xl backdrop-blur-md pointer-events-none transition-all duration-200 z-30 ${
                    hovered ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95 pointer-events-none"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs text-violet-300 font-mono break-all truncate">
                    <span className="text-violet-400">🔗</span>
                    <span className="truncate">{statusPageUrl}</span>
                  </div>
                  <span className="block text-[10px] text-slate-400 text-center mt-0.5">
                    Click QR code to copy link
                  </span>
                </div>

                {/* Fixed-dimension, square QR card */}
                <div
                  onMouseEnter={() => setHovered(true)}
                  onMouseLeave={() => setHovered(false)}
                  onClick={handleCopyLink}
                  title={statusPageUrl}
                  className="group relative cursor-pointer w-60 h-60 sm:w-64 sm:h-64 aspect-square rounded-2xl bg-white p-3.5 shadow-2xl shadow-violet-500/25 transition-all duration-300 hover:scale-[1.03] hover:shadow-violet-500/40 ring-4 ring-violet-500/25 hover:ring-violet-400 flex items-center justify-center"
                >
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt={`Verification QR Code for ${cert.certificateName || "Certificate"}`}
                      className="w-full h-full object-contain rounded-xl block"
                    />
                  ) : (
                    <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  )}

                  {/* Corner accents */}
                  <span className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-violet-600 rounded-tl pointer-events-none" />
                  <span className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-violet-600 rounded-tr pointer-events-none" />
                  <span className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-violet-600 rounded-bl pointer-events-none" />
                  <span className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-violet-600 rounded-br pointer-events-none" />
                </div>
              </div>

              <p className="mt-4 text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <span>📱</span>
                <span>Scan this QR code with any mobile camera or QR reader</span>
              </p>
            </div>

            {/* Direct Link Box */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-left mb-6">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Verification Link
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-violet-300 truncate select-all">
                  {statusPageUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="shrink-0 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 px-3 py-1.5 text-xs font-semibold text-violet-200 transition-colors"
                >
                  {copied ? "✓ Copied!" : "Copy Link"}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to={statusPageUrl}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-[1.02]"
              >
                <span>🔍</span>
                <span>Produce Status of Certificate Page →</span>
              </Link>

              {qrCodeUrl && (
                <a
                  href={qrCodeUrl}
                  download={`SkillSync_${cert.certificateName || "Certificate"}_QR.png`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-5 py-3 text-sm font-semibold text-slate-200 hover:text-white transition-all"
                >
                  <span>⬇️</span>
                  <span>Download QR</span>
                </a>
              )}
            </div>

            <p className="mt-6 text-xs text-slate-400">
              Scanning the QR code or clicking the button redirects to the official status verification page confirming the immutable blockchain record.
            </p>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="max-w-xl mx-auto w-full text-center text-xs text-slate-400 mt-8">
        Secured by SkillSync Decentralized Blockchain Registry
      </div>
    </div>
  );
};

export default CertificateQRPage;
