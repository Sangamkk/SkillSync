import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";


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


      </Routes>
    </BrowserRouter>
  );
}

export default App;