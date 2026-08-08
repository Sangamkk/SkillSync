import { useState, useEffect } from "react";
import { uploadCertificate } from "../../services/certificateService";
import { createVerificationRequest } from "../../services/requestService";
import { getVerifiedOrganisations } from "../../services/adminService";
import { CredentialType, RequestType } from "../../utils/enums";


const UploadCertificate = () => {

    const [formData, setFormData] = useState({
        certificateName: "",
        issuer: "",
        certificateType: "",
        issueDate: "",
        expiryDate: "",
        description: "",
        hasExpiry: "yes"
    });

    const [organisations, setOrganisations] = useState([]);
    const [selectedIssuerWallet, setSelectedIssuerWallet] = useState("");
    const [file, setFile] = useState(null);

    useEffect(() => {
        const loadOrganisations = async () => {
            try {
                const data = await getVerifiedOrganisations();// backend
                setOrganisations(data);//fetch verified organization
            }
            catch (error) {
                console.log(error);
            }
        };
        loadOrganisations();
    }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleIssuerChange = (e) => {
        const wallet = e.target.value;
        setSelectedIssuerWallet(wallet);
        const organisation = organisations.find((org) => org.walletAddress === wallet);
        setFormData({ ...formData, issuer: organisation?.organisationName || "" });
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        let expiry = 0;

        if (formData.hasExpiry === "yes" && formData.expiryDate) {
            expiry = Math.floor(new Date(formData.expiryDate).getTime() / 1000);
        }
        if (!file) {
            alert("Please select a certificate.");
            return;
        }
        if (!selectedIssuerWallet) {
            alert("Please select an issuer.");
            return;
        }
        try {
            const user = JSON.parse(localStorage.getItem("user"));
            const data = new FormData();
            data.append("student", user._id);
            data.append("certificateName", formData.certificateName);
            data.append("issuer", formData.issuer);
            data.append("certificateType", credentialType);
            data.append("issueDate", formData.issueDate);
            data.append("expiryDate", formData.expiryDate);
            data.append("description", formData.description);
            data.append("certificate", file);
            data.append("hasExpiry", expiry);

            const response = await uploadCertificate(data);
            alert(response.message);
            console.log(response.certificate);
            try {
                const hash = response.hashBytes32;
                const txHash = await createVerificationRequest(hash, credentialType.Certificate,requestTypes.AddCertificate, selectedIssuerWallet, hasExpiry);
                console.log(txHash);
                alert("Verification Request Created Successfully");
            }

            catch (error) {
                console.log(error);
                alert(
                    error.shortMessage ||
                    error.reason ||
                    error.message
                );
            }
        }

        catch (error) {
            console.log(error);
            alert(
                error.response?.data?.message ||
                "Upload Failed"
            );
        }
    };

    return (

        <div className="min-h-screen bg-gray-100 py-10">

            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">

                <h1 className="text-3xl font-bold mb-6">

                    Upload Certificate

                </h1>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                >

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

                            required

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
                            required
                        >
                            <option value="">
                                Select Credential Type
                            </option>

                            <option value="Certificate">
                                Certificate
                            </option>

                            <option value="Project">
                                Project
                            </option>

                            <option value="Internship">
                                Internship
                            </option>

                            <option value="Hackathon">
                                Hackathon
                            </option>

                            <option value="ResearchPaper">
                                Research Paper
                            </option>

                            <option value="Patent">
                                Patent
                            </option>
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
                                Does this credential expire?
                            </label>

                            <select
                                name="hasExpiry"
                                value={formData.hasExpiry}
                                onChange={handleChange}
                                className="w-full border rounded-lg p-3"
                            >
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>

                            {
                                formData.hasExpiry === "yes" && (
                                    <>
                                        <label className="font-semibold mt-3 block">
                                            Expiry Date
                                        </label>

                                        <input
                                            type="date"
                                            name="expiryDate"
                                            value={formData.expiryDate}
                                            onChange={handleChange}
                                            className="w-full border rounded-lg p-3"
                                            required
                                        />
                                    </>
                                )
                            }
                        </div>
                    </div>

                    <div>

                        <label className="font-semibold">

                            Select Issuer

                        </label>

                        <select

                            value={selectedIssuerWallet}

                            onChange={handleIssuerChange}

                            className="w-full border rounded-lg p-3"

                            required

                        >

                            <option value="">

                                Select Issuer

                            </option>

                            {

                                organisations.map((org) => (

                                    <option

                                        key={org._id}

                                        value={org.walletAddress}

                                    >

                                        {org.organisationName}

                                    </option>

                                ))

                            }

                        </select>

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

                            required

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