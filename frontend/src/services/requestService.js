import { getRequestContract } from "../utils/requestContract";

export const createVerificationRequest = async (certificateHash,credentialType,issuer,expiry) => {

    const contract = await getRequestContract();

    const tx = await contract.createRequest(
        certificateHash,
        credentialType,
        0,
        issuer,
        expiry
    );
    await tx.wait();
    return tx.hash;
};