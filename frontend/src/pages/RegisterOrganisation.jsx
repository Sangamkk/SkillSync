import { useState } from "react";
import { applyOrganisation } from "../services/organizationService";

const RegisterOrganisation = () => {

    const [formData, setFormData] = useState({
        organisationName: "",
        email: "",
        registrationNumber: "",
        organisationType: "Company"
    });

    const [walletAddress, setWalletAddress] = useState("");

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const connectWallet = async () => {

        try {

            if (!window.ethereum) {
                alert("Please install MetaMask");
                return;
            }

            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });

            setWalletAddress(accounts[0]);

        } catch (error) {

            console.log(error);

            alert("Failed to connect MetaMask");

        }

    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        if (!walletAddress) {
            alert("Connect MetaMask First");
            return;
        }

        try {

            const response = await applyOrganisation({

                ...formData,

                walletAddress

            });

            alert(response.message);

            setFormData({
                organisationName: "",
                email: "",
                registrationNumber: "",
                organisationType: "Company"
            });

            setWalletAddress("");

        }

        catch (error) {

            console.log(error);

            alert(error.response?.data?.message || "Application Failed");

        }

    };

    return (

        <div className="min-h-screen bg-gray-100 flex items-center justify-center">

            <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-xl">

                <h1 className="text-3xl font-bold mb-6 text-center">

                    Organisation Registration

                </h1>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                >

                    <div>

                        <label className="font-semibold">

                            Organisation Name

                        </label>

                        <input
                            type="text"
                            name="organisationName"
                            value={formData.organisationName}
                            onChange={handleChange}
                            className="w-full border rounded-lg p-3"
                            placeholder="Google"
                            required
                        />

                    </div>

                    <div>

                        <label className="font-semibold">

                            Email

                        </label>

                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full border rounded-lg p-3"
                            placeholder="admin@google.com"
                            required
                        />

                    </div>

                    <div>

                        <label className="font-semibold">

                            Registration Number

                        </label>

                        <input
                            type="text"
                            name="registrationNumber"
                            value={formData.registrationNumber}
                            onChange={handleChange}
                            className="w-full border rounded-lg p-3"
                            placeholder="REG123456"
                            required
                        />

                    </div>

                    <div>

                        <label className="font-semibold">

                            Organisation Type

                        </label>

                        <select
                            name="organisationType"
                            value={formData.organisationType}
                            onChange={handleChange}
                            className="w-full border rounded-lg p-3"
                        >

                            <option>Company</option>
                            <option>University</option>
                            <option>ResearchLab</option>
                            <option>NGO</option>
                            <option>Government</option>
                            <option>Other</option>

                        </select>

                    </div>

                    <div>

                        <button
                            type="button"
                            onClick={connectWallet}
                            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700"
                        >

                            {walletAddress
                                ? "Wallet Connected"
                                : "Connect MetaMask"}

                        </button>

                    </div>

                    {

                        walletAddress &&

                        <div>

                            <label className="font-semibold">

                                Connected Wallet

                            </label>

                            <input
                                type="text"
                                value={walletAddress}
                                readOnly
                                className="w-full border rounded-lg p-3 bg-gray-100"
                            />

                        </div>

                    }

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
                    >

                        Submit Application

                    </button>

                </form>

            </div>

        </div>

    );

};

export default RegisterOrganisation;