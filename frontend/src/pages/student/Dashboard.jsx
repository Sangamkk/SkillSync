import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getProfile } from "../../services/studentService";
import { getStudentCertificates } from "../../services/certificateService";
import { getStudentProjectsFromBlockchain, getStudentEmploymentOnChain } from "../../services/blockchainService";
import { getMyApplications, getMyOffers } from "../../services/employmentService";
import { getStudentProjects } from "../../services/projectService";
import { getStudentRequests } from "../../services/requestService";
import { useNavigate, Link } from "react-router-dom";
import MeshBackground from "../../components/common/MeshBackground";
import ProfessionalProfile from "../../components/common/ProfessionalProfile";
import ApplicantManagerAbi from "../../abhi/ApplicantManager.json";

const normalizeToArray = (value) => {
    if (value == null) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "object") {
        if (Array.isArray(value.certificates)) return value.certificates;
        if (Array.isArray(value.projects)) return value.projects;
        if (Array.isArray(value.projectHashes)) return value.projectHashes;
        if (Array.isArray(value.data)) return value.data;
        if (Array.isArray(value.items)) return value.items;
        if (Array.isArray(value.results)) return value.results;
        if (typeof value[Symbol.iterator] === "function") return Array.from(value);
        return [];
    }
    return [];
};

const normalizeHash = (value) => {
    if (!value) return "";
    const text = String(value).toLowerCase();
    return text.startsWith("0x") ? text : `0x${text}`;
};

