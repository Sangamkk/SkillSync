import mongoose from "mongoose";

const JobSchema = new mongoose.Schema(
  {
    organisation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    requiredSkills: [
      {
        type: String,
      },
    ],

    employmentType: {
      type: String,
      enum: ["Internship", "FullTime", "PartTime"],
      required: true,
    },

    location: {
      type: String,
      default: "Remote",
    },

    stipend: {
      type: Number,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Job", JobSchema);