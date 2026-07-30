import { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../services/authService";
import { createApplicant } from "../services/blockchainService";

function Register() {
  const { connectWallet } = useWallet();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "STUDENT",
    usn: "",
    college: "",
    organizationName: "",
    companyName: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      alert("Please fill all required fields");
      return;
    }

    if (formData.role === "STUDENT") {
      if (!formData.usn || !formData.college) {
        alert("Please fill all student details");
        return;
      }
    }

    if (formData.role === "ORGANIZATION") {
      if (!formData.organizationName) {
        alert("Please enter organization name");
        return;
      }
    }

    if (formData.role === "COMPANY") {
      if (!formData.companyName) {
        alert("Please enter company name");
        return;
      }
    }

    const walletAddress = await connectWallet();

    if (!walletAddress) return;

    await createApplicant();

    const registerData = {
      ...formData,
      walletAddress,
    };

    console.log(registerData);

    try {
      const response = await registerUser(registerData);

      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));

      alert(response.message);

      if (response.user.role === "STUDENT") {
        navigate("/student/dashboard");
      }

      if (response.user.role === "ORGANIZATION") {
        navigate("/organization/dashboard");
      }

      if (response.user.role === "COMPANY") {
        navigate("/company/dashboard");
      }
    } catch (error) {
      alert(error.response?.data?.message || "Registration Failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          SkillSync
        </h1>

        <p className="text-center text-gray-500 mb-6">
          Create your account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />

          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="STUDENT">Student</option>
            <option value="ORGANIZATION">Organization</option>
            <option value="COMPANY">Company</option>
          </select>

          {formData.role === "STUDENT" && (
            <div className="space-y-4">
              <input
                type="text"
                name="usn"
                placeholder="USN"
                value={formData.usn}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />

              <input
                type="text"
                name="college"
                placeholder="College Name"
                value={formData.college}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          )}

          {formData.role === "ORGANIZATION" && (
            <input
              type="text"
              name="organizationName"
              placeholder="Organization Name"
              value={formData.organizationName}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          )}

          {formData.role === "COMPANY" && (
            <input
              type="text"
              name="companyName"
              placeholder="Company Name"
              value={formData.companyName}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-300"
          >
            Connect MetaMask & Register
          </button>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-blue-600 font-semibold hover:underline"
            >
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;