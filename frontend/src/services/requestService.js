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

export const createProjectVerificationRequest = async (
    projectHash,
    issuer,
    expiry
) => {

    const contract = await getRequestContract();

    const tx = await contract.createRequest(
        projectHash,
        1, // Project
        2, // AddProjectVerification
        issuer,
        expiry
    );

    await tx.wait();

    return tx.hash;
};

export const getIssuerRequests = async () => {
    const contract = await getRequestContract();
    console.log("Next Request ID:", (await contract.nextRequestId()).toString());
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

export const getStudentRequests = async () => {
    const contract = await getRequestContract();
    const requestIds = await contract.getStudentRequests();

    const requests = [];

    for (const id of requestIds) {
        const request = await contract.requests(id);
        requests.push({
            id: Number(request.id),
            credentialHash: request.credentialHash,
            credentialType: Number(request.credentialType),
            requestType: Number(request.requestType),
            student: request.student,
            expectedVerifier: request.expectedVerifier,
            status: Number(request.status),
            createdAt: Number(request.createdAt),
            expiresAt: Number(request.expiresAt)
        });
    }

    return requests;
};

export const approveVerificationRequest = async (requestId) => {
    const contract = await getRequestContract();
    const tx = await contract.approveRequest(requestId);
    await tx.wait();
    return tx.hash;
};

export const rejectVerificationRequest = async (requestId) => {
    const contract = await getRequestContract();
    const tx = await contract.rejectRequest(requestId);
    await tx.wait();
    return tx.hash;
};

export const getRequestsForStudent = async (studentWallet) => {
    const contract = await getRequestContract();
    const normalizedWallet = studentWallet.toLowerCase();
    const nextRequestId = Number(await contract.nextRequestId());
    const requests = [];

    for (let id = 1; id <= nextRequestId; id += 1) {
        const request = await contract.requests(id);
        if (request.student.toLowerCase() !== normalizedWallet) continue;
        requests.push({
            id: Number(request.id),
            credentialHash: request.credentialHash,
            credentialType: Number(request.credentialType),
            requestType: Number(request.requestType),
            student: request.student,
            expectedVerifier: request.expectedVerifier,
            status: Number(request.status),
            createdAt: Number(request.createdAt),
            expiresAt: Number(request.expiresAt)
        });
    }

    return requests;
};