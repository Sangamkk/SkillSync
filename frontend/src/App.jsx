import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import RegisterOrganisation from "./pages/RegisterOrganisation";
import AdminDashboard from "./pages/AdminDashboard";


// Student Pages
import StudentDashboard from "./pages/student/Dashboard";
import Certificate from "./pages/student/Certificate";
import Jobs from "./pages/student/Jobs";
import JobDetail from "./pages/student/JobDetail";
import StudentOffers from "./pages/student/StudentOffers";
import AddProject from "./pages/student/AddProject";
import RequestVerification from "./pages/student/RequestVerification";
import MyProjects from "./pages/student/MyProjects";

// Organisation Pages
import OrganisationLogin from "./pages/orgLogin";
import OrganisationDashboard from "./pages/organizationDashboard";
import CreateJob from "./pages/Organisation/CreateJob";
import MyJobs from "./pages/Organisation/MyJobs";
import Applicants from "./pages/Organisation/Applicants";
import ApplicantDetail from "./pages/Organisation/ApplicantDetail";
import  Employees from "./pages/Organisation/Employee";
import PendingProjects from "./pages/Organisation/PendingProjects";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Student Routes */}
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/certificate" element={<Certificate />} />
        <Route path="/student/jobs" element={<Jobs />} />
        <Route path="/student/jobs/:jobId" element={<JobDetail />} />
        <Route path="/student/offers" element={<StudentOffers />} />
        <Route path="/student/project" element={<AddProject />} />
        <Route path="/student/project/add" element={<AddProject />} />
        <Route path="/student/project/verify" element={<RequestVerification />} />
        <Route path="/student/projects" element={<MyProjects />} />

        {/* Organisation Routes */}
        <Route path="/org/register" element={<RegisterOrganisation />} />
        <Route path="/org-login" element={<OrganisationLogin />}/>
        <Route path="/organisation" element={<OrganisationDashboard />}/>
        <Route path="/organisation/create-job" element={<CreateJob />} />
        <Route path="/organisation/jobs/new" element={<CreateJob />} />
        <Route path="/organisation/jobs" element={<MyJobs />} />
        <Route path="/organisation/jobs/:jobId/applications" element={<Applicants />} />
        <Route path="/organisation/jobs/:jobId/applications/:applicationId" element={<ApplicantDetail />} />
        <Route  path="/organisation/employees"  element={<Employees />}/>
        <Route  path="/organisation/project"  element={<PendingProjects />}/>

        
        {/* Admin */}
        <Route path="/admin" element={<AdminDashboard />} />

 
        

        
      </Routes>
    </BrowserRouter>
  );
}

export default App;