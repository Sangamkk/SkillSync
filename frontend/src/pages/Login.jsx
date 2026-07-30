import { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../services/authService";
import {
  applicantExists
} from "../services/blockchainService";

function Login() {
    const { connectWallet } = useWallet();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.email || !formData.password) {
            alert("Please fill all fields.");
            return;
        }

        const walletAddress = await connectWallet();

        if (!walletAddress) return;

        const exists = await applicantExists(walletAddress);

        if (!exists) {
            alert("Wallet is not registered on blockchain");
            return;
        }
        const loginData = {
            ...formData,
            walletAddress,
        };

        console.log(loginData);

        try {
            const response = await loginUser(loginData);

            localStorage.setItem("token", response.token);
            localStorage.setItem("user", JSON.stringify(response.user));

            alert(response.message);

            if (response.user.role === "STUDENT") {
                navigate("/student");
            }

            if (response.user.role === "ORGANIZATION") {
                navigate("/organization/dashboard");
            }

            if (response.user.role === "COMPANY") {
                navigate("/company/dashboard");
            }

        } catch (error) {
            alert(error.response?.data?.message || "Login Failed");
        }
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
                    Welcome Back
                </h1>

                <p className="text-center text-gray-500 mb-6">
                    Login to your SkillSync account
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
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

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
                    >
                        Connect MetaMask & Login
                    </button>

                    <p className="text-center text-sm text-gray-600">
                        Don't have an account?{" "}
                        <Link
                            to="/register"
                            className="text-blue-600 font-semibold hover:underline"
                        >
                            Register
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default Login;