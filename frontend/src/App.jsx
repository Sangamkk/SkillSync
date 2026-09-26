import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/common/ProtectedRoute";

// Public Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyCertificate from "./pages/public/VerifyCertificate";
import VerifyDocument from "./pages/public/VerifyDocument";
import CertificateQRPage from "./pages/public/CertificateQRPage";

// Admin
import AdminDashboard from "./pages/AdminDashboard";

// Student Pages
import StudentDashboard from "./pages/student/Dashboard";
import Certificate from "./pages/student/Certificate";
import Jobs from "./pages/student/Jobs";
import JobDetail from "./pages/student/JobDetail";
import StudentOffers from "./pages/student/StudentOffers";
import AddProject from "./pages/student/AddProject";
import RequestVerification from "./pages/student/RequestVerification";
import MyProjects from "./pages/student/project/MyProjects";
import ProjectHistory from "./pages/student/project/ProjectHistory";

// Organisation Pages
import OrganisationDashboard from "./pages/Organisation/organizationDashboard";
import RegisterOrganisation from "./pages/Organisation/RegisterOrganisation";
import CreateJob from "./pages/Organisation/CreateJob";
import MyJobs from "./pages/Organisation/MyJobs";
import Applicants from "./pages/Organisation/Applicants";
import ApplicantDetail from "./pages/Organisation/ApplicantDetail";
import CandidateProfilePage from "./pages/Organisation/CandidateProfilePage";
import Employees from "./pages/Organisation/Employee";
import PendingProjects from "./pages/Organisation/PendingProjects";
import ExtractCertificate from "./pages/Organisation/ExtractCertificate";
import PendingVerifications from "./pages/Organisation/PendingVerifications";
import IssueCertificate from "./pages/Organisation/IssueCertificate";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ─── Public Routes ─────────────────────────────────────────── */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/org/register" element={<RegisterOrganisation />} />

        {/* Public certificate / document verification — no auth */}
        <Route path="/verify-qr/:certificateId" element={<CertificateQRPage />} />
        <Route path="/verify/qr/:certificateId" element={<CertificateQRPage />} />
        <Route path="/verify/:certificateId" element={<VerifyCertificate />} />
        <Route path="/verify-document" element={<VerifyDocument />} />

        {/* ─── Student Routes ────────────────────────────────────────── */}
        <Route path="/student/dashboard" element={
          <ProtectedRoute requiredRole="STUDENT">
            <StudentDashboard />
          </ProtectedRoute>
        } />
        <Route path="/student/certificates" element={
          <ProtectedRoute requiredRole="STUDENT">
            <Certificate />
          </ProtectedRoute>
        } />
        {/* legacy /certificate alias */}
        <Route path="/certificate" element={<Navigate to="/student/certificates" replace />} />
        <Route path="/student/jobs" element={
          <ProtectedRoute requiredRole="STUDENT">
            <Jobs />
          </ProtectedRoute>
        } />
        <Route path="/student/jobs/:jobId" element={
          <ProtectedRoute requiredRole="STUDENT">
            <JobDetail />
          </ProtectedRoute>
        } />
        <Route path="/student/offers" element={
          <ProtectedRoute requiredRole="STUDENT">
            <StudentOffers />
          </ProtectedRoute>
        } />
        <Route path="/student/project" element={
          <ProtectedRoute requiredRole="STUDENT">
            <AddProject />
          </ProtectedRoute>
        } />
        <Route path="/student/project/add" element={
          <ProtectedRoute requiredRole="STUDENT">
            <AddProject />
          </ProtectedRoute>
        } />
        <Route path="/student/project/verify" element={
          <ProtectedRoute requiredRole="STUDENT">
            <RequestVerification />
          </ProtectedRoute>
        } />
        <Route path="/student/projects" element={
          <ProtectedRoute requiredRole="STUDENT">
            <MyProjects />
          </ProtectedRoute>
        } />
        <Route path="/student/project-history" element={
          <ProtectedRoute requiredRole="STUDENT">
            <ProjectHistory />
          </ProtectedRoute>
        } />

        {/* ─── Organisation Routes ───────────────────────────────────── */}
        <Route path="/organisation" element={
          <ProtectedRoute requiredRole="ORGANISATION">
            <OrganisationDashboard />
          </ProtectedRoute>
        } />
        <Route path="/organisation/create-job" element={
          <ProtectedRoute requiredRole="ORGANISATION">
            <CreateJob />
          </ProtectedRoute>
        } />
        <Route path="/organisation/jobs/new" element={
          <ProtectedRoute requiredRole="ORGANISATION">
            <CreateJob />
          </ProtectedRoute>
        } />
        <Route path="/organisation/jobs" element={
          <ProtectedRoute requiredRole="ORGANISATION">
            <MyJobs />
          </ProtectedRoute>
        } />
        <Route path="/organisation/jobs/:jobId/applications" element={
          <ProtectedRoute requiredRole="ORGANISATION">
            <Applicants />
          </ProtectedRoute>
        } />
        <Route path="/organisation/jobs/:jobId/applications/:applicationId" element={
          <ProtectedRoute requiredRole="ORGANISATION">
            <ApplicantDetail />
          </ProtectedRoute>
        } />
        <Route path="/organisation/jobs/:jobId/applications/:applicationId/profile" element={
          <ProtectedRoute requiredRole="ORGANISATION">
            <CandidateProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/organisation/employees" element={
          <ProtectedRoute requiredRole="ORGANISATION">
            <Employees />
          </ProtectedRoute>
        } />
        <Route path="/organisation/project" element={
          <ProtectedRoute requiredRole="ORGANISATION">
            <PendingProjects />
          </ProtectedRoute>
        } />
        <Route path="/organisation/pending-verifications" element={
          <ProtectedRoute requiredRole="ORGANISATION">
            <PendingVerifications />
          </ProtectedRoute>
        } />
        <Route path="/organisation/issue-certificate" element={
          <ProtectedRoute requiredRole="ORGANISATION">
            <IssueCertificate />
          </ProtectedRoute>
        } />
        <Route path="/organisation/extract-certificate/:certificateId" element={
          <ProtectedRoute requiredRole="ORGANISATION">
            <ExtractCertificate />
          </ProtectedRoute>
        } />

        {/* ─── Admin Routes ──────────────────────────────────────────── */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="ADMIN">
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* ─── Catch-all ─────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;