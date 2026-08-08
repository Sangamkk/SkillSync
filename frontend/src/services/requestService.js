import { getRequestContract } from "../utils/requestContract";

export const createVerificationRequest = async (certificateHash, credentialType,requestType, issuer, expiry) => {
    const contract = await getRequestContract();
    const tx = await contract.createRequest(
        certificateHash,
        credentialType,
        requestType,
        issuer,
        expiry
    );
    await tx.wait();
    return tx.hash;
};

export const getIssuerRequests = async () => {

    const contract = await getRequestContract();
    console.log("Next Request ID:",(await contract.nextRequestId()).toString());
    const requestIds = await contract.getIssuerRequests();

    console.log("Request IDs:", requestIds);

    const requests = [];

    for (const id of requestIds) {

        const request = await contract.requests(id);

        console.log(request);

        requests.push(request);

    }

    return requests;

};