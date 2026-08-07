import { ethers } from "ethers";
import { getOrganisationRegistry } from "../utils/organisationRegistry";

export const registerOrganisation = async (wallet, organisationType) => {

    const contract = await getOrganisationRegistry();

    const owner = await contract.owner();
    console.log("Contract Owner:", owner);

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    console.log("Current Wallet:", await signer.getAddress());

    const tx = await contract.registerOrganisation(
        wallet,
        organisationType
    );

export const registerOrganisation =async(wallet,organisationType)=>{
    
    const contract=await getOrganisationRegistry();

console.log(
    "Owner:",
    await contract.owner()
);
    const tx=await contract.registerOrganisation(wallet,organisationType);
    await tx.wait();

    return tx.hash;
};