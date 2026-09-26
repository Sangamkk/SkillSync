import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { verifyDocument, verifyCertificate } from "../../services/publicVerificationService";

const OUTCOMES = {
  VALID: {
    badge: "✓ VERIFIED ON-CHAIN",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    title: "Document Authenticity Confirmed",
    desc: "The cryptographic SHA-256 hash matches a verified certificate registered on the blockchain.",
    glow: "shadow-emerald-500/10 border-emerald-500/30",
  },
  DOCUMENT_VERIFIED: {
    badge: "✓ VERIFIED ON-CHAIN",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    title: "Document Authenticity Confirmed",
    desc: "The cryptographic SHA-256 hash matches a verified certificate registered on the blockchain.",
    glow: "shadow-emerald-500/10 border-emerald-500/30",
  },
  NOT_FOUND: {
    badge: "? NOT REGISTERED",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    title: "Certificate Not Found in Registry",
    desc: "No matching record was found in the SkillSync database or blockchain ledger for this document.",
    glow: "shadow-amber-500/10 border-amber-500/30",
  },
  REVOKED: {
    badge: "⊘ CERTIFICATE REVOKED",
    badgeClass: "bg-red-500/15 text-red-400 border-red-500/30",
    title: "Certificate Has Been Revoked",
    desc: "A matching certificate exists, but it has been officially revoked by the issuing organisation.",
    glow: "shadow-red-500/10 border-red-500/30",
  },
  EXPIRED: {
    badge: "⏰ CERTIFICATE EXPIRED",
    badgeClass: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    title: "Certificate Has Expired",
    desc: "This certificate was verified but has passed its expiration date.",
    glow: "shadow-orange-500/10 border-orange-500/30",
  },
  PENDING: {
    badge: "⏳ VERIFICATION PENDING",
    badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    title: "Certificate Verification Pending",
    desc: "This certificate has been submitted and is currently awaiting approval.",
    glow: "shadow-blue-500/10 border-blue-500/30",
  },
  INVALID: {
    badge: "✗ INVALID DOCUMENT",
    badgeClass: "bg-red-500/15 text-red-400 border-red-500/30",
    title: "Document Verification Failed",
    desc: "The uploaded document does not match any valid certificate.",
    glow: "shadow-red-500/10 border-red-500/30",
  },
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const HomeDocumentVerifier = ({ darkMode = true }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("file"); // "file" | "hash"
  const [file, setFile] = useState(null);
  const [hashInput, setHashInput] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copiedHash, setCopiedHash] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const inputRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    const isPdf = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf");
    const isImage = selectedFile.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(selectedFile.name);

    if (!isPdf && !isImage) {
      setError("Please select a valid certificate file (PDF, PNG, JPG, or WebP).");
      return;
    }

    setFile(selectedFile);
    if (isImage) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setPreviewUrl(null);
    }
    setError("");
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleVerifyFile = async (e) => {
    if (e) e.preventDefault();
    if (!file) {
      setError("Please upload a certificate PDF or image to verify.");
      return;
    }
    setLoading(true);
    setLoadingStep("Computing SHA-256 Hash of document...");
    setError("");
    setResult(null);

    try {
      setTimeout(() => {
        setLoadingStep("Checking SkillSync Blockchain & Registry...");
      }, 500);

      const formData = new FormData();
      formData.append("file", file);
      const res = await verifyDocument(formData);
      setResult(res);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to verify document.";
      setError(msg);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleVerifyHash = async (e) => {
    if (e) e.preventDefault();
    const query = hashInput.trim();
    if (!query) {
      setError("Please enter a certificate hash or ID.");
      return;
    }
    setLoading(true);
    setLoadingStep("Querying Blockchain & Database...");
    setError("");
    setResult(null);

    try {
      const res = await verifyCertificate(query);
      setResult(res);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Verification failed.";
      setError(msg);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleReset = () => {
    if (previewUrl) {
      try { URL.revokeObjectURL(previewUrl); } catch { /* ignore */ }
    }
    setPreviewUrl(null);
    setFile(null);
    setHashInput("");
    setResult(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleCopyHash = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    });
  };

  const statusKey = result?.status || result?.outcome || (result?.valid ? "VALID" : "NOT_FOUND");
  const outcome = OUTCOMES[statusKey] || (result?.valid ? OUTCOMES.VALID : OUTCOMES.NOT_FOUND);
  const cert = result?.certificate;
  const targetId = cert?.certificateHash || cert?._id || hashInput.trim();

  return (
    <div
      className={`relative w-full rounded-3xl border transition-all duration-300 p-6 sm:p-10 shadow-2xl backdrop-blur-2xl ${
        darkMode
          ? "border-white/10 bg-[#0B1120]/90 text-white shadow-blue-950/30"
          : "border-slate-200 bg-white/95 text-slate-900 shadow-slate-200/80"
      }`}
    >
      {/* Top Banner & Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Public Verification Engine • No Login Needed
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Verify Certificate Authenticity
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Instantly upload any certificate PDF or Image (PNG, JPG, WebP) to check if it's genuinely registered on the SkillSync blockchain ledger.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center self-start sm:self-auto rounded-xl p-1 bg-black/20 dark:bg-white/5 border border-white/10">
          <button
            type="button"
            onClick={() => {
              setActiveTab("file");
              setResult(null);
              setError("");
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "file"
                ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            📄 Upload File / Image
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("hash");
              setResult(null);
              setError("");
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "hash"
                ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🔍 By Hash / ID
          </button>
        </div>
      </div>

      {/* Verification Inputs Form */}
      {!result && (
        <div className="mt-8">
          {activeTab === "file" ? (
            <form onSubmit={handleVerifyFile}>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 ${
                  dragging
                    ? "border-blue-500 bg-blue-500/10 scale-[1.01]"
                    : file
                    ? "border-emerald-500/60 bg-emerald-500/5 hover:border-emerald-500"
                    : darkMode
                    ? "border-white/15 bg-white/[0.02] hover:border-blue-500/50 hover:bg-white/[0.05]"
                    : "border-slate-300 bg-slate-50/50 hover:border-blue-500 hover:bg-blue-50/40"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                />

                {file ? (
                  <div className="flex flex-col items-center">
                    {previewUrl ? (
                      <div className="relative mb-3">
                        <img
                          src={previewUrl}
                          alt="Certificate Preview"
                          className="h-28 max-w-xs object-contain rounded-xl border border-emerald-500/30 shadow-md bg-black/20"
                        />
                        <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow">
                          Image
                        </span>
                      </div>
                    ) : (
                      <div className="h-16 w-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-3xl mb-3 shadow-lg shadow-emerald-500/10">
                        📄
                      </div>
                    )}
                    <p className="text-base font-semibold text-emerald-400 max-w-md truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {(file.size / 1024).toFixed(1)} KB • {previewUrl ? "Image" : "PDF"} Document Ready
                    </p>
                    <span className="mt-3 text-xs text-blue-400 hover:underline">
                      Click to choose a different file
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="h-16 w-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-3xl mb-3">
                      ☁️
                    </div>
                    <p className="text-base font-semibold">
                      Drag & Drop your Certificate PDF or Image here
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Upload the original PDF or Image (PNG, JPG, WebP) to calculate its cryptographic SHA-256 hash and verify with on-chain records
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition">
                      Browse Files
                    </span>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={loading || !file}
                  className="flex-1 py-3.5 px-6 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl shadow-blue-600/20 hover:shadow-blue-600/35 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{loadingStep || "Verifying Document..."}</span>
                    </>
                  ) : (
                    <>
                      <span>🔍</span>
                      <span>Verify Document Authenticity</span>
                    </>
                  )}
                </button>

                {file && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="py-3.5 px-5 rounded-xl text-xs font-semibold border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyHash}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Certificate Hash (SHA-256) or Certificate ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={hashInput}
                      onChange={(e) => {
                        setHashInput(e.target.value);
                        setError("");
                      }}
                      placeholder="e.g. 0x7995e693cabe27de93cb50ac884dd19943c479029303b62affa37b07a4f969ba or Certificate ID"
                      className={`w-full rounded-xl px-4 py-3.5 font-mono text-xs sm:text-sm border transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode
                          ? "bg-black/30 border-white/15 text-white placeholder-slate-600"
                          : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                      }`}
                    />
                    {hashInput && (
                      <button
                        type="button"
                        onClick={() => setHashInput("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-2 py-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !hashInput.trim()}
                  className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl shadow-blue-600/20 hover:shadow-blue-600/35 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{loadingStep || "Checking Blockchain..."}</span>
                    </>
                  ) : (
                    <>
                      <span>🔍</span>
                      <span>Verify Certificate Hash</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Verification Result Display */}
      {result && (
        <div className={`mt-8 rounded-2xl border p-6 sm:p-8 transition-all animate-fadeIn ${outcome.glow} ${darkMode ? "bg-white/[0.03]" : "bg-slate-50/70"}`}>
          {/* Header Status Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold border tracking-wider ${outcome.badgeClass}`}>
                {outcome.badge}
              </span>
              <span className="text-xs text-slate-400">
                Verified at {new Date().toLocaleTimeString()}
              </span>
            </div>
            <button
              onClick={handleReset}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium underline flex items-center gap-1"
            >
              <span>↺</span> Verify Another Document
            </button>
          </div>

          {/* Outcome Title & Description */}
          <div className="mt-5">
            <h4 className="text-xl sm:text-2xl font-bold tracking-tight">
              {outcome.title}
            </h4>
            <p className="text-sm text-slate-400 mt-1">
              {result.message || outcome.desc}
            </p>
          </div>

          {/* Computed Hash Display */}
          {(result.computedHash || cert?.certificateHash) && (
            <div className={`mt-5 rounded-xl p-3.5 font-mono text-xs flex items-center justify-between gap-3 ${darkMode ? "bg-black/40 border border-white/10" : "bg-white border border-slate-200"}`}>
              <div className="min-w-0">
                <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-sans mb-0.5">
                  Document SHA-256 Hash
                </span>
                <span className="text-slate-300 break-all">
                  {result.computedHash || cert?.certificateHash}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyHash(result.computedHash || cert?.certificateHash)}
                className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs bg-white/10 hover:bg-white/20 text-slate-200 transition"
              >
                {copiedHash ? "✓ Copied" : "Copy"}
              </button>
            </div>
          )}

          {/* Certificate Found Details Card */}
          {cert && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Certificate Name */}
                <div className={`p-4 rounded-xl border ${darkMode ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200"}`}>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Certificate Title</p>
                  <p className="text-base font-semibold mt-1 text-slate-100 dark:text-white">
                    {cert.certificateName || "Certified Achievement"}
                  </p>
                  {cert.certificateType && (
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {cert.certificateType}
                    </span>
                  )}
                </div>

                {/* Recipient Student */}
                <div className={`p-4 rounded-xl border ${darkMode ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200"}`}>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Issued To</p>
                  <p className="text-base font-semibold mt-1 text-slate-100 dark:text-white">
                    {cert.student?.name || "Verified Student"}
                  </p>
                  {(cert.student?.usn || cert.student?.college) && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {[cert.student?.usn, cert.student?.college].filter(Boolean).join(" • ")}
                    </p>
                  )}
                </div>

                {/* Issuer */}
                <div className={`p-4 rounded-xl border ${darkMode ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200"}`}>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Issuing Authority</p>
                  <p className="text-sm font-semibold mt-1 text-slate-200">
                    {cert.issuer || "Authorized Organisation"}
                  </p>
                </div>

                {/* Dates */}
                <div className={`p-4 rounded-xl border ${darkMode ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200"}`}>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Issue Date</p>
                  <p className="text-sm font-semibold mt-1 text-slate-200">
                    {formatDate(cert.issueDate)}
                  </p>
                  {cert.expiryDate && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Expires: {formatDate(cert.expiryDate)}
                    </p>
                  )}
                </div>
              </div>

              {/* Blockchain Transaction Proof */}
              {cert.transactionHash && (
                <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${darkMode ? "bg-blue-950/20 border-blue-500/20" : "bg-blue-50/50 border-blue-200"}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-blue-400">⛓️</span>
                    <span className="text-xs text-slate-400">Blockchain Transaction:</span>
                    <span className="font-mono text-xs text-blue-400 truncate max-w-[200px] sm:max-w-xs">
                      {cert.transactionHash}
                    </span>
                  </div>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${cert.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 underline shrink-0 font-medium"
                  >
                    View on Etherscan ↗
                  </a>
                </div>
              )}

              {/* ACTION BUTTONS (The user requested direct navigation to verification & QR page) */}
              <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row gap-3">
                <Link
                  to={`/verify/${targetId}`}
                  className="flex-1 py-3.5 px-6 rounded-xl font-semibold text-xs sm:text-sm text-center bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl shadow-blue-500/20 hover:shadow-blue-500/35 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <span>Produce Status of Certificate Page</span>
                  <span>→</span>
                </Link>

                <Link
                  to={`/verify-qr/${targetId}`}
                  className="py-3.5 px-5 rounded-xl font-semibold text-xs sm:text-sm text-center border border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 transition-all flex items-center justify-center gap-2"
                >
                  <span>📱 View Scannable QR Code</span>
                </Link>

                {cert.certificateURL && (
                  <a
                    href={cert.certificateURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3.5 px-4 rounded-xl font-semibold text-xs text-center border border-white/10 hover:bg-white/10 text-slate-300 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>👁️ View Doc</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Not Registered / Not Found State actions */}
          {!cert && (
            <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="py-3 px-6 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition"
              >
                Upload Different Document
              </button>
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="py-3 px-6 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow transition"
              >
                Register as Student or Organisation →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HomeDocumentVerifier;
