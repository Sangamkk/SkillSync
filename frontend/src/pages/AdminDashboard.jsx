import { useEffect, useState } from "react";
import { registerOrganisation } from "../services/organisationBlockchain";
import { getPendingApplications, approveOrganisation, rejectOrganisation } from "../services/adminService";

const AdminDashboard = () => {

    const [applications, setApplications] = useState([]);

    useEffect(() => {

        fetchApplications();

    }, []);


    const fetchApplications = async () => {
        try {
            const data = await getPendingApplications();
            setApplications(data);
        }
        catch (error) {
            console.log(error);
        }
    };

    const handleApprove = async (app) => {
        try {
            const txHash = await registerOrganisation(app.walletAddress, 0);
            await approveOrganisation(app._id, txHash);
            alert("Approved");
            fetchApplications();
        }
        catch (error) {
            console.log(error);
        }

    };

    const handleReject = async (app) => {
    try {
        await rejectOrganisation(app._id);
        alert("Application Rejected");
        await fetchApplications();
    } catch (error) {
        console.log(error);
    }

};

    return (

        <div className="min-h-screen bg-gray-100 p-10">
            <h1 className="text-3xl font-bold mb-6">
                Pending Organisation Requests
            </h1>
            {
                applications.map((app) => (
                    <div
                        key={app._id}
                        className="bg-white rounded-lg shadow p-5 mb-5"
                    >
                        <p>
                            <strong>Name :</strong>
                            {app.organisationName}
                        </p>
                        <p>
                            <strong>Email :</strong>
                            {app.email}
                        </p>
                        <p>
                            <strong>Wallet :</strong>
                            {app.walletAddress}
                        </p>
                        <p>
                            <strong>Registration No :</strong>
                            {app.registrationNumber}
                        </p>
                        <p>
                            <strong>Type :</strong>
                            {app.organisationType}
                        </p>
                        <div className="mt-4">
                            <button
                                className="bg-green-600 text-white px-5 py-2 rounded mr-3"
                                onClick={() => handleApprove(app)}
                            >
                                Approve
                            </button>
                            <button
                                className="bg-red-600 text-white px-5 py-2 rounded"
                                onClick={()=>handleReject(app)}
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                ))
            }
        </div>
    );
};

export default AdminDashboard;