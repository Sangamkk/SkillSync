import mongoose from "mongoose";

const organisationApplicationSchema = new mongoose.Schema(
    {
        organisationName: {
            type: String,
            required: true
        },

        email: {
            type: String,
            required: true,
            unique: true
        },

        walletAddress: {
            type: String,
            required: true,
            unique: true
        },

        organisationType: {
            type: String,
            enum: [
                "Company",
                "University",
                "ResearchLab",
                "NGO",
                "Government",
                "Other"
            ],
            required: true
        },

        registrationNumber: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: [
                "Pending",
                "Approved",
                "Rejected"
            ],
            default: "Pending"
        },

        txHash: {
            type: String,
            default: ""
        },

        rejectionReason: {
            type: String,
            default: ""
        },

        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model(
    "OrganisationApplication",
    organisationApplicationSchema
);