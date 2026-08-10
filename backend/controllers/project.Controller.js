import { createProjectService} from "../services/createProjectService.js";

export const createProject = async (req, res) => {

    try {

        const project = await createProjectService({

            // Get student from JWT
            // Don't trust student ID from frontend
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

        console.error(
            "Create Project Error:",
            error
        );

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message:
                error.message ||
                "Failed to create project"
        });
    }
};