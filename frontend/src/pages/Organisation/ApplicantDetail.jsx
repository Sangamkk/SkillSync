import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getApplicantDetail } from "../../services/employmentService";
import { getCandidateCertificates } from "../../services/certificateService";
import { getCandidateProjects } from "../../services/projectService";
import { getStudentEmploymentById } from "../../services/employmentService";
import MeshBackground from "../../components/common/MeshBackground";

const formatAddress = (value) => {
  if (!value) return "—";
  return value.length > 20 ? `${value.slice(0, 8)}...${value.slice(-8)}` : value;
};

const normalizeHash = (value) => {
  if (!value) return "";
  const text = String(value).toLowerCase();
  return text.startsWith("0x") ? text : `0x${text}`;
};

function ApplicantDetail() {
  const { jobId, applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employmentHistory, setEmploymentHistory] = useState({ currentEmployment: [], previousEmployment: [] });
  const [loading, setLoading] = useState(true);
  const [darkMode] = useState(() => localStorage.getItem("skillsync-theme") !== "light");

  useEffect(() => {
    fetchApplicant();
  }, [jobId, applicationId]);

  const fetchApplicant = async () => {
    try {
      setLoading(true);
      const detail = await getApplicantDetail(jobId, applicationId).catch(() => null);
      setApplication(detail);

      const studentId = detail?.student?._id;

      // Certificates — from REST API
      const certRes = studentId ? await getCandidateCertificates(studentId).catch(() => []) : [];
      setCertificates(Array.isArray(certRes?.certificates) ? certRes.certificates : Array.isArray(certRes) ? certRes : []);

      // Projects — from REST API
      const projRes = studentId ? await getCandidateProjects(studentId).catch(() => []) : [];
      const projList = Array.isArray(projRes?.projects) ? projRes.projects : Array.isArray(projRes) ? projRes : [];
      setProjects(projList.map((p) => ({
        ...p,
        name: p.projectName || "Project",
        hash: p.githubHash || p.projectHash || p._id || "",
        isVerified: p.status === "APPROVED",
        verificationHistory: p.verificationHistory || []
      })));

      // Employment history — from REST API
      const empRes = studentId ? await getStudentEmploymentById(studentId).catch(() => ({})) : {};
      setEmploymentHistory({
        currentEmployment: empRes?.currentEmployment || [],
        previousEmployment: empRes?.previousEmployment || []
      });
    } catch (error) {
      console.error("Applicant detail fetch error:", error);
      setApplication(null);
      setCertificates([]);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`relative flex min-h-screen items-center justify-center overflow-hidden transition-colors duration-500 ${darkMode ? "bg-[#070B14] text-white" : "bg-[#F6F8FC] text-slate-900"}`}>
        <MeshBackground darkMode={darkMode} />
        <div className="relative z-10 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
          <p className="mt-4 text-sm text-slate-500">Loading applicant details...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className={`relative min-h-screen overflow-hidden px-6 py-10 ${darkMode ? "bg-[#070B14] text-white" : "bg-[#F6F8FC] text-slate-900"}`}>
        <MeshBackground darkMode={darkMode} />
        <div className="relative z-10 mx-auto max-w-3xl rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center text-red-400">
          <h1 className="text-2xl font-bold">Applicant not found</h1>
          <p className="mt-2 text-sm">This application is not accessible for your organisation.</p>
          <Link to={`/organisation/jobs/${jobId}/applications`} className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-500">Back to Applicants</Link>
        </div>
      </div>
    );
  }

  const student = application.student;
  const job = application.job;
  const organisationName = application.organisation?.organisationName || application.organisation?.name || application.job?.organisation?.organisationName || application.job?.organisation?.name || "Organisation";

  return (
    <div className={`relative min-h-screen overflow-hidden px-6 py-10 transition-colors duration-500 ${darkMode ? "bg-[#070B14] text-white" : "bg-[#F6F8FC] text-slate-900"}`}>
      <MeshBackground darkMode={darkMode} />
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className={`mb-8 rounded-3xl border p-6 backdrop-blur-xl ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/85 shadow-sm"}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">Applicant Review</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">{student?.name || "Applicant"}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link to={`/organisation/jobs/${jobId}/applications/${applicationId}/profile`} className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:opacity-95">View Candidate Profile →</Link>
              <Link to={`/organisation/jobs/${jobId}/applications`} className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20">← Back to Applicants</Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className={`rounded-3xl border p-6 ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/90 shadow-sm"}`}>
              <h2 className="text-xl font-bold">Candidate Information</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className={`rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-black/10" : "border-slate-200 bg-slate-50"}`}><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Name</p><p className="mt-2 text-sm font-medium">{student?.name || "—"}</p></div>
                <div className={`rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-black/10" : "border-slate-200 bg-slate-50"}`}><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</p><p className="mt-2 text-sm font-medium">{student?.email || "—"}</p></div>
                <div className={`rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-black/10" : "border-slate-200 bg-slate-50"}`}><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">College</p><p className="mt-2 text-sm font-medium">{student?.college || "—"}</p></div>
                <div className={`rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-black/10" : "border-slate-200 bg-slate-50"}`}><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">USN</p><p className="mt-2 text-sm font-medium">{student?.usn || "—"}</p></div>
                <div className={`rounded-2xl border p-4 sm:col-span-2 ${darkMode ? "border-white/10 bg-black/10" : "border-slate-200 bg-slate-50"}`}><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Wallet</p><p className="mt-2 break-all font-mono text-xs">{student?.walletAddress || "—"}</p></div>
              </div>
            </div>

            <div className={`rounded-3xl border p-6 ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/90 shadow-sm"}`}>
              <h2 className="text-xl font-bold">Projects & Verification History</h2>
              <div className="mt-5 space-y-4">
                {projects.length === 0 ? (
                  <p className="text-sm text-slate-400">No project records found for this applicant.</p>
                ) : (
                  projects.map((project) => (
                    <div key={project.hash} className={`rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-black/10" : "border-slate-200 bg-slate-50"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{project.name || "Project"}</p>
                          <p className="text-[11px] text-slate-500">{project.projectType || "Project"}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${project.isVerified ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>{project.isVerified ? "Verified" : "Registered"}</span>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                        <p><span className="font-semibold text-slate-500">GitHub:</span> {project.githubLink ? <a href={project.githubLink} target="_blank" rel="noreferrer" className="text-violet-400 underline">{project.githubLink}</a> : "—"}</p>
                        <p><span className="font-semibold text-slate-500">Project ID:</span> <span className="font-mono">{project.hash ? `${project.hash.slice(0, 12)}...${project.hash.slice(-10)}` : "—"}</span></p>
                        <p className="sm:col-span-2"><span className="font-semibold text-slate-500">Description:</span> {project.description || "No description provided."}</p>
                      </div>
                      <div className="mt-4 rounded-xl border border-slate-200/60 bg-white/60 p-3 text-[11px] text-slate-500">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Verification History</p>
                        {(project.verificationHistory || []).length === 0 ? (
                          <p className="text-sm text-slate-400">No verification records yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {project.verificationHistory.map((verification, index) => (
                              <div key={`${project.hash}-${index}`} className="rounded-xl border border-slate-200/60 p-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${verification.label === "VERIFIED" ? "bg-emerald-500/10 text-emerald-400" : verification.label === "REVOKED" ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"}`}>{verification.label || "UNKNOWN"}</span>
                                </div>
                                {verification.verifier && <p className="mt-2">Verified by: {verification.verifier}</p>}
                                {verification.wallet && <p>Wallet: {verification.wallet}</p>}
                                {(verification.verifiedAt || verification.createdAt) && <p>Date: {new Date(Number(verification.verifiedAt || verification.createdAt) * 1000).toLocaleString()}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={`rounded-3xl border p-6 ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/90 shadow-sm"}`}>
              <h2 className="text-xl font-bold">Certificates</h2>
              <div className="mt-5 space-y-3">
                {certificates.length === 0 ? (
                  <p className="text-sm text-slate-400">No certificate records found.</p>
                ) : (
                  certificates.map((cert) => (
                    <div key={cert._id || cert.certificateHash} className={`rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-black/10" : "border-slate-200 bg-slate-50"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{cert.certificateName || "Certificate"}</p>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${cert.verificationStatus === "Verified" ? "bg-emerald-500/10 text-emerald-400" : cert.verificationStatus === "Rejected" ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"}`}>{cert.verificationStatus || "Pending"}</span>
                      </div>
                      <div className="mt-2 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                        <p><span className="font-semibold text-slate-500">Issuer:</span> {cert.issuer || "—"}</p>
                        <p><span className="font-semibold text-slate-500">Type:</span> {cert.certificateType || "—"}</p>
                        <p><span className="font-semibold text-slate-500">Hash:</span> <span className="font-mono text-[10px]">{cert.certificateHash ? `${cert.certificateHash.slice(0, 12)}...` : "—"}</span></p>
                        <p><span className="font-semibold text-slate-500">Date:</span> {cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : "—"}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`rounded-3xl border p-6 ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/90 shadow-sm"}`}>
              <h2 className="text-xl font-bold">Application Details</h2>
              <div className="mt-5 space-y-3 text-sm text-slate-400">
                <p><span className="font-semibold text-slate-500">Job:</span> {job?.title || "—"}</p>
                <p><span className="font-semibold text-slate-500">Employment type:</span> {job?.employmentType || "—"}</p>
                <p><span className="font-semibold text-slate-500">Location:</span> {job?.location || "—"}</p>
                <p><span className="font-semibold text-slate-500">Organisation:</span> {organisationName}</p>
                <p><span className="font-semibold text-slate-500">Status:</span> {application.status || "Applied"}</p>
                <p><span className="font-semibold text-slate-500">Applied:</span> {application.createdAt ? new Date(application.createdAt).toLocaleDateString() : "—"}</p>
                <p><span className="font-semibold text-slate-500">Wallet:</span> <span className="font-mono text-[10px]">{formatAddress(student?.walletAddress)}</span></p>
              </div>
            </div>

            <div className={`rounded-3xl border p-6 ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/90 shadow-sm"}`}>
              <h2 className="text-xl font-bold">Employment History</h2>
              <div className="mt-5 space-y-4">
                <div>
                  <p className="mb-2 text-sm font-semibold text-emerald-500">Current Employment</p>
                  {employmentHistory.currentEmployment.length === 0 ? (
                    <p className="text-sm text-slate-400">No active employment record.</p>
                  ) : (
                    employmentHistory.currentEmployment.map((record) => (
                      <div key={record.hash || record.employmentHash} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-slate-500">
                        <p className="font-semibold text-slate-800">{record.organisation || "Organisation"}</p>
                        <p>Type: {record.employmentType || "Employment"}</p>
                        <p>Offer ID: {record.offerId ?? "—"}</p>
                        <p>Started: {record.joinedAt ? new Date(record.joinedAt * 1000).toLocaleDateString() : "—"}</p>
                        <p>Status: {record.status || "ACTIVE"}</p>
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-violet-500">Previous Employment</p>
                  {employmentHistory.previousEmployment.length === 0 ? (
                    <p className="text-sm text-slate-400">No previous employment record.</p>
                  ) : (
                    employmentHistory.previousEmployment.map((record) => (
                      <div key={record.hash || record.employmentHash} className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-3 text-sm text-slate-500">
                        <p className="font-semibold text-slate-800">{record.organisation || "Organisation"}</p>
                        <p>Type: {record.employmentType || "Employment"}</p>
                        <p>Offer ID: {record.offerId ?? "—"}</p>
                        <p>Started: {record.joinedAt ? new Date(record.joinedAt * 1000).toLocaleDateString() : "—"}</p>
                        <p>Ended: {record.endedAt ? new Date(record.endedAt * 1000).toLocaleDateString() : "—"}</p>
                        <p>Status: {record.status || "TERMINATED"}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className={`rounded-3xl border p-6 ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/90 shadow-sm"}`}>
              <h2 className="text-xl font-bold">Employment Offer</h2>
              <div className="mt-5 space-y-3 text-sm text-slate-400">
                <p><span className="font-semibold text-slate-500">Offer ID:</span> {application.offerId ?? "—"}</p>
                <p><span className="font-semibold text-slate-500">Status:</span> {application.status || "Applied"}</p>
                <p><span className="font-semibold text-slate-500">Employment hash:</span> <span className="font-mono text-[10px]">{application.employmentHash || "—"}</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApplicantDetail;
