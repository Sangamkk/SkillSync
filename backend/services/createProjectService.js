import crypto from "crypto";
import mongoose from "mongoose";
import Project from "../models/Project.js";
import OrganisationApplication from "../models/OrganisationApplication.js";
import VerificationRequest from "../models/VerificationRequest.js";

export const createProjectService = async (projectData) => {
    const {
        student,
        projectName,
        projectType,
        githubLink,
        description,
    } = projectData;

    // Check for duplicate GitHub link
    const existingProject = await Project.findOne({ githubLink: githubLink.trim() });
    if (existingProject) {
        const error = new Error("This GitHub project is already registered");
        error.statusCode = 409;
        throw error;
    }

    // Hash the GitHub link for on-chain usage
    const githubHash = crypto
        .createHash("sha256")
        .update(githubLink.trim())
        .digest("hex");

    const project = await Project.create({
        student,
        projectName,
        projectType,
        githubLink: githubLink.trim(),
        githubHash,
        description: description || "",
    });

    return project;
};

/**
 * Get pending projects for an organisation (by org _id).
 */
export const getPendingProjectsService = async (organisationId) => {
    let query = { status: "PENDING" };
    if (organisationId) {
        const requests = await VerificationRequest.find({
            organisation: organisationId,
            requestType: "project",
            status: "Pending",
        }).select("project");

        const projectIds = requests.map((r) => r.project).filter(Boolean);
        if (projectIds.length > 0) {
            query = { _id: { $in: projectIds }, status: "PENDING" };
        }
    }

    const projects = await Project.find(query)
        .populate("student", "name email usn college")
        .sort({ createdAt: -1 });

    return projects;
};

export const getStudentProjectsService = async (studentId) => {
    if (!studentId) return [];

    const query = mongoose.Types.ObjectId.isValid(studentId)
        ? { student: new mongoose.Types.ObjectId(studentId) }
        : { student: studentId };

    return await Project.find(query).sort({ createdAt: -1 });
};

export const updateProjectStatusService = async (identifier, status, txHash, rejectionReason, extraData = {}) => {
    // Try finding by _id first, then by githubHash
    let project = null;

    if (identifier && identifier.match(/^[0-9a-fA-F]{24}$/)) {
        project = await Project.findById(identifier);
    }

    if (!project) {
        const cleanHash = identifier.startsWith("0x") ? identifier.slice(2) : identifier;
        project = await Project.findOne({
            $or: [{ githubHash: cleanHash }, { githubHash: identifier }]
        });
    }

    if (!project) {
        return null;
    }

    // Ownership check for STUDENT role — students can only update their own projects
    if (extraData.userRole === "STUDENT" && extraData.userId) {
        if (project.student.toString() !== extraData.userId.toString()) {
            const error = new Error("Unauthorized to update this project");
            error.statusCode = 403;
            throw error;
        }
    }

    // ORGANISATION check — only update status/approval fields
    if (extraData.userRole === "ORGANISATION" && extraData.userId) {
        if (status === "APPROVED") {
            project.approvedBy = extraData.userId;
        }
    }

    if (status) project.status = status;
    if (txHash) project.txHash = txHash;
    if (rejectionReason !== undefined) project.rejectionReason = rejectionReason;
    if (extraData.onChainRegistered !== undefined) project.onChainRegistered = extraData.onChainRegistered;

    await project.save();
    return project;
};