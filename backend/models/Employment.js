import mongoose from "mongoose";

const employmentSchema = new mongoose.Schema(
  {
    employmentHash: {
      type: String,
      required: true,
      unique: true,
    },

    offerId: {
      type: Number,
      required: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    organisation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },

    status: {
      type: String,
      enum: ["Active", "Completed", "Terminated"],
      default: "Active",
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "Employment",
  employmentSchema
);