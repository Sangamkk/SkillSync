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

        githubHash: {
            type: String,
            required: true,
            unique: true
        },

        issuer: {
            type: String,
            default: ""
        },

        issuerWallet: {
            type: String,
            default: ""
        },
        onChainRegistered: {
            type: Boolean,
            default: false
        },

        description: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED"],
            default: "PENDING"
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