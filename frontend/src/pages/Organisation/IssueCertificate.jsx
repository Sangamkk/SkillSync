import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { issueCertificate } from "../../services/certificateService";
import { lookupStudent } from "../../services/studentService";
import MeshBackground from "../../components/common/MeshBackground";

const CERT_TYPES = [
  "Course",
  "Internship",
  "Workshop",
  "Hackathon",
  "Competition",
  "Professional",
  "ResearchPaper",
  "Patent",
  "Other",
];

const IssueCertificate = () => {
  const [form, setForm] = useState({
    studentIdentifier: "",
    certificateName: "",
    certificateType: "Course",
    issueDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    description: "",
    grade: "",
    score: "",
    duration: "",
  });

  const [verifiedStudent, setVerifiedStudent] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "", data: null });
  const [darkMode] = useState(() => localStorage.getItem("skillsync-theme") !== "light");

  const update = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  // Auto-verify student when identifier is entered
  const handleStudentLookup = async (identifierToLookup) => {
    const ident = (identifierToLookup !== undefined ? identifierToLookup : form.studentIdentifier).trim();
    if (!ident) {
      setVerifiedStudent(null);
      setLookupError("");
      return;
    }

    setLookingUp(true);
    setLookupError("");
    try {
      const student = await lookupStudent(ident);
      if (student) {
        setVerifiedStudent(student);
        setLookupError("");
      } else {
        setVerifiedStudent(null);
        setLookupError("No student found with this ID or Email.");
      }
    } catch (err) {
      setVerifiedStudent(null);
      setLookupError(err.response?.data?.message || "Student not found with provided ID or Email.");
    } finally {
      setLookingUp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setStatusMsg({ type: "error", text: "Please upload the certificate PDF document.", data: null });
      return;
    }

    const studentIdToUse = verifiedStudent?._id || form.studentIdentifier.trim();
    if (!studentIdToUse) {
      setStatusMsg({ type: "error", text: "Student ID or Email is required.", data: null });
      return;
    }

    if (!form.certificateName.trim()) {
      setStatusMsg({ type: "error", text: "Certificate name is required.", data: null });
      return;
    }

    if (!form.issueDate) {
      setStatusMsg({ type: "error", text: "Issue date is required.", data: null });
      return;
    }

    if (verifiedStudent && !verifiedStudent.applicantId) {
      setStatusMsg({
        type: "error",
        text: `Student "${verifiedStudent.name}" has not completed on-chain registration yet (missing blockchain Applicant ID). They must register on-chain before certificates can be issued.`,
        data: null,
      });
      return;
    }

    if (form.expiryDate) {
      const expDate = new Date(form.expiryDate).getTime();
      if (expDate <= Date.now()) {
        setStatusMsg({
          type: "error",
          text: "Expiry date must be in the future. Leave it blank if the certificate does not expire.",
          data: null,
        });
        return;
      }
    }

    setLoading(true);
    setStatusMsg({ type: "", text: "", data: null });

    try {
      const formData = new FormData();
      formData.append("certificate", file);

      formData.append("studentId", studentIdToUse);
      if (verifiedStudent?.email) {
        formData.append("studentEmail", verifiedStudent.email);
      }
      formData.append("certificateName", form.certificateName.trim());
      formData.append("certificateType", form.certificateType);
      formData.append("issueDate", form.issueDate);
      if (form.expiryDate) formData.append("expiryDate", form.expiryDate);
      if (form.description) formData.append("description", form.description.trim());
      if (form.grade) formData.append("grade", form.grade.trim());
      if (form.score) formData.append("score", form.score.trim());
      if (form.duration) formData.append("duration", form.duration.trim());

      const result = await issueCertificate(formData);

      setStatusMsg({
        type: "success",
        text: result.message || "Certificate issued and recorded on the blockchain successfully!",
        data: {
          txHash: result.blockchain?.transactionHash || result.certificate?.txHash,
          blockNumber: result.blockchain?.blockNumber || result.certificate?.blockchainBlockNumber,
          certHash: result.blockchain?.certificateHash || result.certificate?.certificateHash,
          certId: result.certificate?._id,
        },
      });

      // Reset form on success
      setForm({
        studentIdentifier: "",
        certificateName: "",
        certificateType: "Course",
        issueDate: new Date().toISOString().split("T")[0],
        expiryDate: "",
        description: "",
        grade: "",
        score: "",
        duration: "",
      });
      setVerifiedStudent(null);
      setFile(null);
    } catch (err) {
      setStatusMsg({
        type: "error",
        text: err.response?.data?.message || err.message || "Failed to issue certificate.",
        data: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const base = darkMode ? "min-h-screen bg-[#070B14] text-white" : "min-h-screen bg-slate-50 text-gray-900";
  const card = darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white shadow-sm";
  const inputCls = darkMode
    ? "bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-blue-500"
    : "bg-white border-slate-200 text-gray-900 placeholder-gray-400 focus:border-blue-500";

  return (
    <div className={`relative ${base}`}>
      <MeshBackground darkMode={darkMode} />
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <Link
            to="/organisation"
            className={`mb-3 inline-flex items-center gap-1.5 text-xs font-medium transition ${
              darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            ← Back to Organisation Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-400">
              Direct Credential Issuance
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Issue Certificate
          </h1>
          <p className={`mt-2 text-sm leading-6 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Directly issue a tamper-proof certificate to a student. SkillSync computes the document hash,
            mints it on the Ethereum smart contract under the student&apos;s applicant record, and uploads the verified asset.
          </p>
        </div>

        <div className={`rounded-2xl border backdrop-blur-xl p-6 sm:p-8 ${card}`}>
          {/* Status Alert Banner */}
          {statusMsg.text && (
            <div
              className={`mb-6 rounded-xl border p-4 text-sm ${
                statusMsg.type === "success"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-500/20 bg-rose-500/10 text-rose-300"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-base">{statusMsg.type === "success" ? "✓" : "⚠️"}</span>
                <div className="flex-1">
                  <p className="font-medium">{statusMsg.text}</p>
                  {statusMsg.data?.txHash && (
                    <div className="mt-2 space-y-1 text-xs font-mono opacity-90">
                      <p>
                        <span className="font-sans font-semibold">Tx Hash:</span>{" "}
                        {statusMsg.data.txHash}
                      </p>
                      {statusMsg.data.blockNumber && (
                        <p>
                          <span className="font-sans font-semibold">Block:</span> #{statusMsg.data.blockNumber}
                        </p>
                      )}
                      {statusMsg.data.certHash && (
                        <p>
                          <span className="font-sans font-semibold">Doc Hash:</span> {statusMsg.data.certHash}
                        </p>
                      )}
                      {statusMsg.data.certId && (
                        <div className="pt-1 font-sans">
                          <Link
                            to={`/verify/${statusMsg.data.certId}`}
                            target="_blank"
                            className="inline-block text-blue-400 underline hover:text-blue-300"
                          >
                            View Public Verification Page ↗
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student ID / Identifier Lookup */}
            <div>
              <div className="flex items-center justify-between">
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Student ID or Email *
                </label>
                {lookingUp && (
                  <span className="text-xs text-blue-400 flex items-center gap-1">
                    <span className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                    Checking student…
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.studentIdentifier}
                  onChange={(e) => {
                    update("studentIdentifier", e.target.value);
                    if (verifiedStudent) setVerifiedStudent(null);
                  }}
                  onBlur={() => handleStudentLookup()}
                  placeholder="Paste Student MongoDB ID, Email, or Applicant ID (e.g. 6ab691... or student@test.com)"
                  required
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${inputCls}`}
                />
                <button
                  type="button"
                  onClick={() => handleStudentLookup()}
                  disabled={lookingUp || !form.studentIdentifier.trim()}
                  className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs font-semibold text-blue-400 transition hover:bg-blue-500/20 disabled:opacity-40"
                >
                  Verify
                </button>
              </div>

              {/* Student Lookup Feedback */}
              {lookupError && (
                <p className="mt-1.5 text-xs text-rose-400">{lookupError}</p>
              )}

              {verifiedStudent && (
                <div className={`mt-3 rounded-xl border p-3.5 text-xs ${darkMode ? "border-emerald-500/20 bg-emerald-500/5" : "border-emerald-200 bg-emerald-50/70"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                      Student Verified
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">ID: {verifiedStudent._id}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                    <p><span className="text-slate-500">Name:</span> <strong className="text-white">{verifiedStudent.name}</strong></p>
                    <p><span className="text-slate-500">Email:</span> {verifiedStudent.email}</p>
                    {verifiedStudent.usn && <p><span className="text-slate-500">USN:</span> {verifiedStudent.usn}</p>}
                    {verifiedStudent.college && <p><span className="text-slate-500">College:</span> {verifiedStudent.college}</p>}
                  </div>
                  <div className="mt-2 pt-2 border-t border-emerald-500/10 flex items-center justify-between">
                    <span className="text-slate-400">On-Chain Applicant ID:</span>
                    {verifiedStudent.applicantId ? (
                      <span className="font-mono text-emerald-400 text-[11px]">
                        ✓ {verifiedStudent.applicantId.slice(0, 14)}...{verifiedStudent.applicantId.slice(-8)}
                      </span>
                    ) : (
                      <span className="text-amber-400 font-semibold">⚠️ Missing blockchain applicant ID</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Certificate Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Certificate Name *
                </label>
                <input
                  type="text"
                  value={form.certificateName}
                  onChange={(e) => update("certificateName", e.target.value)}
                  placeholder="e.g. Advanced Full-Stack Web Development"
                  required
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${inputCls}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Certificate Type *
                </label>
                <select
                  value={form.certificateType}
                  onChange={(e) => update("certificateType", e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${inputCls}`}
                >
                  {CERT_TYPES.map((t) => (
                    <option key={t} value={t} className={darkMode ? "bg-gray-900" : "bg-white"}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Issue Date *
                </label>
                <input
                  type="date"
                  value={form.issueDate}
                  onChange={(e) => update("issueDate", e.target.value)}
                  required
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${inputCls}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                  value={form.expiryDate}
                  onChange={(e) => update("expiryDate", e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${inputCls}`}
                />
                <p className={`mt-1 text-[11px] ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                  Leave blank for non-expiring credentials.
                </p>
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Duration (Optional)
                </label>
                <input
                  type="text"
                  value={form.duration}
                  onChange={(e) => update("duration", e.target.value)}
                  placeholder="e.g. 12 Weeks / 3 Months"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${inputCls}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Grade / Score (Optional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={form.grade}
                    onChange={(e) => update("grade", e.target.value)}
                    placeholder="Grade (e.g. A+)"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all ${inputCls}`}
                  />
                  <input
                    type="text"
                    value={form.score}
                    onChange={(e) => update("score", e.target.value)}
                    placeholder="Score (e.g. 95%)"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all ${inputCls}`}
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Description (Optional)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={3}
                  placeholder="Brief description of the achievements, coursework, or project completed…"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none resize-none transition-all ${inputCls}`}
                />
              </div>
            </div>

            {/* Document PDF Upload */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                Certificate PDF Document *
              </label>
              <div className={`rounded-xl border-2 border-dashed p-4 transition ${
                file
                  ? darkMode ? "border-emerald-500/40 bg-emerald-500/5" : "border-emerald-400 bg-emerald-50"
                  : darkMode ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-slate-50"
              }`}>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className={`w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-500 ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                />
                {file && (
                  <p className="mt-2 text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                    <span>✓</span> {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:opacity-95 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Hashing & Minting on Blockchain…
                </span>
              ) : (
                "📜 Issue & Record on Blockchain"
              )}
            </button>
          </form>
        </div>

        <p className={`mt-4 text-center text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
          SkillSync Relayer executes the smart contract transaction on Ethereum Sepolia and directly attaches the certificate hash to the student&apos;s applicant contract record.
        </p>
      </div>
    </div>
  );
};

export default IssueCertificate;
