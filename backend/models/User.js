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
      enum: ["STUDENT", "ORGANIZATION", "COMPANY"],
      required: true,
    },

    walletAddress: {
      type: String,
      required: true,
      unique: true,
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);