import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ProfessionalProfile from "../../components/common/ProfessionalProfile";
import { getApplicantDetail } from "../../services/employmentService";
import MeshBackground from "../../components/common/MeshBackground";

const CandidateProfilePage = () => {
  const { jobId, applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode] = useState(() => localStorage.getItem("skillsync-theme") !== "light");

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        setLoading(true);
        const result = await getApplicantDetail(jobId, applicationId).catch(() => null);
        setApplication(result);
      } catch (error) {
        console.error("Candidate profile fetch failed:", error);
        setApplication(null);
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [jobId, applicationId]);

  if (loading) {
    return (
      <div className={`relative flex min-h-screen items-center justify-center overflow-hidden transition-colors duration-500 ${darkMode ? "bg-[#070B14] text-white" : "bg-[#F6F8FC] text-slate-900"}`}>
        <MeshBackground darkMode={darkMode} />
        <div className="relative z-10 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
          <p className="mt-4 text-sm text-slate-500">Loading candidate profile...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className={`relative min-h-screen overflow-hidden px-6 py-10 ${darkMode ? "bg-[#070B14] text-white" : "bg-[#F6F8FC] text-slate-900"}`}>
        <MeshBackground darkMode={darkMode} />
        <div className="relative z-10 mx-auto max-w-3xl rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center text-red-400">
          <h1 className="text-2xl font-bold">Candidate profile unavailable</h1>
          <p className="mt-2 text-sm">This profile is not accessible for your organisation.</p>
          <Link to={`/organisation/jobs/${jobId}/applications`} className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-500">Back to Applicants</Link>
        </div>
      </div>
    );
  }

  const student = application.student;

  return (
    <div className={`relative min-h-screen overflow-hidden px-6 py-10 transition-colors duration-500 ${darkMode ? "bg-[#070B14] text-white" : "bg-[#F6F8FC] text-slate-900"}`}>
      <MeshBackground darkMode={darkMode} />
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className={`mb-8 rounded-3xl border p-6 backdrop-blur-xl ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/90 shadow-sm"}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">Candidate Professional Profile</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">{student?.name || "Candidate"}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link to={`/organisation/jobs/${jobId}/applications/${applicationId}`} className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20">← Back to Applicant</Link>
            </div>
          </div>
        </div>

        <ProfessionalProfile
          walletAddress={student?.walletAddress}
          studentId={student?._id}
          studentName={student?.name}
          studentEmail={student?.email}
          darkMode={darkMode}
          subtitle="On-chain portfolio"
          viewerRole="ORGANISATION"
        />
      </div>
    </div>
  );
};

export default CandidateProfilePage;
