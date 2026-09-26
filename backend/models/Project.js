import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        projectName: {
            type: String,
            required: true,
            trim: true
        },

        projectType: {
            type: String,
            required: true,
            trim: true
        },

        githubLink: {
            type: String,
            required: true,
            trim: true
        },

        // SHA-256 of github link, used as on-chain projectHash
        githubHash: {
            type: String,
            required: true,
            unique: true
        },

        description: {
            type: String,
            trim: true,
            default: ""
        },

        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED"],
            default: "PENDING"
        },

        // Organisation that approved the project
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrganisationApplication",
            default: null
        },

        onChainRegistered: {
            type: Boolean,
            default: false
        },

        txHash: {
            type: String,
            default: ""
        },

        rejectionReason: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Project", projectSchema);