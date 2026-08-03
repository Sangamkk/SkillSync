import { organisationLogin } from "../services/organisationLogin";

const OrganisationLogin = () => {

    const handleLogin = async () => {

        try {

            const result = await organisationLogin();

            alert("Login Successful");

            console.log(result);

        }

        catch (error) {

            alert(error.message);

        }

    };

    return (

        <div className="flex justify-center items-center min-h-screen">

            <button
                onClick={handleLogin}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg"
            >
                Login with MetaMask
            </button>

        </div>

    );

};

export default OrganisationLogin;