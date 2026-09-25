import { Link } from "react-router-dom";

function OrganisationCertificates() {
    const stats = [
        { label: "Certificates Issued", value: "248", icon: "📜" },
        { label: "Verified Certificates", value: "241", icon: "✓" },
    ];

    return (
        <div className="min-h-screen bg-[#070B14] px-6 py-10 text-white lg:px-10">
            <div className="mx-auto max-w-7xl">
                <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">SkillSync</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight">Certificate Management</h1>
                        <p className="mt-2 text-sm text-slate-400">Issue certificates and manage blockchain-verified credentials.</p>
                    </div>
                    <Link to="/organisation" className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">← Dashboard</Link>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {stats.map((stat) => (
                        <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
                            <div className="flex items-center justify-between">
                                <span className="text-2xl">{stat.icon}</span>
                                <span className="text-3xl font-bold">{stat.value}</span>
                            </div>
                            <p className="mt-3 text-sm text-slate-400">{stat.label}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-8">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Certificate Operations</p>

                    <div className="grid gap-5 md:grid-cols-2">

                        <Link to="/organisation/certificates/issue" className="group rounded-3xl border border-white/10 bg-white/[0.04] p-7 transition hover:-translate-y-1 hover:border-violet-500/30 hover:bg-white/[0.06]">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-2xl">📜</div>
                            <h2 className="mt-5 text-xl font-bold">Issue Certificate</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-400">Upload certificates, generate their hash and register the proof on blockchain.</p>
                            <span className="mt-5 inline-block text-sm font-semibold text-violet-400 group-hover:text-violet-300">Issue Certificate →</span>
                        </Link>

                        <Link to="/organisation/certificates/issued" className="group rounded-3xl border border-white/10 bg-white/[0.04] p-7 transition hover:-translate-y-1 hover:border-emerald-500/30 hover:bg-white/[0.06]">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-2xl">📋</div>
                            <h2 className="mt-5 text-xl font-bold">Issued Certificates</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-400">View certificates issued by your organisation and their verification status.</p>
                            <span className="mt-5 inline-block text-sm font-semibold text-emerald-400 group-hover:text-emerald-300">View Certificates →</span>
                        </Link>

                        <Link to="/organisation/certificates/verify" className="group rounded-3xl border border-white/10 bg-white/[0.04] p-7 transition hover:-translate-y-1 hover:border-cyan-500/30 hover:bg-white/[0.06]">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-2xl">🔍</div>
                            <h2 className="mt-5 text-xl font-bold">Verify Certificate</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-400">Verify a certificate by comparing its file hash with the blockchain record.</p>
                            <span className="mt-5 inline-block text-sm font-semibold text-cyan-400 group-hover:text-cyan-300">Verify Now →</span>
                        </Link>
                    </div>
                </div>

                <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-xl">🔐</div>
                        <div>
                            <h3 className="font-semibold">Blockchain-backed certificates</h3>
                            <p className="mt-1 text-sm text-slate-400">Certificate files are stored securely while their cryptographic proof is recorded on-chain.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OrganisationCertificates;