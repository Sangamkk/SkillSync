import OrganisationApplication from "../models/OrganisationApplication.js";
import { generateToken } from "../utils/jwt.js"

export const createApplicationService = async (data) => {
    const { email, walletAddress, registrationNumber } = data;

    // Check duplicate wallet
    if (walletAddress) {
        const existingWallet = await OrganisationApplication.findOne({
            walletAddress: { $regex: new RegExp(`^${walletAddress}$`, "i") }
        });
        if (existingWallet) {
            const error = new Error("This wallet is already registered or has a pending organization application.");
            error.statusCode = 409;
            throw error;
        }
    }

    // Check duplicate email
    if (email) {
        const existingEmail = await OrganisationApplication.findOne({
            email: { $regex: new RegExp(`^${email}$`, "i") }
        });
        if (existingEmail) {
            const error = new Error("An organization application with this email already exists.");
            error.statusCode = 409;
            throw error;
        }
    }

    // Check duplicate registration number
    if (registrationNumber) {
        const existingReg = await OrganisationApplication.findOne({
            registrationNumber: registrationNumber.trim()
        });
        if (existingReg) {
            const error = new Error("An organization application with this registration number already exists.");
            error.statusCode = 409;
            throw error;
        }
    }

    try {
        const application = await OrganisationApplication.create(data);
        return application;
    } catch (err) {
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern || {})[0] || "field";
            const error = new Error(
                field === "walletAddress"
                    ? "This wallet is already registered or has a pending organization application."
                    : field === "email"
                    ? "An organization application with this email already exists."
                    : `This ${field} is already registered.`
            );
            error.statusCode = 409;
            throw error;
        }
        throw err;
    }
};

export const getPendingApplicationsService = async () => {
    return await OrganisationApplication.find({
        status: "Pending"
    }).sort({ createdAt: -1 });
};

export const approveApplicationService = async (id, txHash) => {
    return await OrganisationApplication.findByIdAndUpdate(
        id,
        {
            status: "Approved",
            txHash: txHash || ""
        },
        {
            new: true
        }
    );
};

export const rejectApplicationService = async (id, rejectionReason) => {
    return await OrganisationApplication.findByIdAndUpdate(
        id,
        {
            status: "Rejected",
            rejectionReason: rejectionReason || "Application rejected by admin"
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