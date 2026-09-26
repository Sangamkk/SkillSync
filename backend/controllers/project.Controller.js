import {
    createProjectService,
    getPendingProjectsService,
    getStudentProjectsService,
    updateProjectStatusService
} from "../services/createProjectService.js";
import Application from "../models/Application.js";

// ─── POST /api/student/projects ───────────────────────────────────────────────
export const createProject = async (req, res) => {
    try {
        const project = await createProjectService({
            student: req.user.userId,
            projectName: req.body.projectName,
            projectType: req.body.projectType,
            githubLink: req.body.githubLink,
            description: req.body.description,
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

// ─── GET /api/student/projects/pending ────────────────────────────────────────
export const getPendingProjects = async (req, res) => {
    try {
        const orgId = req.user?.userId || req.user?._id;
        const projects = await getPendingProjectsService(orgId);

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

// ─── GET /api/student/projects ────────────────────────────────────────────────
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

// ─── PUT /api/student/projects/status ────────────────────────────────────────
export const updateProjectStatus = async (req, res) => {
    try {
        const { id, status, txHash, rejectionReason, onChainRegistered } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "id is required"
            });
        }

        const project = await updateProjectStatusService(id, status, txHash, rejectionReason, {
            onChainRegistered,
            userRole: req.user?.role,
            userId: req.user?.userId,
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

// ─── GET /api/student/candidates/:studentId/projects ─────────────────────────
export const getCandidateProjects = async (req, res) => {
    try {
        const { studentId } = req.params;
        const orgId = req.user?.userId || req.user?._id;

        // Verify the student applied to this org's job
        const application = await Application.findOne({
            student: studentId,
            organisation: orgId,
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