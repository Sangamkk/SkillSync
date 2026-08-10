import { getOrganisationRegistry } from "../utils/organisationRegistry";
import {orgLogin} from "../services/organizationService";


export const organisationLogin = async (walletAddress) => {

    const contract = await getOrganisationRegistry();

    const signer = await contract.runner.getAddress();

    const organisation = await contract.organisations(signer);

    if (!organisation.exists) {
        throw new Error("Organisation not registered");
    }

    if (!organisation.isActive) {
        throw new Error("Organisation is inactive");
    }

    const response=await  orgLogin(walletAddress);
    console.log( "Wallet connected:", walletAddress );
    localStorage.setItem(
        "token",
        response.token
    );

    localStorage.setItem(
        "user",
        JSON.stringify(response.user)
    );

    return {
        wallet: signer,
        organisation
    };
};