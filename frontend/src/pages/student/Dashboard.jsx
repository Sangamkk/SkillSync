import { useEffect, useState } from "react";
import { getProfile } from "../../services/studentService";

const Dashboard = () => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const profile = await getProfile();
            setUser(profile);
        } catch (error) {
            console.error(error);
        }

    };
    return (
        <div className="bg-white rounded-xl shadow p-8 mt-6">
            <h2 className="text-2xl font-bold mb-6">
                Student Information
            </h2>
            <p>
                <strong>Name :</strong> {user?.name}
            </p>
            <p>
                <strong>Email :</strong> {user?.email}
            </p>
            <p>
                <strong>USN :</strong> {user?.usn}
            </p>
            <p>
                <strong>College :</strong> {user?.college}
            </p>
            <p>
                <strong>Wallet :</strong> {user?.walletAddress}
            </p>
            <p>
                <strong>Role :</strong> {user?.role}
            </p>
        </div>
    )
}

export default Dashboard
