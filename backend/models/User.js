import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["STUDENT", "ADMIN"],
      required: true,
    },

    usn: {
      type: String,
      default: "",
    },

    college: {
      type: String,
      default: "",
    },

    organizationName: {
      type: String,
      default: "",
    },

    companyName: {
      type: String,
      default: "",
    },

    digiLockerVerified: {
      type: Boolean,
      default: false,
    },

    // Blockchain identity — bytes32 hex string
    applicantId: {
      type: String,
      unique: true,
      sparse: true,
    },

    blockchainTxHash: {
      type: String,
      default: "",
    },

    blockchainBlockNumber: {
      type: Number,
      default: null,
    },

    blockchainStatus: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "FAILED"],
      default: "PENDING",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);