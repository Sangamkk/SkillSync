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


export const getPendingProjectsService = async (issuerWallet) => {

    console.log("Issuer wallet received:", issuerWallet);
    console.log(
        "Normalized wallet:",
        issuerWallet.toLowerCase()
    );
    const allProjects = await Project.find({});

    console.log("All projects:", allProjects);

    const projects = await Project.find({
        issuerWallet: issuerWallet.toLowerCase(),
        status: "PENDING"
    })
        .populate(
            "student",
            "name email usn college walletAddress"
        )
        .sort({ createdAt: -1 });

        console.log(projects);
    return projects;
};