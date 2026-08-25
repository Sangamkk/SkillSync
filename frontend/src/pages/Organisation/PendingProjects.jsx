import { useEffect, useState } from "react";
import { getPendingProjects } from "../../services/projectService";

const PendingProjects = () => {

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProjects = async () => {
            try {
                const data = await getPendingProjects();
                console.log("Pending Projects:", data);
                setProjects(data);
            } catch (error) {
                console.error(
                    "Failed to load projects:",
                    error
                );
            } finally {
                setLoading(false);
            }
        };
        loadProjects();
    }, []);

    const handleFeedback = (project) => {
        const feedback = window.prompt(
            "Enter feedback for the student:"
        );
        if (!feedback) {
            return;
        }
        console.log(
            "Feedback:",
            feedback
        );
        console.log(
            "Project:",
            project._id
        );
    };

    const handleApprove = (project) => {
        console.log(
            "Approving project:",
            project._id
        );
    };

    const handleReject = (project) => {
        const feedback = window.prompt(
            "Reason for rejection:"
        );
        if (!feedback) {
            return;
        }
        console.log(
            "Rejecting project:",
            project._id
        );
        console.log(
            "Reason:",
            feedback
        );
    };

    if (loading) {
        return (
            <div className="p-8">
                Loading pending projects...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">

            <h1 className="text-3xl font-bold mb-6">
                Pending Projects
            </h1>

            {projects.length === 0 ? (

                <div className="bg-white rounded-lg p-6 shadow">
                    No pending projects.
                </div>

            ) : (

                <div className="space-y-6">

                    {projects.map((project) => (

                        <div
                            key={project._id}
                            className="bg-white rounded-xl shadow p-6"
                        >

                            <h2 className="text-2xl font-semibold">
                                {project.projectName}
                            </h2>

                            <p className="text-gray-600 mt-2">
                                {project.description}
                            </p>

                            <p className="mt-3">
                                <strong>
                                    Type:
                                </strong>{" "}
                                {project.projectType}
                            </p>

                            <p className="mt-2">
                                <strong>
                                    Student:
                                </strong>{" "}
                                {project.student?.name}
                            </p>

                            <p className="mt-2">
                                <strong>
                                    USN:
                                </strong>{" "}
                                {project.student?.usn}
                            </p>

                            <a
                                href={project.githubLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mt-4 text-blue-600 hover:underline"
                            >
                                View GitHub Repository
                            </a>

                            <div className="flex gap-3 mt-5">

                                <button
                                    onClick={() => handleVerify(project)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                >
                                    Verify
                                </button>

                                <button
                                    onClick={() => handleFeedback(project)}
                                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                                >
                                    Feedback
                                </button>

                                <button
                                    onClick={() => handleApprove(project)}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                                >
                                    Approve
                                </button>

                                <button
                                    onClick={() => handleReject(project)}
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                                >
                                    Reject
                                </button>

                            </div>

                        </div>

                    ))}

                </div>
            )}

        </div>
    );
};

export default PendingProjects;