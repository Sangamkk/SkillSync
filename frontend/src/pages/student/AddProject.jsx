import { useState, useEffect } from "react";
import { createProject } from "../../services/projectService";
import { getVerifiedOrganisations } from "../../services/adminService";
import { createProjectVerificationRequest } from "../../services/requestService";

const AddProject = () => {

    const [formData, setFormData] = useState({
        projectName: "",
        projectType: "",
        githubLink: "",
        description: "",
        issuer: ""
    });
    const [organisations, setOrganisations] = useState([]);
    const [selectedIssuerWallet, setSelectedIssuerWallet] = useState("");

    useEffect(() => {
        const loadOrganisations = async () => {
            try {
                const data = await getVerifiedOrganisations();
                console.log(data)
                setOrganisations(data);
            } catch (error) {
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
        const organisation = organisations.find(
            (org) => org.walletAddress === wallet
        );
        setFormData({ ...formData, issuer: organisation?.organisationName || "" });
    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            const data = {
                projectName: formData.projectName,
                description: formData.description,
                githubLink: formData.githubLink,
                projectType: formData.projectType,
                issuer: formData.issuer,
                issuerWallet: selectedIssuerWallet
            };

            console.log(
                "Data being sent to backend:",
                data
            );

            const response = await createProject(data);

            console.log(
                "Project created:",
                response
            );

            const projectHash =
                "0x" + response.project.githubHash;

            console.log(
                "Project Hash:",
                projectHash
            );

            const txHash =
                await createProjectVerificationRequest(
                    projectHash,
                    response.project.issuerWallet,
                    0
                );

            console.log(
                "Project verification request:",
                txHash
            );

            alert("Project added successfully");

            setFormData({
                projectName: "",
                projectType: "Academic",
                githubLink: "",
                description: "",
                issuer: ""
            });

            setSelectedIssuerWallet("");

        } catch (error) {

            console.error(
                "Project creation error:",
                error
            );

            console.error(
                "Backend response:",
                error.response?.data
            );

            alert(
                error.response?.data?.message ||
                "Failed to add project"
            );
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 py-10">

            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">

                <h1 className="text-3xl font-bold mb-6">
                    Add Project
                </h1>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                >

                    <div>

                        <label className="font-semibold">
                            Project Name
                        </label>

                        <input
                            type="text"
                            name="projectName"
                            value={formData.projectName}
                            onChange={handleChange}
                            placeholder="SkillSync"
                            className="w-full border rounded-lg p-3"
                            required
                        />

                    </div>

                    <div>

                        <label className="font-semibold">
                            Project Type
                        </label>

                        <select
                            name="projectType"
                            value={formData.projectType}
                            onChange={handleChange}
                            className="w-full border rounded-lg p-3"
                        >

                            <option value="Project">
                                Project
                            </option>

                            <option value="Academic">
                                Academic Project
                            </option>

                            <option value="Personal">
                                Personal Project
                            </option>

                        </select>

                    </div>

                    <div>

                        <label className="font-semibold">
                            GitHub Repository
                        </label>

                        <input
                            type="url"
                            name="githubLink"
                            value={formData.githubLink}
                            onChange={handleChange}
                            placeholder="https://github.com/username/project"
                            className="w-full border rounded-lg p-3"
                            required
                        />

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

                            {organisations.map((org) => (

                                <option
                                    key={org._id}
                                    value={org.walletAddress}
                                >
                                    {org.organisationName}
                                </option>

                            ))}

                        </select>

                    </div>

                    <div>

                        <label className="font-semibold">
                            Description
                        </label>

                        <textarea
                            name="description"
                            rows="5"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Describe your project..."
                            className="w-full border rounded-lg p-3"
                        />

                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
                    >
                        Add Project
                    </button>

                </form>

            </div>

        </div>
    );
};

export default AddProject;