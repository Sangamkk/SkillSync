import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import RegisterOrganisation from "./pages/RegisterOrganisation";
import AdminDashboard from "./pages/AdminDashboard";
import OrganisationLogin from "./pages/orgLogin";
import OrganisationDashboard from "./pages/organizationDashboard";

// Student Pages
import StudentDashboard from "./pages/student/Dashboard";
import Certificate from "./pages/student/Certificate";

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
        <Route path="/certificate" element={<Certificate/>} />

        <Route path="/org/register" element={<RegisterOrganisation />}/>
        <Route path="/org-login" element={<OrganisationLogin />}/>
        <Route path="/organisation" element={<OrganisationDashboard />}/>
        <Route path="/admin" element={<AdminDashboard />}/>
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;