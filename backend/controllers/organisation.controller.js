import {
    createApplicationService,
    getPendingApplicationsService,
    approveApplicationService,
    rejectApplicationService,
    getVerifiedOrganisationsService,
    getOrganisationProfileService,
} from "../services/organisation.service.js";

// ─── POST /api/organisation/apply ─────────────────────────────────────────────
export const createApplication = async (req, res) => {
    try {
        const application = await createApplicationService(req.body);
        return res.status(201).json({
            success: true,
            message: "Organisation application submitted successfully",
            application,
        });
    } catch (error) {
        console.error("[ORG APPLY ERROR]:", error.message);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
        });
    }
};

// ─── GET /api/organisation/pending ────────────────────────────────────────────
export const getPendingApplications = async (req, res) => {
    try {
        const applications = await getPendingApplicationsService();
        return res.status(200).json({
            success: true,
            applications,
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
        });
    }
};

// ─── PUT /api/organisation/approve ────────────────────────────────────────────
// Admin approves — backend performs blockchain registration
export const approveApplication = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: "id is required" });
        }

        const result = await approveApplicationService(id);
        return res.status(200).json({
            success: true,
            message: "Organisation approved and registered on blockchain",
            application: result.application,
            blockchain: result.blockchain,
        });
    } catch (error) {
        console.error("[ORG APPROVE ERROR]:", error.message);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
        });
    }
};

// ─── PUT /api/organisation/reject ─────────────────────────────────────────────
export const rejectApplication = async (req, res) => {
    try {
        const { id, rejectionReason } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: "id is required" });
        }

        const application = await rejectApplicationService(id, rejectionReason);
        return res.status(200).json({
            success: true,
            message: "Organisation application rejected",
            application,
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
        });
    }
};

// ─── GET /api/organisation/verified ───────────────────────────────────────────
export const getVerifiedOrganisations = async (req, res) => {
    try {
        const organisations = await getVerifiedOrganisationsService();
        return res.status(200).json({
            success: true,
            organisations,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ─── GET /api/organisation/profile ────────────────────────────────────────────
export const getOrganisationProfile = async (req, res) => {
    try {
        const orgId = req.user?.userId || req.user?._id;
        if (!orgId) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const org = await getOrganisationProfileService(orgId);
        return res.status(200).json({
            success: true,
            organisation: org,
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
        });
    }
};