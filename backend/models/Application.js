import mongoose from "mongoose";

const ApplicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    organisation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrganisationApplication",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "Applied",
        "Offered",
        "Rejected",
        "Accepted"
      ],
      default: "Applied",
    },

    offerId: {
      type: Number,
    },

    employmentHash: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);
ApplicationSchema.index(
  { job: 1, student: 1 },
  { unique: true }
);

export default mongoose.model("Application", ApplicationSchema);