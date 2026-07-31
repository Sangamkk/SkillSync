import { useState } from "react";
import { uploadCertificate } from "../../services/certificateService";
import { createVerificationRequest } from "../../services/requestService";

const UploadCertificate = () => {

    const [formData, setFormData] = useState({
        certificateName: "",
        issuer: "",
        certificateType: "Course",
        issueDate: "",
        expiryDate: "",
        description: ""
    });

    const [file, setFile] = useState(null);
    const [issuerWallet, setIssuerWallet] = useState("0x937dee05CAf40147C7aC38FC9cA5015a639A8adD");

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!file) {
            alert("Please select a certificate.");
            return;
        }

        try {
            const data = new FormData();

            const user = JSON.parse(localStorage.getItem("user"));

            data.append("student", user._id);
            data.append("certificateName", formData.certificateName);
            data.append("issuer", formData.issuer);
            data.append("certificateType", formData.certificateType);
            data.append("issueDate", formData.issueDate);
            data.append("expiryDate", formData.expiryDate);
            data.append("description", formData.description);
            data.append("certificate", file);

            const response = await uploadCertificate(data);
            alert(response.message);
            console.log(response.certificate);
            try {
                const hash = response.hashBytes32;
                const txHash = await createVerificationRequest(hash, 0, issuerWallet, 0);
                alert("Verification Request Created");
                console.log(txHash);
            }

            catch (error) {
                console.error(error);

                console.log("Reason:", error.reason);
                console.log("Short:", error.shortMessage);
                console.log("Message:", error.message);

                alert(error.shortMessage || error.reason || error.message);
            }

        } catch (error) {
            console.log(error);

            alert(error.response?.data?.message || "Upload Failed");
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 py-10">

            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">

                <h1 className="text-3xl font-bold mb-6">
                    Upload Certificate
                </h1>

                <form onSubmit={handleSubmit} className="space-y-5">

                    <div>
                        <label className="font-semibold">
                            Certificate Name
                        </label>

                        <input
                            type="text"
                            name="certificateName"
                            value={formData.certificateName}
                            onChange={handleChange}
                            className="w-full border rounded-lg p-3"
                            placeholder="AWS Cloud Practitioner"
                        />
                    </div>

                    <div>
                        <label className="font-semibold">
                            Issuing Organization
                        </label>

                        <input
                            type="text"
                            name="issuer"
                            value={formData.issuer}
                            onChange={handleChange}
                            className="w-full border rounded-lg p-3"
                            placeholder="Amazon Web Services"
                        />
                    </div>

                    <div>
                        <label className="font-semibold">
                            Certificate Type
                        </label>

                        <select
                            name="certificateType"
                            value={formData.certificateType}
                            onChange={handleChange}
                            className="w-full border rounded-lg p-3"
                        >
                            <option>Course</option>
                            <option>Internship</option>
                            <option>Workshop</option>
                            <option>Hackathon</option>
                            <option>Competition</option>
                            <option>Professional</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-5">

                        <div>
                            <label className="font-semibold">
                                Issue Date
                            </label>

                            <input
                                type="date"
                                name="issueDate"
                                value={formData.issueDate}
                                onChange={handleChange}
                                className="w-full border rounded-lg p-3"
                            />
                        </div>

                        <div>
                            <label className="font-semibold">
                                Expiry Date
                            </label>

                            <input
                                type="date"
                                name="expiryDate"
                                value={formData.expiryDate}
                                onChange={handleChange}
                                className="w-full border rounded-lg p-3"
                            />
                        </div>

                    </div>

                    <div>
                        <label className="font-semibold">
                            Description
                        </label>

                        <textarea
                            rows="4"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full border rounded-lg p-3"
                            placeholder="Additional details..."
                        />
                    </div>

                    <div>
                        <label className="font-semibold">
                            Certificate File (PDF/Image)
                        </label>

                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            className="w-full border rounded-lg p-3"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
                    >
                        Upload Certificate
                    </button>

                </form>

            </div>

        </div>
    );
};

export default UploadCertificate;