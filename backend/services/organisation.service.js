import OrganisationApplication from "../models/OrganisationApplication.js";
import { generateToken } from "../utils/jwt.js"

export const createApplicationService = async (data) => {

    const application = await OrganisationApplication.create(data);
    return application;
};

export const getPendingApplicationsService = async () => {

    return await OrganisationApplication.find({
        status: "Pending"
    });

};

export const approveApplicationService = async (id, txHash) => {

    return await OrganisationApplication.findByIdAndUpdate(
        id,
        {
            status: "Approved",
            txHash
        },
        {
            new: true
        }
    );
};

export const rejectApplicationService = async (id) => {

    return await OrganisationApplication.findByIdAndUpdate(
        id,
        {
            status: "Rejected"
        },
        {
            new: true
        }
    );
};

export const organisationLoginService = async (walletAddress) => {
    const normalizedWallet = walletAddress.toLowerCase();

    console.log("Searching in Database - orgLogin.")
    const organisation = await OrganisationApplication.findOne({
        walletAddress: normalizedWallet,
        status: "Approved"
    });

    if (!organisation) {
        const error = new Error("Organization is not verified");
        error.statusCode = 401;
        throw error;
    }

    const token = generateToken({
        _id: organisation._id,
        role: "ORGANISATION",
        walletAddress: organisation.walletAddress
    });
    console.log("Sending the result - orgLogin.")
    return {
        token,
        user: {
            _id: organisation._id,
            name: organisation.organisationName,
            email: organisation.email,
            role: "organisation",
            walletAddress: organisation.walletAddress
        }
    };
};