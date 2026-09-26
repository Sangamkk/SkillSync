import mongoose from "mongoose";

/**
 * VerificationRequest tracks a student's request for an organisation
 * to verify one of their certificates or projects.
 *
 * RequestStatus mirrors Types.sol:
 *   0 = Pending
 *   1 = Approved
 *   2 = Rejected
 *   3 = Cancelled
 *
 * RequestType:
 *   "certificate" → AddCertificate request (type 0 in contract)
 *   "project"     → AddProjectVerification request (type 2 in contract)
 */
const verificationRequestSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // The certificate being submitted for verification (if type=certificate)
        certificate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Certificate",
            default: null
        },

        // The project being submitted for verification (if type=project)
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            default: null
        },

        // The organisation the request is directed at
        organisation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrganisationApplication",
            required: true
        },

        requestType: {
            type: String,
            enum: ["certificate", "project"],
            required: true
        },

        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected", "Cancelled"],
            default: "Pending"
        },

        // Optional notes from the student
        notes: {
            type: String,
            default: ""
        },

        // Reason for rejection
        rejectionReason: {
            type: String,
            default: ""
        },

        // The credential hash (certificate or project hash) submitted to blockchain
        credentialHash: {
            type: String,
            default: ""
        },

        // On-chain request ID returned by RequestManager
        blockchainRequestId: {
            type: Number,
            default: null
        },

        // Transaction hash when request was created on-chain
        createTxHash: {
            type: String,
            default: ""
        },

        // Transaction hash when request was approved/rejected on-chain
        actionTxHash: {
            type: String,
            default: ""
        },

        actionBlockNumber: {
            type: Number,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Prevent duplicate pending requests for same cert+org combination
verificationRequestSchema.index(
    { certificate: 1, organisation: 1, status: 1 },
    {
        unique: false
    }
);

export default mongoose.model("VerificationRequest", verificationRequestSchema);
