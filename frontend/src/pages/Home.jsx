import { useNavigate } from "react-router-dom";

const Dashboard = () => {
    const navigate = useNavigate();
    const loginRequired = () => {
        alert("Please Login to Continue.");
        navigate("/login");
    };
    return (
        <div className="min-h-screen bg-gray-100">
            {/* Hero */}
            <section className="bg-blue-700 text-hite py-20 text-center">
                <h1 className="text-5xl font-bold">
                    SkillSync
                </h1>
                <p className="mt-5 text-xl">
                    Blockchain Based Academic & Professional Verification Platform
                </p>
            </section>
            {/* About */}
            <section className="p-10 bg-white">
                <h2 className="text-3xl font-bold mb-5">
                    About SkillSync
                </h2>
                <p className="text-gray-600 leading-8">
                    SkillSync securely stores and verifies certificates,
                    projects, skills and employment using Blockchain.
                    Students own their achievements while organizations
                    and companies can verify them instantly.
                </p>
            </section>
            {/* Features */}
            <section className="p-10">
                <h2 className="text-3xl font-bold mb-8">

                    Platform Features

                </h2>

                <div className="grid grid-cols-2 gap-8">

                    <div className="bg-white shadow rounded p-6">

                        <h3 className="text-2xl font-semibold">

                            Certificates

                        </h3>

                        <p className="mt-4">

                            Upload academic certificates
                            and request verification.

                        </p>

                        <button
                            onClick={loginRequired}
                            className="mt-6 bg-blue-600 text-white px-5 py-2 rounded"
                        >

                            Upload Certificate

                        </button>

                    </div>

                    <div className="bg-white shadow rounded p-6">

                        <h3 className="text-2xl font-semibold">

                            Skills

                        </h3>

                        <p className="mt-4">

                            Showcase your technical and soft skills.

                        </p>

                        <button
                            onClick={loginRequired}
                            className="mt-6 bg-green-600 text-white px-5 py-2 rounded"
                        >

                            Add Skill

                        </button>

                    </div>

                    <div className="bg-white shadow rounded p-6">

                        <h3 className="text-2xl font-semibold">

                            Projects

                        </h3>

                        <p className="mt-4">

                            Store project proofs securely.

                        </p>

                        <button
                            onClick={loginRequired}
                            className="mt-6 bg-purple-600 text-white px-5 py-2 rounded"
                        >

                            Add Project

                        </button>

                    </div>

                    <div className="bg-white shadow rounded p-6">

                        <h3 className="text-2xl font-semibold">

                            Verification

                        </h3>

                        <p className="mt-4">

                            Request organizations to verify your credentials.

                        </p>

                        <button
                            onClick={loginRequired}
                            className="mt-6 bg-orange-500 text-white px-5 py-2 rounded"
                        >

                            Request Verification

                        </button>

                    </div>

                </div>

            </section>

            {/* How it Works */}

            <section className="bg-white p-10">

                <h2 className="text-3xl font-bold mb-8">

                    How It Works

                </h2>

                <ol className="space-y-4 list-decimal pl-5">

                    <li>Register using MetaMask.</li>

                    <li>Create your blockchain identity.</li>

                    <li>Upload Certificates & Projects.</li>

                    <li>Request Verification.</li>

                    <li>Organizations verify credentials.</li>

                    <li>Companies verify instantly.</li>

                </ol>

            </section>

            {/* Contact */}

            <section className="bg-gray-900 text-white p-10">

                <h2 className="text-3xl font-bold">

                    Contact

                </h2>

                <p className="mt-5">

                    Email : support@skillsync.com

                </p>

                <p>

                    Phone : +91 XXXXX XXXXX

                </p>

                <p>

                    GitHub : github.com/SkillSync

                </p>

            </section>

        </div>

    );

};

export default Dashboard;