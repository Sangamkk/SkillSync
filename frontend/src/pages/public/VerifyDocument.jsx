import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { verifyDocument } from "../../services/publicVerificationService";

const OUTCOMES = {
  DOCUMENT_VERIFIED: {
    icon: "✓",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    title: "Document Verified",
    desc: "The uploaded document's hash matches the blockchain record. This document is authentic.",
  },
  HASH_MISMATCH: {
    icon: "✗",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
    title: "Document Hash Mismatch",
    desc: "The hash of the uploaded document does not match any known certificate on the blockchain. The document may have been tampered with.",
  },
  NOT_FOUND: {
    icon: "?",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
    title: "Certificate Not Found",
    desc: "No matching certificate was found in the SkillSync database for this document.",
  },
  REVOKED: {
    icon: "⊘",
    color: "text-red-500",
    bg: "bg-red-600/10 border-red-600/30",
    title: "Certificate Revoked",
    desc: "A matching certificate was found but it has been revoked by the issuing organisation.",
  },
  EXPIRED: {
    icon: "⏰",
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/30",
    title: "Certificate Expired",
    desc: "A matching certificate was found but it has passed its expiry date.",
  },
};

const VerifyDocument = () => {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    setFile(f);
    setResult(null);
    setError("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a PDF file to verify.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await verifyDocument(formData);
      setResult(data);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Verification failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const outcome = result?.outcome || result?.status;
  const outcomeCfg = outcome ? OUTCOMES[outcome] : null;
  const cert = result?.certificate;

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-12">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">S</div>
          <span className="font-semibold tracking-tight text-gray-200 group-hover:text-white transition-colors">SkillSync</span>
        </Link>
        <p className="text-xs text-gray-500">Public Document Verification</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-500 mb-1">Verify Document</p>
          <h1 className="text-3xl font-bold mb-2">Document Hash Verification</h1>
          <p className="text-gray-400 text-sm">
            Upload a certificate PDF to verify its authenticity against the blockchain. The backend will hash the document and compare it to records stored on-chain.
          </p>
        </div>

        {/* Upload form */}
        <form onSubmit={handleSubmit}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all mb-6 ${
              dragging
                ? "border-violet-500 bg-violet-500/10"
                : file
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-white/15 hover:border-violet-500/50 hover:bg-white/5"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {file ? (
              <>
                <p className="text-4xl mb-3">📄</p>
                <p className="text-emerald-400 font-medium">{file.name}</p>
                <p className="text-gray-500 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB · PDF</p>
                <p className="text-gray-600 text-xs mt-2">Click to change file</p>
              </>
            ) : (
              <>
                <p className="text-4xl mb-3">☁️</p>
                <p className="text-gray-300 font-medium">Drop your PDF here or click to browse</p>
                <p className="text-gray-500 text-xs mt-1">Only PDF files are supported</p>
              </>
            )}
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying document…
              </span>
            ) : "Verify Document"}
          </button>
        </form>

        {/* Result */}
        {outcomeCfg && (
          <div className={`mt-8 rounded-2xl border p-6 ${outcomeCfg.bg}`}>
            <div className="flex items-start gap-4 mb-4">
              <span className={`text-3xl font-bold ${outcomeCfg.color}`}>{outcomeCfg.icon}</span>
              <div>
                <h2 className={`text-xl font-bold ${outcomeCfg.color}`}>{outcomeCfg.title}</h2>
                <p className="text-gray-400 text-sm mt-1">{outcomeCfg.desc}</p>
              </div>
            </div>

            {cert && (
              <div className="mt-4 space-y-2">
                {cert.certificateName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Certificate</span>
                    <span className="text-gray-200">{cert.certificateName}</span>
                  </div>
                )}
                {cert.certificateHash && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Hash</span>
                    <span className="font-mono text-gray-300 text-xs break-all text-right">{cert.certificateHash}</span>
                  </div>
                )}
                {cert.transactionHash && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-500">Transaction</span>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${cert.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline font-mono text-xs"
                    >
                      {cert.transactionHash.slice(0, 14)}…
                    </a>
                  </div>
                )}
                {cert._id && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <Link
                      to={`/verify/${cert._id}`}
                      className="text-violet-400 text-xs hover:underline"
                    >
                      View full certificate verification page →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* How it works */}
        <div className="mt-8 rounded-xl border border-white/5 bg-white/5 p-5 text-xs text-gray-500">
          <p className="font-medium text-gray-400 mb-2">🔐 How it works</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Upload the original certificate PDF.</li>
            <li>The backend computes a SHA-256 hash of the document.</li>
            <li>The hash is compared against certificates stored on the blockchain.</li>
            <li>A clear result is returned — no wallet connection required.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default VerifyDocument;
