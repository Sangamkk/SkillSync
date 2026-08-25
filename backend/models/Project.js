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
            required: true
        },

        issuerWallet: {
            type: String,
            required: true
        },

        description: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED"],
            default: "PENDING"
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Project", projectSchema);