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
import StudentOffers from "./pages/student/StudentOffers";

// Organisation Pages
import CreateJob from "./pages/Organisation/CreateJob";
import MyJobs from "./pages/Organisation/MyJobs";
import Applicants from "./pages/Organisation/Applicants";
import  Employees from "./pages/Organisation/Employee";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Student Routes */}
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/certificate" element={<Certificate />} />
        <Route path="/student/jobs" element={<Jobs />} />
        <Route
          path="/student/offers"
          element={<StudentOffers />}
        />

        {/* Organisation Routes */}
        <Route
          path="/org/register"
          element={<RegisterOrganisation />}
        />

        <Route
          path="/organisation/create-job"
          element={<CreateJob />}
        />

        <Route
          path="/organisation/jobs"
          element={<MyJobs />}
        />

        <Route
          path="/organisation/jobs/:jobId/applications"
          element={<Applicants />}
        />



        <Route
  path="/organisation/employees"
  element={<Employees />}
/>
        {/* Admin */}
        <Route
          path="/admin"
          element={<AdminDashboard />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;