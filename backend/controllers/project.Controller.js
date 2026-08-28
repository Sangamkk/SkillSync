import {
    createProjectService,
    getPendingProjectsService,
    getStudentProjectsService,
    updateProjectStatusService
} from "../services/createProjectService.js";
import Application from "../models/Application.js";

export const createProject = async (req, res) => {
    try {
        const project = await createProjectService({
            student: req.user.userId,
            projectName: req.body.projectName,
            projectType: req.body.projectType,
            githubLink: req.body.githubLink,
            description: req.body.description,
            issuer: req.body.issuer,
            issuerWallet: req.body.issuerWallet
        });

        return res.status(201).json({
            success: true,
            message: "Project added successfully",
            project
        });
    } catch (error) {
        console.error("Create Project Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to create project"
        });
    }
};

export const getPendingProjects = async (req, res) => {
    try {
        const wallet = req.user.walletAddress;
        console.log("Fetching pending projects for wallet:", wallet);

        const projects = await getPendingProjectsService(wallet);

        return res.status(200).json({
            success: true,
            projects
        });
    } catch (error) {
        console.error("Get Pending Projects Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to fetch pending projects"
        });
    }
};

export const getStudentProjects = async (req, res) => {
    try {
        const studentId = req.params.studentId || req.query.studentId || req.user?.userId;
        const projects = await getStudentProjectsService(studentId);

        return res.status(200).json({
            success: true,
            projects: projects || []
        });
    } catch (error) {
        console.error("Get Student Projects Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to fetch student projects",
            projects: []
        });
    }
};

export const updateProjectStatus = async (req, res) => {
    try {
        const { id, status, txHash, rejectionReason, onChainRegistered, issuer, issuerWallet } = req.body;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "id or githubHash is required"
            });
        }

        const project = await updateProjectStatusService(id, status, txHash, rejectionReason, {
            onChainRegistered,
            issuer,
            issuerWallet,
            userRole: req.user?.role,
            userId: req.user?.userId
        });
        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: `Project status updated to ${status}`,
            project
        });
    } catch (error) {
        console.error("Update Project Status Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to update project status"
        });
    }
};

export const getCandidateProjects = async (req, res) => {
    try {
        const { studentId } = req.params;
        const application = await Application.findOne({
            student: studentId,
            organisation: req.user.userId,
        }).select("_id").lean();

        if (!application) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to view this candidate's projects",
            });
        }

        const projects = await getStudentProjectsService(studentId);
        return res.status(200).json({ success: true, projects: projects || [] });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch candidate projects",
            projects: [],
        });
    }
};