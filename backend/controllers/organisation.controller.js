import {
    createApplicationService,
    getPendingApplicationsService
} from "../services/organisation.service.js";

export const createApplication = async (req, res) => {
    try {
        const application = await createApplicationService(req.body);
        res.status(201).json({

            success: true,

            message: "Application Submitted",

            application

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

export const getPendingApplications = async (req, res) => {

    try {

        const applications =
            await getPendingApplicationsService();

        res.status(200).json({

            success: true,

            applications

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

export const approveApplication = async (req, res) => {

    try {

        const { id, txHash } = req.body;

        const application =
            await approveApplicationService(
                id,
                txHash
            );

        res.status(200).json({

            success: true,

            application

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};