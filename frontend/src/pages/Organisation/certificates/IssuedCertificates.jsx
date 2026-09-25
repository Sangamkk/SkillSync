import { useState } from "react";
import { Link } from "react-router-dom";

function IssuedCertificates() {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("ALL");

    const certificates = [
        { id: 1, applicant: "0x742d...44e8", name: "Blockchain Fundamentals Certification", type: "EXAM", score: "87%", status: "VERIFIED", hash: "a84f7c91d29e8f31...", date: "25 Sep 2026", txHash: "0x8f42...91ab" }
    ];

    const filteredCertificates = certificates.filter((certificate) => {
        const matchesSearch = `${certificate.name} ${certificate.applicant}`.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === "ALL" || certificate.status === filter;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="min-h-screen bg-[#070B14] px-6 py-10 text-white lg:px-10">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">SkillSync</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight">Issued Certificates</h1>
                        <p className="mt-2 text-sm text-slate-400">Manage certificates issued by your organisation.</p>
                    </div>
                    <div className="flex gap-3">
                        <Link to="/organisation/certificates" className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">← Certificates</Link>
                        <Link to="/organisation/certificates/issue" className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500">+ Issue Certificate</Link>
                    </div>
                </div>

                <div className="mb-6 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                        <p className="text-xs uppercase tracking-wider text-slate-500">Total Issued</p>
                        <p className="mt-2 text-3xl font-bold">{certificates.length}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-5">
                        <p className="text-xs uppercase tracking-wider text-slate-500">Verified</p>
                        <p className="mt-2 text-3xl font-bold text-emerald-400">{certificates.filter((c) => c.status === "VERIFIED").length}</p>
                    </div>
                    <div className="rounded-2xl border border-blue-500/10 bg-blue-500/[0.04] p-5">
                        <p className="text-xs uppercase tracking-wider text-slate-500">Blockchain Records</p>
                        <p className="mt-2 text-3xl font-bold text-blue-400">{certificates.filter((c) => c.txHash).length}</p>
                    </div>
                </div>

                <div className="mb-6 flex flex-col gap-3 sm:flex-row">
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search certificate or applicant wallet..." className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-500/50" />
                    <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white outline-none">
                        <option value="ALL">All Certificates</option>
                        <option value="VERIFIED">Verified</option>
                        <option value="PENDING">Pending</option>
                        <option value="REVOKED">Revoked</option>
                    </select>
                </div>

                {filteredCertificates.length === 0 ? (
                    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-12 text-center">
                        <div className="text-4xl">📜</div>
                        <h2 className="mt-4 text-lg font-semibold">No certificates found</h2>
                        <p className="mt-2 text-sm text-slate-500">Try changing your search or issue a new certificate.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredCertificates.map((certificate) => (
                            <div key={certificate.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition hover:border-white/20">
                                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex min-w-0 gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-2xl">📜</div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="font-semibold text-white">{certificate.name}</h2>
                                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${certificate.status === "VERIFIED" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>{certificate.status}</span>
                                            </div>
                                            <p className="mt-2 text-xs text-slate-500">Applicant: <span className="font-mono text-slate-400">{certificate.applicant}</span></p>
                                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                                                <span>Type: <b className="text-slate-300">{certificate.type}</b></span>
                                                <span>Score: <b className="text-slate-300">{certificate.score}</b></span>
                                                <span>Issued: <b className="text-slate-300">{certificate.date}</b></span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" onClick={() => alert(`Certificate hash: ${certificate.hash}`)} className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10">🔐 Hash</button>
                                        <button type="button" onClick={() => alert(`Transaction: ${certificate.txHash}`)} className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2.5 text-xs font-semibold text-blue-400 transition hover:bg-blue-500/20">⛓ Transaction</button>
                                        <button type="button" onClick={() => alert("Cloudinary certificate preview will open here.")} className="rounded-xl bg-emerald-600/90 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-600">👁 View</button>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-3 border-t border-white/5 pt-4 text-xs sm:grid-cols-2">
                                    <div>
                                        <span className="text-slate-600">Certificate Hash</span>
                                        <p className="mt-1 truncate font-mono text-slate-400">{certificate.hash}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-600">Transaction Hash</span>
                                        <p className="mt-1 truncate font-mono text-slate-400">{certificate.txHash}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default IssuedCertificates;