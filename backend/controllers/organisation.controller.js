import {
    createApplicationService,
    getPendingApplicationsService,
    approveApplicationService,
    rejectApplicationService,
    organisationLoginService
} from "../services/organisation.service.js";
import OrganisationApplication from "../models/OrganisationApplication.js";

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
        const application = await approveApplicationService( id, txHash );
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

export const rejectApplication = async (req, res) => {

    try {

        const { id } = req.body;

        const application =
            await rejectApplicationService(id);

        res.status(200).json({

            success: true,

            application

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

export const getVerifiedOrganisations = async (req, res) => {
    try {
        const organisations = await OrganisationApplication.find(
                { status: "Approved" },
                {
                    organisationName: 1,
                    walletAddress: 1
                }
            );
        res.status(200).json({
            success: true,
            organisations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


export const organisationLogin = async (req, res) => {
    try {
        const { walletAddress } = req.body;
        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                message: "Wallet address is required"
            });
        }
        const result = await organisationLoginService( walletAddress );
        return res.status(200).json({
            success: true,
            message: "Organization login successful",
            token: result.token,
            user: result.user
        });
    }
    catch (error) {
        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message: error.message || "Organization login failed"
        });
    }
};