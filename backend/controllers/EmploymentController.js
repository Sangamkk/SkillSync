import Job from "../models/Job.js";
import Application from "../models/Application.js";
import Employment from "../models/Employment.js";
import User from "../models/User.js";
import OrganisationApplication from "../models/OrganisationApplication.js";

const resolveOrganisationDisplay = async (organisationRef) => {
  if (!organisationRef) {
    return { _id: null, name: "Organisation", organisationName: "Organisation" };
  }

  const orgId = typeof organisationRef === "string" ? organisationRef : organisationRef.toString();

  const userOrg = await User.findById(orgId).select("name email walletAddress organisationName companyName").lean();
  if (userOrg) {
    return {
      _id: userOrg._id,
      name: userOrg.name || userOrg.organisationName || userOrg.companyName || "Organisation",
      organisationName: userOrg.organisationName || userOrg.name || userOrg.companyName || "Organisation",
      email: userOrg.email || "",
      walletAddress: userOrg.walletAddress || "",
    };
  }

  const orgApplication = await OrganisationApplication.findById(orgId).select("organisationName email walletAddress").lean();
  if (orgApplication) {
    return {
      _id: orgApplication._id,
      name: orgApplication.organisationName || "Organisation",
      organisationName: orgApplication.organisationName || "Organisation",
      email: orgApplication.email || "",
      walletAddress: orgApplication.walletAddress || "",
    };
  }

  return { _id: orgId, name: "Organisation", organisationName: "Organisation" };
};

export const createJob = async (req, res) => {
  try {
    console.log("BODY:", req.body);

    const organisationId = req.user?.userId || req.user?._id;

    if (!organisationId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated organization not found. Please log in again.",
      });
    }

    const {
      title,
      description,
      requiredSkills,
      employmentType,
      location,
      stipend,
    } = req.body;

    if (!title || !description || !employmentType) {
      return res.status(400).json({
        success: false,
        message: "title, description, and employmentType are required.",
      });
    }

    const normalizedSkills = Array.isArray(requiredSkills)
      ? requiredSkills
      : typeof requiredSkills === "string"
        ? requiredSkills.split(",").map((skill) => skill.trim()).filter(Boolean)
        : [];

    const job = await Job.create({
      organisation: organisationId,
      title,
      description,
      requiredSkills: normalizedSkills,
      employmentType,
      location: location || "Remote",
      stipend: stipend ?? null,
    });

    return res.status(201).json(job);
  } catch (error) {
    console.error("Create job failed:", {
      user: req.user,
      body: req.body,
      error: error.message,
    });

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create job.",
    });
  }
};


