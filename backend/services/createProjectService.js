import crypto from "crypto";
import mongoose from "mongoose";
import Project from "../models/Project.js";

export const createProjectService = async (projectData) => {

    const {
        student,
        projectName,
        projectType,
        githubLink,
        description,
        issuer,
        issuerWallet
    } = projectData;

    const existingProject = await Project.findOne({
        githubLink
    });

    if (existingProject) {
        const error = new Error(
            "This GitHub project is already registered"
        );

        error.statusCode = 409;
        throw error;
    }

    // Hash GitHub link
    const githubHash = crypto
        .createHash("sha256")
        .update(githubLink.trim())
        .digest("hex");

    console.log("GitHub Link:", githubLink);
    console.log("GitHub Hash:", githubHash);

    const project = await Project.create({
        student,
        projectName,
        projectType,
        githubLink,
        githubHash,
        issuer: issuer || "",
        issuerWallet: issuerWallet ? issuerWallet.toLowerCase() : "",
        description
    });

    return project;
};

export const getPendingProjectsService = async (issuerWallet) => {
    console.log("Issuer wallet received:", issuerWallet);
    const walletQuery = (issuerWallet || "").toLowerCase();

    const projects = await Project.find({
        $or: [
            { issuerWallet: walletQuery },
            { issuerWallet: { $regex: new RegExp(`^${walletQuery}$`, "i") } }
        ],
        status: "PENDING"
    })
        .populate(
            "student",
            "name email usn college walletAddress"
        )
        .sort({ createdAt: -1 });

    return projects;
};

export const getStudentProjectsService = async (studentId) => {
    if (!studentId) return [];

    const query = mongoose.Types.ObjectId.isValid(studentId)
        ? { $or: [{ student: studentId }, { student: new mongoose.Types.ObjectId(studentId) }] }
        : { student: studentId };

    return await Project.find(query).sort({ createdAt: -1 });
};

export const updateProjectStatusService = async (identifier, status, txHash, rejectionReason, extraData = {}) => {
    // Try finding by _id first, if not found or invalid ObjectId try by githubHash
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

    // Ownership check for STUDENT role
    if (extraData.userRole === "STUDENT" && extraData.userId) {
        if (project.student.toString() !== extraData.userId.toString()) {
            const error = new Error("Unauthorized to update this project");
            error.statusCode = 403;
            throw error;
        }
    }

    if (status) {
        project.status = status;
    }
    if (txHash) {
        project.txHash = txHash;
    }
    if (rejectionReason !== undefined) {
        project.rejectionReason = rejectionReason;
    }
    if (extraData.onChainRegistered !== undefined) {
        project.onChainRegistered = extraData.onChainRegistered;
    }
    if (extraData.issuer) {
        project.issuer = extraData.issuer;
    }
    if (extraData.issuerWallet) {
        project.issuerWallet = extraData.issuerWallet.toLowerCase();
    }

    await project.save();
    return project;
};