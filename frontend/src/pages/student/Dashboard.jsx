import { useEffect, useState } from "react";
import { getProfile } from "../../services/studentService";
import { useNavigate } from "react-router-dom"
import Certificate from "./Certificate";

const Dashboard = () => {
    const [user, setUser] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const user = JSON.parse(localStorage.getItem("user"));
            console.log(user);
            const walletAddress = JSON.parse(localStorage.getItem("user")).walletAddress;
            const profile = await getProfile(walletAddress);
            setUser(profile);
        } catch (error) {
            console.error(error);
        }

    };

    const nxtPage = () => {
        navigate("/certificate");
    }
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
            <button onClick={nxtPage}>Nxt</button>
        </div>
    )
}

export default Dashboard