export const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ isActive: true }).lean();

    const jobsWithOrg = await Promise.all(jobs.map(async (job) => {
      const organisation = await resolveOrganisationDisplay(job.organisation);
      return { ...job, organisation };
    }));

    res.status(200).json(jobsWithOrg);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getJobById = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId).lean();

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const organisation = await resolveOrganisationDisplay(job.organisation);

    return res.status(200).json({
      ...job,
      organisation,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({
      organisation: req.user.userId,//same shi
    });

    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const applyToJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    const existingApplication =
      await Application.findOne({
        job: jobId,
        student: req.user.userId,// req.user.id, after student-login completed(jwt based)
      });

    if (existingApplication) {
      return res.status(400).json({
        message: "Already applied",
      });
    }

    const application =
      await Application.create({
        job: jobId,
        student: req.user.userId,// req.user.id, after student-login completed(jwt based)
        organisation: job.organisation,
        status: "Applied",
      });

    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    if (job.organisation.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    job.isActive = false;

    await job.save();

    res.status(200).json({
      message: "Job removed",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getStudentApplications = async (req, res) => {
  try {
    const applications = await Application.find({
      student: req.user.userId,
    }).populate("job").lean();

    const resolvedApplications = await Promise.all(applications.map(async (application) => {
      const organisation = await resolveOrganisationDisplay(application.organisation);
      return { ...application, organisation };
    }));

    res.status(200).json(resolvedApplications);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


export const getApplicants = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findOne({
      _id: jobId,
      organisation: req.user.userId,
    });

    if (!job) {
      return res.status(403).json({
        message: "You are not allowed to view applicants for this job.",
      });
    }

    const applicants = await Application.find({
      job: jobId,
      organisation: req.user.userId,
    })
      .populate("student", "name email walletAddress usn college")
      .populate("job");

    return res.status(200).json(applicants);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const getApplicantDetail = async (req, res) => {
  try {
    const { jobId, applicationId } = req.params;

    const job = await Job.findOne({
      _id: jobId,
      organisation: req.user.userId,
    });

    if (!job) {
      return res.status(403).json({
        message: "You are not allowed to view this applicant.",
      });
    }

    const application = await Application.findOne({
      _id: applicationId,
      job: jobId,
      organisation: req.user.userId,
    })
      .populate("student", "name email walletAddress usn college")
      .populate("job", "title description employmentType location stipend requiredSkills organisation")
      .populate("organisation", "name email organisationName companyName walletAddress");

    if (!application) {
      return res.status(404).json({
        message: "Application not found for this organisation.",
      });
    }

    return res.status(200).json(application);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};


export const createEmploymentOffer = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const {
      
      employmentHash,
      txHash,
      offerId,
    } = req.body;

    const application = await Application.findById(
      applicationId
    );

    if (!application) {
      return res.status(404).json({
        message: "Application not found",
      });
    }

    application.status = "Offered";
    
    application.employmentHash = employmentHash;
    application.txHash = txHash;
    application.offerId = offerId;
    await application.save();

    res.status(200).json({
      message: "Offer created",
      application,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getMyOffers = async (req, res) => {
  try {
    const offers = await Application.find({
      student: req.user.userId,
      status: "Offered",
    }).populate("job").populate("student").lean();

    const resolvedOffers = await Promise.all(offers.map(async (offer) => {
      const organisation = await resolveOrganisationDisplay(offer.organisation);
      return { ...offer, organisation };
    }));

    res.status(200).json(resolvedOffers);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


export const acceptOffer = async (req, res) => {
  try {
    const { offerId } = req.params;

    const application = await Application.findOne({
      offerId,
    });

    if (!application) {
      return res.status(404).json({
        message: "Offer not found",
      });
    }

    console.log({
  student: application.student,
  organisation: application.organisation,
  job: application.job,
  offerId: application.offerId,
});


const employment = await Employment.create({
  employmentHash: application.employmentHash,
  offerId: application.offerId,
  student: application.student,
  organisation: application.organisation,
  job: application.job,
});

console.log(employment);
    application.status = "Accepted";

    await application.save();

    res.status(200).json({
      message: "Offer accepted",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


export const rejectOffer = async (req, res) => {
  try {
    const { offerId } = req.params;

    const application = await Application.findOne({
      offerId,
    });

    if (!application) {
      return res.status(404).json({
        message: "Offer not found",
      });
    }

    application.status = "Rejected";

    await application.save();

    res.status(200).json({
      message: "Offer rejected",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


export const getMyEmployment = async (req, res) => {
  try {
    const records = await Employment.find({ student: req.user.userId }).populate("job").lean();

    const resolved = await Promise.all(records.map(async (record) => {
      const organisation = await resolveOrganisationDisplay(record.organisation);
      return { ...record, organisation };
    }));

    const currentEmployment = resolved.filter((record) => record.status === "Active");
    const previousEmployment = resolved.filter((record) => ["Completed", "Terminated"].includes(record.status));

    res.status(200).json({
      currentEmployment,
      previousEmployment,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getStudentEmploymentMetadata = async (req, res) => {
  try {
    const { studentId } = req.params;
    const application = await Application.findOne({
      student: studentId,
      organisation: req.user.userId,
    }).select("_id").lean();

    if (!application) {
      return res.status(403).json({
        message: "You are not allowed to view this candidate's employment.",
      });
    }

    const records = await Employment.find({ student: studentId })
      .populate("job", "title description employmentType location stipend requiredSkills")
      .lean();

    const resolved = await Promise.all(records.map(async (record) => {
      const organisation = await resolveOrganisationDisplay(record.organisation);
      return { ...record, organisation };
    }));

    res.status(200).json({ records: resolved });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrganisationEmployees =
  async (req, res) => {
    try {
      const employees =
        await Employment.find({
          organisation:
            req.user.userId,
        })
          .populate(
            "student",
            "name email walletAddress"
          )
          .populate(
            "job",
            "title employmentType"
          );

      res.status(200).json(employees);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };


  export const terminateEmployment = async (req,res) => {
   const { offerId } = req.params;

   const employment =
      await Employment.findOne({ offerId });

   employment.status = "Terminated";

   await employment.save();

   res.json({
      message: "Employment terminated"
   });
}