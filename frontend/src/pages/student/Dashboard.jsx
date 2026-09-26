import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getCertificates } from "../../services/certificateService";
import { getMyApplications, getMyOffers, getMyEmployment } from "../../services/employmentService";
import { getStudentProjects } from "../../services/projectService";
import MeshBackground from "../../components/common/MeshBackground";
import ProfessionalProfile from "../../components/common/ProfessionalProfile";

const StatCard = ({ label, value, sub, color, link, darkMode }) => (
  <Link
    to={link || "#"}
    className={`group block rounded-2xl border p-5 transition-all hover:scale-[1.02] ${
      darkMode
        ? "border-white/10 bg-white/[0.04] hover:border-white/20"
        : "border-slate-200 bg-white shadow-sm hover:shadow-md"
    }`}
  >
    <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${color}`}>{label}</p>
    <p className={`text-4xl font-bold mb-1 ${darkMode ? "text-white" : "text-gray-900"}`}>{value}</p>
    {sub !== undefined && (
      <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>{sub}</p>
    )}
  </Link>
);

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [studentId, setStudentId] = useState(null);
  const [stats, setStats] = useState({
    certificates: 0,
    verifiedCertificates: 0,
    pendingCertificates: 0,
    projects: 0,
    approvedProjects: 0,
    offers: 0,
    applications: 0,
    activeEmployment: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [darkMode] = useState(() => localStorage.getItem("skillsync-theme") !== "light");

  useEffect(() => {
    if (!currentUser) return;
    setStudentId(currentUser._id || currentUser.id);
    fetchStats();
  }, [currentUser]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const [certsRes, appsRes, offersRes, projectsRes, empRes] = await Promise.allSettled([
        getCertificates(),
        getMyApplications(),
        getMyOffers(),
        getStudentProjects(),
        getMyEmployment(),
      ]);

      const certs = Array.isArray(certsRes.value?.certificates)
        ? certsRes.value.certificates
        : Array.isArray(certsRes.value) ? certsRes.value : [];

      const apps = Array.isArray(appsRes.value?.applications)
        ? appsRes.value.applications
        : Array.isArray(appsRes.value) ? appsRes.value : [];

      const offers = Array.isArray(offersRes.value?.offers)
        ? offersRes.value.offers
        : Array.isArray(offersRes.value) ? offersRes.value : [];

      const projects = Array.isArray(projectsRes.value?.projects)
        ? projectsRes.value.projects
        : Array.isArray(projectsRes.value) ? projectsRes.value : [];

      const emp = empRes.value || {};
      const current = Array.isArray(emp.currentEmployment) ? emp.currentEmployment : [];

      setStats({
        certificates: certs.length,
        verifiedCertificates: certs.filter(
          (c) => c.verificationStatus === "Verified" || c.verificationStatus === "VERIFIED"
        ).length,
        pendingCertificates: certs.filter(
          (c) => c.verificationStatus === "Pending" || c.verificationStatus === "PENDING"
        ).length,
        projects: projects.length,
        approvedProjects: projects.filter(
          (p) => p.status === "APPROVED"
        ).length,
        offers: offers.filter(
          (o) => o.status === "Offered" || o.status === "OFFERED"
        ).length,
        applications: apps.length,
        activeEmployment: current.length,
      });
    } catch (err) {
      console.error("Dashboard stats fetch error:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!currentUser) {
    navigate("/login");
    return null;
  }

  const base = darkMode
    ? "min-h-screen bg-gray-950 text-white"
    : "min-h-screen bg-slate-50 text-gray-900";

  return (
    <div className={`relative ${base}`}>
      <MeshBackground darkMode={darkMode} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-500 mb-1">
              Student Dashboard
            </p>
            <h1 className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              Welcome back, {currentUser.name?.split(" ")[0] || "Student"} 👋
            </h1>
            <p className={`text-sm mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
              {currentUser.college && `${currentUser.college} · `}{currentUser.email}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/student/profile"
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                darkMode
                  ? "border-white/10 text-gray-400 hover:border-white/30 hover:text-white"
                  : "border-slate-200 text-gray-600 hover:bg-slate-100"
              }`}
            >
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Quick nav */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { label: "Certificates", to: "/student/certificates" },
            { label: "Projects", to: "/student/projects" },
            { label: "Browse Jobs", to: "/student/jobs" },
            { label: "My Offers", to: "/student/offers" },
            { label: "Request Verification", to: "/student/project/verify" },
          ].map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                darkMode
                  ? "bg-white/5 text-gray-300 hover:bg-violet-500/20 hover:text-violet-300 border border-white/10"
                  : "bg-white text-gray-700 hover:bg-violet-50 hover:text-violet-700 border border-slate-200 shadow-sm"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Stats grid */}
        {loadingStats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`rounded-2xl border h-28 animate-pulse ${darkMode ? "border-white/5 bg-white/5" : "border-slate-100 bg-slate-100"}`} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <StatCard
              label="Certificates"
              value={stats.certificates}
              sub={`${stats.verifiedCertificates} verified · ${stats.pendingCertificates} pending`}
              color="text-violet-500"
              link="/student/certificates"
              darkMode={darkMode}
            />
            <StatCard
              label="Projects"
              value={stats.projects}
              sub={`${stats.approvedProjects} approved`}
              color="text-blue-500"
              link="/student/projects"
              darkMode={darkMode}
            />
            <StatCard
              label="Applications"
              value={stats.applications}
              sub="job applications"
              color="text-emerald-500"
              link="/student/jobs"
              darkMode={darkMode}
            />
            <StatCard
              label="Offers"
              value={stats.offers}
              sub={stats.activeEmployment > 0 ? `${stats.activeEmployment} active` : "pending review"}
              color="text-amber-500"
              link="/student/offers"
              darkMode={darkMode}
            />
          </div>
        )}

        {/* Professional Profile */}
        {studentId && (
          <ProfessionalProfile
            studentId={studentId}
            studentName={currentUser.name}
            studentEmail={currentUser.email}
            darkMode={darkMode}
            viewerRole="STUDENT"
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;