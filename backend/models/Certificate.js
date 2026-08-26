import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        certificateName: {
            type: String,
            required: true,
            trim: true
        },

        issuer: {
            type: String,
            required: true,
            trim: true
        },

        certificateType: {
            type: String,
            enum: [
                "Course",
                "Internship",
                "Workshop",
                "Hackathon",
                "Competition",
                "Professional"
            ],
            required: true
        },

        issueDate: {
            type: Date,
            required: true
        },

        expiryDate: {
            type: Date,
            default: null
        },

        description: {
            type: String,
            default: ""
        },

        certificateURL: {
            type: String,
            required: true
        },

        certificateHash: {
            type: String,
            required: true,
            unique: true
        },

        verificationStatus: {
            type: String,
            enum: [
                "Pending",
                "Verified",
                "Rejected"
            ],
            default: "Pending"
        },

        blockchainStored: {
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

export default mongoose.model("Certificate", certificateSchema);