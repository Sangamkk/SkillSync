import User from "../models/User.js";
import Certificate from "../models/Certificate.js";
import Project from "../models/Project.js";
import Employment from "../models/Employment.js";
import OrganisationApplication from "../models/OrganisationApplication.js";

/**
 * Get student profile by MongoDB _id.
 */
export const getProfile = async (userId) => {
    const user = await User.findById(userId).select("-password");
    if (!user) {
        throw new Error("User not found");
    }
    return user;
};

/**
 * Get full professional profile (certs, projects, employment) for a student.
 */
export const getFullProfile = async (studentId) => {
    const [certificates, projects, employmentRecords] = await Promise.all([
        Certificate.find({ student: studentId })
            .populate("issuingOrganisation", "organisationName walletAddress")
            .sort({ createdAt: -1 })
            .lean(),
        Project.find({ student: studentId }).sort({ createdAt: -1 }).lean(),
        Employment.find({ student: studentId }).populate("job").lean(),
    ]);

    const resolvedCertificates = certificates.map((cert) => ({
        ...cert,
        verifiedBy: cert.issuingOrganisation?.organisationName || (cert.verificationStatus === "Verified" ? cert.issuer : ""),
        issuerWallet: cert.issuingOrganisation?.walletAddress || cert.issuerWallet || "",
        verificationDate: cert.updatedAt ? Math.floor(new Date(cert.updatedAt).getTime() / 1000) : null,
    }));

    // Resolve organisation for each employment record
    const resolvedEmployment = await Promise.all(
        employmentRecords.map(async (rec) => {
            let orgName = "Organisation";
            if (rec.organisation) {
                const org = await OrganisationApplication.findById(rec.organisation)
                    .select("organisationName")
                    .lean();
                if (org) orgName = org.organisationName;
            }
            return {
                ...rec,
                organisation: { _id: rec.organisation, name: orgName },
            };
        })
    );

    const currentEmployment = resolvedEmployment.filter((r) => r.status === "Active");
    const previousEmployment = resolvedEmployment.filter(
        (r) => r.status === "Completed" || r.status === "Terminated"
    );

    return {
        certificates: resolvedCertificates,
        projects,
        currentEmployment,
        previousEmployment,
    };
};