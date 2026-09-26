import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Organisation that issued or verified the certificate
        issuingOrganisation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrganisationApplication",
            default: null
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
                "Professional",
                "ResearchPaper",
                "Patent",
                "Other"
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

        // SHA-256 of raw file bytes, prefixed with 0x (bytes32 hex)
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
                "Rejected",
                "Revoked"
            ],
            default: "Pending"
        },

        // Whether the certificate has been stored on-chain
        blockchainStored: {
            type: Boolean,
            default: false
        },

        // Transaction hash from blockchain operations
        txHash: {
            type: String,
            default: ""
        },

        blockchainBlockNumber: {
            type: Number,
            default: null
        },

        // Extra blockchain metadata
        blockchainTxHash: {
            type: String,
            default: ""
        },

        blockchainStatus: {
            type: String,
            enum: ["PENDING", "CONFIRMED", "FAILED"],
            default: "PENDING"
        },

        rejectionReason: {
            type: String,
            default: ""
        },

        // For org-issued certs: the credential type enum value
        credentialType: {
            type: Number,
            default: 0
        },

        // Issued by org directly (true) vs uploaded by student (false)
        issuedByOrganisation: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Certificate", certificateSchema);