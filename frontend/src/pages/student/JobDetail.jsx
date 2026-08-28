import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MeshBackground from "../../components/common/MeshBackground";
import { getJobById, getMyApplications, applyToJob } from "../../services/employmentService";

function JobDetail() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  const [darkMode] = useState(() => localStorage.getItem("skillsync-theme") !== "light");

  useEffect(() => {
    fetchJobDetail();
  }, [jobId]);

  const fetchJobDetail = async () => {
    try {
      setLoading(true);
      const [jobData, myApplications] = await Promise.all([
        getJobById(jobId).catch(() => null),
        getMyApplications().catch(() => [])
      ]);

      setJob(jobData);
      const matched = (myApplications || []).find((app) => {
        const appJobId = typeof app.job === "object" ? app.job?._id : app.job;
        return appJobId === jobId;
      });
      setApplication(matched || null);
    } catch (error) {
      console.error("Fetch job detail error:", error);
      setJob(null);
      setApplication(null);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!job || !job.isActive) return;

    setApplying(true);
    setStatusMessage({ type: "info", text: "Submitting application..." });

    try {
      await applyToJob(jobId);
      await fetchJobDetail();
      setStatusMessage({ type: "success", text: "✓ Application submitted successfully." });
    } catch (error) {
      const errMsg = error?.response?.data?.message || error?.message || "Failed to submit application.";
      setStatusMessage({ type: "error", text: `❌ ${errMsg}` });
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className={`relative flex min-h-screen items-center justify-center overflow-hidden transition-colors duration-500 ${darkMode ? "bg-[#070B14] text-white" : "bg-[#F6F8FC] text-slate-900"}`}>
        <MeshBackground darkMode={darkMode} />
        <div className="relative z-10 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
          <p className="mt-4 text-sm text-slate-500">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className={`relative min-h-screen overflow-hidden px-6 py-10 ${darkMode ? "bg-[#070B14] text-white" : "bg-[#F6F8FC] text-slate-900"}`}>
        <MeshBackground darkMode={darkMode} />
        <div className="relative z-10 mx-auto max-w-3xl rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center text-red-400">
          <h1 className="text-2xl font-bold">Job not found</h1>
          <p className="mt-2 text-sm">This opportunity may no longer be available.</p>
          <Link to="/student/jobs" className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-500">
            Back to Jobs
          </Link>
        </div>
      </div>
    );
  }

  const canApply = job.isActive && !application;

  return (
    <div className={`relative min-h-screen overflow-hidden px-6 py-10 transition-colors duration-500 ${darkMode ? "bg-[#070B14] text-white" : "bg-[#F6F8FC] text-slate-900"}`}>
      <MeshBackground darkMode={darkMode} />
      <div className="relative z-10 mx-auto max-w-4xl">
        <div className={`mb-6 rounded-3xl border p-6 backdrop-blur-xl ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/85 shadow-sm"}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">Opportunity</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">{job.title}</h1>
              <p className="mt-2 text-sm text-slate-400">{job.organisation?.name || "Organisation"}</p>
            </div>
            <Link to="/student/jobs" className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20">
              ← Back to Jobs
            </Link>
          </div>
        </div>

        <div className={`rounded-3xl border p-8 backdrop-blur-xl ${darkMode ? "border-white/10 bg-white/[0.045]" : "border-slate-200 bg-white/90 shadow-sm"}`}>
          <div className="grid gap-6 lg:grid-cols-[1.7fr_0.9fr]">
            <div>
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">About the Role</p>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">{job.description}</p>
              </div>

              <div className="space-y-6">
                {job.requiredSkills?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Requirements</p>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-400">
                      {job.requiredSkills.map((skill, index) => <li key={`${skill}-${index}`}>{skill}</li>)}
                    </ul>
                  </div>
                )}

                {job.responsibilities && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Responsibilities</p>
                    <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">{job.responsibilities}</div>
                  </div>
                )}
              </div>
            </div>

            <div className={`rounded-3xl border p-5 ${darkMode ? "border-white/10 bg-black/10" : "border-slate-200 bg-slate-50"}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Job Details</p>
              <div className="mt-4 space-y-3 text-sm text-slate-400">
                <p><span className="font-semibold text-slate-500">Organisation:</span> {job.organisation?.name || "—"}</p>
                <p><span className="font-semibold text-slate-500">Location:</span> {job.location || "—"}</p>
                <p><span className="font-semibold text-slate-500">Employment Type:</span> {job.employmentType || "—"}</p>
                <p><span className="font-semibold text-slate-500">Stipend:</span> {job.stipend ? `₹${job.stipend}` : "—"}</p>
                <p><span className="font-semibold text-slate-500">Status:</span> {job.isActive ? "Open" : "Closed"}</p>
              </div>
            </div>
          </div>

          {statusMessage.text && (
            <div className={`mt-6 rounded-2xl p-4 text-sm font-medium ${statusMessage.type === "success" ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : statusMessage.type === "error" ? "border border-red-500/30 bg-red-500/10 text-red-400" : "border border-blue-500/30 bg-blue-500/10 text-blue-400"}`}>
              {statusMessage.text}
            </div>
          )}

          <div className="mt-8">
            {application ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-400">
                <p className="text-lg font-bold">✓ Applied</p>
                <p className="mt-2 text-sm">Status: {application.status || "Pending"}</p>
              </div>
            ) : (
              <button
                disabled={applying || !canApply}
                onClick={handleApply}
                className={`w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-500/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30 ${applying || !canApply ? "cursor-not-allowed opacity-60" : ""}`}
              >
                {applying ? "Submitting Application..." : job.isActive ? "Apply Now" : "Application Closed"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default JobDetail;