const formatHash = (value) => {
    if (!value) return "—";
    const hash = normalizeHash(value);
    return hash.length > 18 ? `${hash.slice(0, 12)}...${hash.slice(-10)}` : hash;
};

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [studentId, setStudentId] = useState(null);
    const [projects, setProjects] = useState([]);
    const [certificates, setCertificates] = useState([]);
    const [employmentHistory, setEmploymentHistory] = useState({ currentEmployment: [], previousEmployment: [] });
    const [stats, setStats] = useState({ certificates: 0, verifiedCertificates: 0, projects: 0, approvedProjects: 0, offers: 0, applications: 0 });
    const [darkMode] = useState(() => localStorage.getItem("skillsync-theme") !== "light");
    const navigate = useNavigate();

    useEffect(() => {
        fetchProfileAndStats();
    }, []);

    const fetchProfileAndStats = async () => {
        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;

            const userData = JSON.parse(userStr);
            const walletAddress = userData.walletAddress;
            const profile = await getProfile(walletAddress);
            setUser(profile);

            const resolvedStudentId = profile?._id || userData.id || userData._id;
            setStudentId(resolvedStudentId);
            const blockchainProjectStats = await getStudentProjectsFromBlockchain(walletAddress);
            const projectMetadata = await getStudentProjects(studentId).catch(() => []);
            const requests = await getStudentRequests().catch(() => []);

            const [certs, apps, offers] = await Promise.all([
                getStudentCertificates(resolvedStudentId).catch(() => []),
                getMyApplications().catch(() => []),
                getMyOffers().catch(() => [])
            ]);

            const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com");
            const contract = new ethers.Contract(import.meta.env.VITE_APPLICANT_MANAGER_ADDRESS, ApplicantManagerAbi.abi, provider);

            const metadataMap = new Map(
                (Array.isArray(projectMetadata) ? projectMetadata : []).map((project) => [normalizeHash(project.githubHash || project.projectHash || project._id), project])
            );

            const projectHashes = normalizeToArray(blockchainProjectStats?.projectHashes ?? blockchainProjectStats?.projects ?? []);
            const projectRecords = await Promise.all(
                projectHashes.map(async (projectHash) => {
                    const normalizedHash = normalizeHash(projectHash);
                    const metadata = metadataMap.get(normalizedHash) || metadataMap.get(normalizeHash(String(projectHash).replace(/^0x/, ""))) || {};

                    let verifications = [];
                    try {
                        verifications = await contract.getProjectVerifications(normalizedHash);
                    } catch (error) {
                        console.warn("Verification fetch failed for project hash:", normalizedHash, error);
                    }

                    const history = [
                        ...(Array.isArray(verifications) ? verifications : []).map((item) => ({
                            label: item.revoked ? "REVOKED" : "VERIFIED",
                            verifier: item.verifier,
                            wallet: item.verifier,
                            verifiedAt: Number(item.verifiedAt),
                            revoked: Boolean(item.revoked)
                        })),
                        ...requests
                            .filter((request) => normalizeHash(request.credentialHash) === normalizedHash)
                            .map((request) => ({
                                label: "PENDING",
                                expectedVerifier: request.expectedVerifier,
                                requestId: request.id,
                                createdAt: Number(request.createdAt),
                                wallet: request.expectedVerifier
                            }))
                    ];

                    return {
                        hash: normalizedHash,
                        name: metadata.projectName || "Project",
                        projectType: metadata.projectType || "Project",
                        githubLink: metadata.githubLink || "",
                        description: metadata.description || "",
                        isVerified: await contract.isProjectVerified(normalizedHash).catch(() => false),
                        onChainRegistered: true,
                        verificationHistory: history
                    };
                })
            );

            const certList = normalizeToArray(certs);
            const appList = normalizeToArray(apps);
            const offerList = normalizeToArray(offers);
            const employmentOnChain = walletAddress ? await getStudentEmploymentOnChain(walletAddress) : { currentEmployment: [], previousEmployment: [] };

            setProjects(projectRecords);
            setCertificates(certList);
            setEmploymentHistory(employmentOnChain);

            setStats({
                certificates: certList.length,
                verifiedCertificates: certList.filter((c) => c.verificationStatus === "Verified").length,
                projects: Number(blockchainProjectStats?.projects ?? projectRecords.length ?? 0),
                approvedProjects: Number(blockchainProjectStats?.verifiedProjects ?? 0),
                applications: appList.length,
                offers: offerList.filter((o) => o.status === "Offered" || o.status === "Pending").length
            });
        } catch (error) {
            console.error("Dashboard profile/stats fetch error:", error);
        }
    };

    const nxtPage = () => navigate("/certificate");

    return (
        <div className={`relative min-h-screen overflow-hidden px-6 py-10 transition-colors duration-500 ${darkMode ? "bg-[#070B14] text-white" : "bg-[#F6F8FC] text-slate-900"}`}>
            <MeshBackground darkMode={darkMode} />
            <div className={`pointer-events-none fixed -left-40 -top-40 h-96 w-96 rounded-full blur-[130px] ${darkMode ? "bg-blue-600/15" : "bg-blue-500/10"}`} />
            <div className={`pointer-events-none fixed -bottom-40 -right-40 h-96 w-96 rounded-full blur-[130px] ${darkMode ? "bg-violet-600/15" : "bg-violet-500/10"}`} />

            <div className="relative z-10 mx-auto max-w-6xl">
                <div className={`mb-6 rounded-3xl border p-7 backdrop-blur-xl ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/85 shadow-sm"}`}>
                    <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">Student Dashboard</p>
                            <h1 className={`mt-2 text-3xl font-bold tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
                                Welcome back{user?.name ? `, ${user.name}` : ""}
                            </h1>
                            <p className={`mt-2 text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                Manage your digital identity and professional credentials.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2 sm:items-center">
                            <Link to="/student/jobs" className="rounded-xl bg-blue-600/90 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-600">💼 Browse Jobs</Link>
                            <Link to="/student/offers" className="rounded-xl bg-violet-600/90 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-600">✉ Offers {stats.offers > 0 && `(${stats.offers})`}</Link>
                            <Link to="/student/project/add" className="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-700">🚀 Add Project</Link>
                            <Link to="/student/projects" className="rounded-xl bg-slate-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-600">📁 My Projects</Link>
                            <Link to="/student/project/verify" className="rounded-xl bg-indigo-600/90 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-600">📜 Request Verification</Link>
                        </div>
                    </div>
                </div>

                <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className={`rounded-2xl border p-5 backdrop-blur-xl ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white shadow-sm"}`}>
                        <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Certificates</p><span className="text-lg">📜</span></div>
                        <div className="mt-3 flex items-baseline justify-between"><p className="text-2xl font-bold">{stats.certificates}</p><span className="text-xs font-semibold text-emerald-400">{stats.verifiedCertificates} Verified</span></div>
                    </div>
                    <div className={`rounded-2xl border p-5 backdrop-blur-xl ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white shadow-sm"}`}>
                        <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Projects</p><span className="text-lg">📂</span></div>
                        <div className="mt-3 flex items-baseline justify-between"><p className="text-2xl font-bold">{stats.projects}</p><span className="text-xs font-semibold text-emerald-400">{stats.approvedProjects} Verified</span></div>
                    </div>
                    <div className={`rounded-2xl border p-5 backdrop-blur-xl ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white shadow-sm"}`}>
                        <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Applications</p><span className="text-lg">💼</span></div>
                        <div className="mt-3 flex items-baseline justify-between"><p className="text-2xl font-bold">{stats.applications}</p><span className="text-xs text-slate-400">Submitted</span></div>
                    </div>
                    <div className={`rounded-2xl border p-5 backdrop-blur-xl ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white shadow-sm"}`}>
                        <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Job Offers</p><span className="text-lg">✉</span></div>
                        <div className="mt-3 flex items-baseline justify-between"><p className="text-2xl font-bold">{stats.offers}</p><span className="text-xs font-semibold text-violet-400">Pending Action</span></div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">
                    <div className={`rounded-3xl border p-7 backdrop-blur-xl ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/85 shadow-sm"}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">Profile</p>
                                <h2 className={`mt-2 text-2xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>Student Information</h2>
                            </div>
                            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${darkMode ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"}`}>◈</div>
                        </div>

                        <div className="mt-8 grid gap-4 sm:grid-cols-2">
                            <div className={`rounded-2xl p-5 ${darkMode ? "bg-white/[0.035]" : "bg-slate-50"}`}>
                                <p className="text-xs uppercase tracking-wider text-slate-500">Full Name</p>
                                <p className={`mt-2 font-semibold ${darkMode ? "text-slate-100" : "text-slate-800"}`}>{user?.name || "—"}</p>
                            </div>
                            <div className={`rounded-2xl p-5 ${darkMode ? "bg-white/[0.035]" : "bg-slate-50"}`}>
                                <p className="text-xs uppercase tracking-wider text-slate-500">Email</p>
                                <p className={`mt-2 break-all font-semibold ${darkMode ? "text-slate-100" : "text-slate-800"}`}>{user?.email || "—"}</p>
                            </div>
                            <div className={`rounded-2xl p-5 ${darkMode ? "bg-white/[0.035]" : "bg-slate-50"}`}>
                                <p className="text-xs uppercase tracking-wider text-slate-500">USN</p>
                                <p className={`mt-2 font-semibold ${darkMode ? "text-slate-100" : "text-slate-800"}`}>{user?.usn || "—"}</p>
                            </div>
                            <div className={`rounded-2xl p-5 ${darkMode ? "bg-white/[0.035]" : "bg-slate-50"}`}>
                                <p className="text-xs uppercase tracking-wider text-slate-500">College</p>
                                <p className={`mt-2 font-semibold ${darkMode ? "text-slate-100" : "text-slate-800"}`}>{user?.college || "—"}</p>
                            </div>
                        </div>

                        <div className={`mt-4 rounded-2xl border p-5 ${darkMode ? "border-blue-500/10 bg-blue-500/[0.04]" : "border-blue-100 bg-blue-50/50"}`}>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-lg">🦊</div>
                                <div className="min-w-0">
                                    <p className="text-xs uppercase tracking-wider text-slate-500">Connected Wallet</p>
                                    <p className={`mt-1 break-all font-mono text-xs ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{user?.walletAddress || "—"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`relative overflow-hidden rounded-3xl border p-7 backdrop-blur-xl ${darkMode ? "border-white/10 bg-[#111827]/90" : "border-slate-200 bg-white/85 shadow-sm"}`}>
                        <div className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-[80px] ${darkMode ? "bg-blue-600/15" : "bg-blue-500/10"}`} />
                        <div className="relative">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">Digital Identity</p>
                            <div className="mt-8 flex items-center justify-center">
                                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-violet-600/10">
                                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-3xl font-bold text-white shadow-xl shadow-blue-500/20">
                                        {user?.name ? user.name.charAt(0).toUpperCase() : "S"}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-7 text-center">
                                <h3 className={`text-xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{user?.name || "Student"}</h3>
                                <p className="mt-1 text-sm text-slate-500">{user?.role || "STUDENT"}</p>
                            </div>
                            <div className={`mt-7 rounded-2xl border p-4 text-center ${darkMode ? "border-emerald-500/20 bg-emerald-500/[0.05]" : "border-emerald-200 bg-emerald-50"}`}>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    <span className="text-sm font-semibold text-emerald-500">Identity Active</span>
                                </div>
                                <p className="mt-2 text-xs text-slate-500">Connected to SkillSync blockchain</p>
                            </div>
                        </div>
                    </div>
                </div>

                <ProfessionalProfile
                    walletAddress={user?.walletAddress || localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user") || "{}").walletAddress : ""}
                    studentId={studentId}
                    studentName={user?.name}
                    studentEmail={user?.email}
                    darkMode={darkMode}
                    subtitle="On-chain portfolio"
                />

                <div className={`mt-6 rounded-3xl border p-7 backdrop-blur-xl ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/85 shadow-sm"}`}>
                    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">Credentials</p>
                            <h2 className={`mt-2 text-2xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>Manage Certificates</h2>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Upload and manage your academic and professional certificates.</p>
                        </div>
                        <button onClick={nxtPage} className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">View Certificates →</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;