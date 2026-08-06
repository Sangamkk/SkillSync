import Job from "../models/Job.js";
import Application from "../models/Application.js";
import Employment from "../models/Employment.js";
export const createJob = async (req, res) => {
  try {
    console.log("BODY:", req.body);

    const {
      title,
      description,
      requiredSkills,
      employmentType,
      location,
      stipend,
    } = req.body;

    const job = await Job.create({
      organisation: "6a737479711c5b766fdf159d",// req.user.id, after org-login completed(jwt based)
      title,
      description,
      requiredSkills,
      employmentType,
      location,
      stipend,
    });

    res.status(201).json(job);
  } catch (error) {
 
    res.status(500).json({
      message: error.message,
    });
  }
};
export const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find({
      isActive: true,
    }).populate("organisation", "name email");

    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({
      organisation: "6a737479711c5b766fdf159d",//same shi
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
        student: "6a741d9642521173053bdb53",// req.user.id, after student-login completed(jwt based)
      });

    if (existingApplication) {
      return res.status(400).json({
        message: "Already applied",
      });
    }

    const application =
      await Application.create({
        job: jobId,
        student: "6a741d9642521173053bdb53",// req.user.id, after student-login completed(jwt based)
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

    if (job.organisation.toString() !== req.user.id) {
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


export const getApplicants = async (req, res) => {
  try {
    const { jobId } = req.params;

    const applicants = await Application.find({
      job: jobId,
    })
      .populate("student", "name email walletAddress")
      .populate("job");

    res.status(200).json(applicants);
  } catch (error) {
    res.status(500).json({
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
      student: "6a741d9642521173053bdb53",// req.user.id, after student-login completed(jwt based)
      status: "Offered",
    })
      .populate("job")
      .populate("student");

    res.status(200).json(offers);
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


export const getOrganisationEmployees =
  async (req, res) => {
    try {
      const employees =
        await Employment.find({
          organisation:
            "6a737479711c5b766fdf159d", // temp change later 
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