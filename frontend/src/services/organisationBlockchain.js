import {getOrganisationRegistry} from "../utils/organisationRegistry";

export const registerOrganisation =async(wallet,organisationType)=>{
    
    const contract=await getOrganisationRegistry();
    const tx=await contract.registerOrganisation(wallet,organisationType);
    await tx.wait();
    return tx.hash;
};