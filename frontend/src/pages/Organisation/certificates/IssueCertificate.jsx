import { useState } from "react";
import { Link } from "react-router-dom";

function IssueCertificate() {
    const [formData, setFormData] = useState({ applicantWallet: "", certificateName: "", certificateType: "EXAM", score: "", issueDate: new Date().toISOString().split("T")[0] });
    const [certificateFile, setCertificateFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [issued, setIssued] = useState(false);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) setCertificateFile(file);
    };

    const handleIssueCertificate = async (e) => {
        e.preventDefault();

        if (!formData.applicantWallet || !formData.certificateName || !formData.certificateType || !certificateFile) {
            alert("Please fill all required fields and upload the certificate");
            return;
        }

        try {
            setLoading(true);

            console.log("Applicant:", formData.applicantWallet);
            console.log("Certificate:", certificateFile.name);
            console.log("Certificate Type:", formData.certificateType);

            setTimeout(() => {
                setIssued(true);
                setLoading(false);
            }, 1500);
        } catch (error) {
            console.error("Certificate issuance error:", error);
            alert("Certificate issuance failed");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#070B14] px-6 py-10 text-white lg:px-10">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">SkillSync</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight">Issue Certificate</h1>
                        <p className="mt-2 text-sm text-slate-400">Issue a blockchain-backed certificate to an applicant.</p>
                    </div>
                    <Link to="/organisation/certificates" className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">← Certificates</Link>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr]">
                    <form onSubmit={handleIssueCertificate} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
                        <div className="mb-7">
                            <h2 className="text-xl font-bold">Certificate Details</h2>
                            <p className="mt-1 text-sm text-slate-400">Enter the applicant and certificate information.</p>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">Applicant Wallet Address *</label>
                                <input type="text" name="applicantWallet" value={formData.applicantWallet} onChange={handleChange} placeholder="0x..." className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3.5 font-mono text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-violet-500/10" />
                                <p className="mt-2 text-xs text-slate-500">The certificate will be linked to this applicant wallet.</p>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">Certificate Name *</label>
                                <input type="text" name="certificateName" value={formData.certificateName} onChange={handleChange} placeholder="e.g. Blockchain Fundamentals Certification" className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-violet-500/10" />
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-300">Certificate Type *</label>
                                    <select name="certificateType" value={formData.certificateType} onChange={handleChange} className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3.5 text-sm text-white outline-none focus:border-violet-500/60">
                                        <option value="EXAM">Exam</option>
                                        <option value="COURSE">Course</option>
                                        <option value="COMPETITION">Competition</option>
                                        <option value="INTERNSHIP">Internship</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-300">Score</label>
                                    <input type="number" name="score" min="0" max="100" value={formData.score} onChange={handleChange} placeholder="e.g. 87" className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-violet-500/10" />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">Issue Date *</label>
                                <input type="date" name="issueDate" value={formData.issueDate} onChange={handleChange} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm text-white outline-none focus:border-violet-500/60" />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">Certificate File *</label>
                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-10 text-center transition hover:border-violet-500/50 hover:bg-violet-500/[0.03]">
                                    <span className="text-3xl">📄</span>
                                    <span className="mt-3 text-sm font-semibold text-white">{certificateFile ? certificateFile.name : "Upload Certificate"}</span>
                                    <span className="mt-1 text-xs text-slate-500">{certificateFile ? `${(certificateFile.size / 1024 / 1024).toFixed(2)} MB` : "PDF, PNG or JPG"}</span>
                                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} className="hidden" />
                                </label>
                            </div>

                            <button type="submit" disabled={loading || issued} className={`w-full rounded-xl py-3.5 font-semibold text-white transition ${issued ? "bg-emerald-600" : "bg-gradient-to-r from-violet-600 to-blue-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-600/20"} disabled:cursor-not-allowed disabled:opacity-70`}>
                                {loading ? "Processing Certificate..." : issued ? "✓ Certificate Issued" : "📜 Issue Certificate"}
                            </button>
                        </div>
                    </form>

                    <div className="space-y-5">
                        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
                            <h2 className="text-lg font-bold">Issuance Process</h2>
                            <div className="mt-5 space-y-4">
                                <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-sm">1</span><div><p className="text-sm font-semibold">Upload Certificate</p><p className="mt-1 text-xs text-slate-500">Certificate file will be stored securely on Cloudinary.</p></div></div>
                                <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-sm">2</span><div><p className="text-sm font-semibold">Generate Hash</p><p className="mt-1 text-xs text-slate-500">A SHA-256 hash will be generated from the certificate file.</p></div></div>
                                <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-sm">3</span><div><p className="text-sm font-semibold">Blockchain Transaction</p><p className="mt-1 text-xs text-slate-500">The certificate proof will be recorded on-chain.</p></div></div>
                                <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-sm">4</span><div><p className="text-sm font-semibold">Save Metadata</p><p className="mt-1 text-xs text-slate-500">Certificate metadata and Cloudinary URL will be stored in MongoDB.</p></div></div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-amber-500/10 bg-amber-500/[0.04] p-6">
                            <div className="flex gap-3">
                                <span className="text-xl">🔐</span>
                                <div>
                                    <h3 className="text-sm font-semibold text-amber-300">Verification Ready</h3>
                                    <p className="mt-1 text-xs leading-5 text-slate-400">The certificate hash recorded on blockchain will later be compared with the hash of the certificate retrieved from Cloudinary.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default IssueCertificate;