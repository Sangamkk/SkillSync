import { useEffect, useState } from "react";
import { loadProfessionalProfile, normalizeHash } from "../../services/professionalProfileService";

const formatHash = (value) => {
  if (!value) return "—";
  const hash = normalizeHash(value);
  if (!hash) return "—";
  return hash.length > 18 ? `${hash.slice(0, 12)}...${hash.slice(-10)}` : hash;
};

const ProfessionalProfile = ({
  walletAddress,
  studentId,
  studentName,
  studentEmail,
  darkMode = false,
  subtitle = "On-chain portfolio",
  compact = false,
  viewerRole = "STUDENT",
}) => {
  const [projects, setProjects] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [employmentHistory, setEmploymentHistory] = useState({ currentEmployment: [], previousEmployment: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchProfileData = async () => {
      try {
        setLoading(true);

        if (!walletAddress) {
          setProjects([]);
          setCertificates([]);
          setEmploymentHistory({ currentEmployment: [], previousEmployment: [] });
          return;
        }

        const profile = await loadProfessionalProfile({ walletAddress, studentId, viewerRole });

        if (!active) return;

        setProjects(profile.projects);
        setCertificates(profile.certificates);
        setEmploymentHistory({
          currentEmployment: profile.currentEmployment,
          previousEmployment: profile.previousEmployment,
        });
      } catch (error) {
        console.error("Professional profile fetch error:", error);
        if (active) {
          setProjects([]);
          setCertificates([]);
          setEmploymentHistory({ currentEmployment: [], previousEmployment: [] });
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProfileData();

    return () => {
      active = false;
    };
  }, [walletAddress, studentId, viewerRole]);

  const profileContainer = compact
    ? "rounded-3xl border p-5"
    : "mt-6 rounded-3xl border p-7 backdrop-blur-xl";

  const sectionClass = darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50";

  return (
    <div className={`${profileContainer} ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/85 shadow-sm"}`}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">PROFESSIONAL PROFILE</p>
          <h2 className={`mt-2 text-2xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{subtitle}</h2>
        </div>
      </div>

      <div className={`rounded-3xl border p-5 ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/85 shadow-sm"}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">Candidate</p>
            <h3 className={`mt-2 text-2xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{studentName || "Candidate"}</h3>
            <p className={`mt-1 text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{studentEmail || "No email available"}</p>
          </div>
          <div className={`rounded-2xl border px-4 py-3 text-sm ${darkMode ? "border-white/10 bg-black/10 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Wallet</p>
            <p className="mt-1 font-mono text-xs break-all">{walletAddress || "—"}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white/80 p-8 text-center text-slate-500">Loading professional profile...</div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className={`rounded-3xl border p-5 ${sectionClass}`}>
            <h3 className="mb-4 text-lg font-semibold">Projects</h3>
            {projects.length === 0 ? (
              <p className="text-sm text-slate-400">No verified projects found.</p>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <div key={project.hash} className={`rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-[#0b1020]" : "border-slate-200 bg-white"}`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-base font-semibold">{project.name || "Project"}</p>
                        <p className="text-xs text-slate-500">{project.projectType || "Project"}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${project.isVerified ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                        {project.isVerified ? "Verified" : "Registered"}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 text-sm text-slate-400 sm:grid-cols-2">
                      <p>
                        <span className="font-semibold text-slate-500">GitHub:</span>{" "}
                        {project.githubLink ? (
                          <a href={project.githubLink} target="_blank" rel="noreferrer" className="text-violet-400 underline">
                            {project.githubLink}
                          </a>
                        ) : (
                          "—"
                        )}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-500">Project ID:</span>{" "}
                        <span className="font-mono text-[11px] text-slate-200">{formatHash(project.hash)}</span>
                      </p>
                      <p className="sm:col-span-2">
                        <span className="font-semibold text-slate-500">Description:</span> {project.description || "No description provided."}
                      </p>
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-200/60 bg-white/60 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Verification History</p>
                      {(project.verificationHistory || []).length === 0 ? (
                        <p className="text-sm text-slate-400">No verification records yet for this project.</p>
                      ) : (
                        <div className="space-y-2">
                          {project.verificationHistory.map((entry, index) => (
                            <div key={`${project.hash}-${index}`} className="rounded-xl border border-slate-200/60 p-3 text-xs text-slate-500">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                                  entry.status === "VERIFIED"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : entry.status === "PENDING"
                                      ? "bg-amber-500/10 text-amber-400"
                                      : entry.status === "REJECTED"
                                        ? "bg-rose-500/10 text-rose-400"
                                        : "bg-slate-500/10 text-slate-400"
                                }`}>
                                  {entry.status || "UNKNOWN"}
                                </span>
                              </div>
                              {entry.verifierOrganisation && <p className="mt-2">Verified by: {entry.verifierOrganisation}</p>}
                              {entry.verifier && <p>Wallet: {formatHash(entry.verifier)}</p>}
                              {entry.requestId && <p>Request #: {entry.requestId}</p>}
                              {(entry.verifiedAt || entry.createdAt) && (
                                <p>Date: {new Date(Number(entry.verifiedAt || entry.createdAt) * 1000).toLocaleString()}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`rounded-3xl border p-5 ${sectionClass}`}>
            <h3 className="mb-4 text-lg font-semibold">Certificates</h3>
            {certificates.length === 0 ? (
              <p className="text-sm text-slate-400">No certificates available.</p>
            ) : (
              <div className="space-y-3">
                {certificates.map((certificate) => (
                  <div key={certificate._id || certificate.certificateHash} className={`rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-[#0b1020]" : "border-slate-200 bg-white"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{certificate.certificateName || "Certificate"}</p>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${certificate.verificationStatus === "Verified" ? "bg-emerald-500/10 text-emerald-400" : certificate.verificationStatus === "Rejected" ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"}`}>
                        {certificate.verificationStatus || "Pending"}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                      <p><span className="font-semibold text-slate-500">Issuer:</span> {certificate.issuer || "—"}</p>
                      <p><span className="font-semibold text-slate-500">Issuer Wallet:</span> {certificate.issuerWallet ? formatHash(certificate.issuerWallet) : "—"}</p>
                      <p><span className="font-semibold text-slate-500">Verified by:</span> {certificate.verifiedBy || "—"}</p>
                      <p><span className="font-semibold text-slate-500">Type:</span> {certificate.certificateType || "—"}</p>
                      <p><span className="font-semibold text-slate-500">Hash:</span> <span className="font-mono text-[10px]">{certificate.certificateHash ? `${certificate.certificateHash.slice(0, 12)}...` : "—"}</span></p>
                      <p><span className="font-semibold text-slate-500">Issued:</span> {certificate.issueDate ? new Date(certificate.issueDate).toLocaleDateString() : "—"}</p>
                      <p><span className="font-semibold text-slate-500">Verified:</span> {certificate.verificationDate ? new Date(Number(certificate.verificationDate) * 1000).toLocaleDateString() : "—"}</p>
                    </div>
                    {(certificate.requestHistory || []).length > 0 && (
                      <div className="mt-3 border-t border-slate-200/60 pt-3 text-xs text-slate-400">
                        <p className="font-semibold text-slate-500">Verification Requests</p>
                        {certificate.requestHistory.map((request) => (
                          <p key={request.requestId} className="mt-1">
                            #{request.requestId} {request.status} {request.expectedVerifierName || formatHash(request.expectedVerifier)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`rounded-3xl border p-5 ${sectionClass}`}>
            <h3 className="mb-4 text-lg font-semibold">Current Employment</h3>
            {employmentHistory.currentEmployment.length === 0 ? (
              <p className="text-sm text-slate-400">No active employment record.</p>
            ) : (
              <div className="space-y-3">
                {employmentHistory.currentEmployment.map((record) => (
                  <div key={record.hash || record.employmentHash} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-slate-500">
                    <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-800">{record.role || "Role"}</p>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase text-emerald-400">{record.status || "ACTIVE"}</span>
                    </div>
                    <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                      <p><span className="font-semibold text-slate-500">Organisation:</span> {record.organisation || "Organisation"}</p>
                      <p><span className="font-semibold text-slate-500">Employment Type:</span> {record.employmentType || "Employment"}</p>
                      <p><span className="font-semibold text-slate-500">Started:</span> {record.joinedAt ? new Date(record.joinedAt * 1000).toLocaleDateString() : "—"}</p>
                      <p><span className="font-semibold text-slate-500">Offer ID:</span> {record.offerId ?? "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`rounded-3xl border p-5 ${sectionClass}`}>
            <h3 className="mb-4 text-lg font-semibold">Previous Employment</h3>
            {employmentHistory.previousEmployment.length === 0 ? (
              <p className="text-sm text-slate-400">No previous employment records.</p>
            ) : (
              <div className="space-y-3">
                {employmentHistory.previousEmployment.map((record) => (
                  <div key={record.hash || record.employmentHash} className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm text-slate-500">
                    <p className="font-semibold text-slate-800">{record.role || "Role"}</p>
                    <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                      <p><span className="font-semibold text-slate-500">Organisation:</span> {record.organisation || "Organisation"}</p>
                      <p><span className="font-semibold text-slate-500">Employment Type:</span> {record.employmentType || "Employment"}</p>
                      <p><span className="font-semibold text-slate-500">Started:</span> {record.joinedAt ? new Date(record.joinedAt * 1000).toLocaleDateString() : "—"}</p>
                      <p><span className="font-semibold text-slate-500">Ended:</span> {record.endedAt ? new Date(record.endedAt * 1000).toLocaleDateString() : "—"}</p>
                      <p className="sm:col-span-2"><span className="font-semibold text-slate-500">Final status:</span> {record.status || "TERMINATED"}</p>
                      <p className="sm:col-span-2"><span className="font-semibold text-slate-500">Offer ID:</span> {record.offerId ?? "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalProfile;
