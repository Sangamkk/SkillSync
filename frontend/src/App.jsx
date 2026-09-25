import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/student/applicantRegister";


import AdminDashboard from "./pages/AdminDashboard";


// Applicant Pages
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
import CreateJob from "./pages/Organisation/CreateJob";
import MyJobs from "./pages/Organisation/MyJobs";
import Applicants from "./pages/Organisation/Applicants";
import ApplicantDetail from "./pages/Organisation/ApplicantDetail";
import CandidateProfilePage from "./pages/Organisation/CandidateProfilePage";
import  Employees from "./pages/Organisation/Employee";
import PendingProjects from "./pages/Organisation/PendingProjects";
import ExtractCertificate from "./pages/Organisation/ExtractCertificate";
import RegisterOrganisation from "./pages/Organisation/RegisterOrganisation";
import OrganisationCertificates from "./pages/organisation/certificates/OrganisationCertificates";
import IssueCertificate from "./pages/organisation/certificates/IssueCertificate";
import IssuedCertificates from "./pages/organisation/certificates/IssuedCertificates";


function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        

        {/* Applicant Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/certificate" element={<Certificate />} />
        <Route path="/student/jobs" element={<Jobs />} />
        <Route path="/student/jobs/:jobId" element={<JobDetail />} />
        <Route path="/student/offers" element={<StudentOffers />} />
        <Route path="/student/project" element={<AddProject />} />
        <Route path="/student/project/add" element={<AddProject />} />
        <Route path="/student/project/verify" element={<RequestVerification />} />
        <Route path="/student/projects" element={<MyProjects />} />
        <Route path="/student/project-history" element={<ProjectHistory />}/>

        {/* Organisation Routes */}
        <Route path="/org/register" element={<RegisterOrganisation />} />
        <Route path="/organisation" element={<OrganisationDashboard />}/>
        <Route path="/organisation/create-job" element={<CreateJob />} />
        <Route path="/organisation/jobs/new" element={<CreateJob />} />
        <Route path="/organisation/jobs" element={<MyJobs />} />
        <Route path="/organisation/jobs/:jobId/applications" element={<Applicants />} />
        <Route path="/organisation/jobs/:jobId/applications/:applicationId" element={<ApplicantDetail />} />
        <Route path="/organisation/jobs/:jobId/applications/:applicationId/profile" element={<CandidateProfilePage />} />
        <Route path="/organisation/employees"  element={<Employees />}/>
        <Route path="/organisation/project"  element={<PendingProjects />}/>
        <Route path="/organisation/extract-certificate/:certificateId" element={<ExtractCertificate />} />
        <Route path="/organisation/certificates" element={<OrganisationCertificates />} />
        <Route path="/organisation/certificates/issue" element={<IssueCertificate />} />
        <Route path="/organisation/certificates/issued" element={<IssuedCertificates />} />


        {/* Admin */}
        <Route path="/admin" element={<AdminDashboard />} />

 
        

        
      </Routes>
    </BrowserRouter>
  );
}

export default App;