import crypto from "crypto";
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
        issuer,
        issuerWallet,
        description
    });

    return project;
};