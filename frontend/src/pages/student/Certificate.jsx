import { useState, useEffect } from "react";
import { uploadCertificate } from "../../services/certificateService";
import { createVerificationRequest } from "../../services/verificationService";
import { getVerifiedOrganisations } from "../../services/organisationService";
import MeshBackground from "../../components/common/MeshBackground";


const UploadCertificate = () => {

    const [formData, setFormData] = useState({
        certificateName: "",
        issuer: "",
        certificateType: "",
        issueDate: "",
        expiryDate: "",
        description: "",
        hasExpiry: "",
    });

    const [organisations, setOrganisations] = useState([]);
    const [selectedOrganisationId, setSelectedOrganisationId] = useState("");
    const [selectedIssuerWallet, setSelectedIssuerWallet] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

    const [darkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });

    useEffect(() => {
        const loadOrganisations = async () => {
            try {
                const data = await getVerifiedOrganisations();
                setOrganisations(data || []);
            } catch (error) {
                console.error("Failed to load organisations:", error);
            }
        };

        loadOrganisations();
    }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleIssuerChange = (e) => {
        const orgId = e.target.value;
        setSelectedOrganisationId(orgId);

        const organisation = organisations.find(
            (org) => org._id === orgId
        );

        setSelectedIssuerWallet(organisation?.walletAddress || "");

        setFormData((prev) => ({
            ...prev,
            issuer: organisation?.organisationName || "",
        }));
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatusMessage({ type: "", text: "" });

        let expiry = 0;
        if (formData.hasExpiry === "yes" && formData.expiryDate) {
            expiry = Math.floor(new Date(formData.expiryDate).getTime() / 1000);
        }

        if (!file) {
            setStatusMessage({ type: "error", text: "Please select a certificate file." });
            return;
        }

        if (!selectedOrganisationId) {
            setStatusMessage({ type: "error", text: "Please select an issuing organisation." });
            return;
        }

        setLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");

            const data = new FormData();
            data.append("student", user._id);
            data.append("certificateName", formData.certificateName);
            data.append("issuer", formData.issuer);
            data.append("certificateType", formData.certificateType);
            data.append("issueDate", formData.issueDate);
            data.append("expiryDate", formData.expiryDate || "");
            data.append("description", formData.description);
            data.append("certificate", file);
            data.append("hasExpiry", formData.hasExpiry === "yes");
            if (selectedOrganisationId) {
                data.append("requestOrganisationId", selectedOrganisationId);
            }

            setStatusMessage({ type: "info", text: "Uploading certificate…" });
            const response = await uploadCertificate(data);

            const certId = response.certificate?._id;
            if (certId && selectedOrganisationId) {
                setStatusMessage({ type: "info", text: "Creating verification request…" });
                try {
                    await createVerificationRequest({ certificateId: certId, organisationId: selectedOrganisationId });
                    setStatusMessage({ type: "success", text: "✓ Certificate uploaded and verification request sent." });
                } catch (reqErr) {
                    setStatusMessage({
                        type: "warning",
                        text: `Certificate uploaded, but verification request failed: ${reqErr.response?.data?.message || reqErr.message}`
                    });
                }
            } else {
                setStatusMessage({ type: "success", text: "✓ Certificate uploaded successfully." });
            }

            setFormData({ certificateName: "", issuer: "", certificateType: "", issueDate: "", expiryDate: "", description: "", hasExpiry: "" });
            setSelectedOrganisationId("");
            setSelectedIssuerWallet("");
            setFile(null);

        } catch (error) {
            console.error("Upload error:", error);
            setStatusMessage({
                type: "error",
                text: error.response?.data?.message || error.message || "Upload Failed"
            });
        } finally {
            setLoading(false);
        }

    };

    return (

        <div
            className={`relative min-h-screen overflow-hidden px-6 py-10 transition-colors duration-500 ${darkMode
                ? "bg-[#070B14] text-white"
                : "bg-[#F6F8FC] text-slate-900"
                }`}
        >

            {/* ================= MESH ================= */}

            <MeshBackground darkMode={darkMode} />


            {/* ================= BACKGROUND GLOW ================= */}

            <div
                className={`pointer-events-none fixed -left-40 -top-40 h-96 w-96 rounded-full blur-[130px] ${darkMode
                    ? "bg-blue-600/15"
                    : "bg-blue-500/10"
                    }`}
            />

            <div
                className={`pointer-events-none fixed -bottom-40 -right-40 h-96 w-96 rounded-full blur-[130px] ${darkMode
                    ? "bg-violet-600/15"
                    : "bg-violet-500/10"
                    }`}
            />


            {/* ================= MAIN ================= */}

            <div className="relative z-10 mx-auto max-w-4xl">


                {/* ================= HEADER ================= */}

                <div className="mb-8">

                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                        Credentials
                    </p>

                    <h1
                        className={`mt-2 text-3xl font-bold tracking-tight sm:text-4xl ${darkMode
                            ? "text-white"
                            : "text-slate-900"
                            }`}
                    >
                        Upload Certificate
                    </h1>

                    <p
                        className={`mt-3 max-w-2xl text-sm leading-6 ${darkMode
                            ? "text-slate-400"
                            : "text-slate-500"
                            }`}
                    >
                        Add a credential to your SkillSync identity
                        and send it to a verified organisation for
                        verification.
                    </p>

                </div>


                {/* ================= CARD ================= */}

                <div
                    className={`rounded-3xl border p-7 shadow-2xl backdrop-blur-xl sm:p-9 ${darkMode
                        ? "border-white/10 bg-white/[0.045] shadow-black/30"
                        : "border-slate-200 bg-white/90 shadow-slate-200/70"
                        }`}
                >


                    {/* ================= SECTION HEADER ================= */}

                    <div
                        className={`mb-8 flex items-center gap-4 border-b pb-6 ${darkMode
                            ? "border-white/10"
                            : "border-slate-200"
                            }`}
                    >

                        <div
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${darkMode
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-blue-50 text-blue-600"
                                }`}
                        >
                            ◈
                        </div>

                        <div>

                            <h2 className="text-lg font-semibold">
                                Credential Details
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Enter the information exactly as it
                                appears on your credential.
                            </p>

                        </div>

                    </div>


                    {/* ================= FORM ================= */}

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-7"
                    >


                        {/* ================= CERTIFICATE NAME ================= */}

                        <div>

                            <label
                                className={`mb-2 block text-sm font-semibold ${darkMode
                                    ? "text-slate-300"
                                    : "text-slate-700"
                                    }`}
                            >
                                Certificate Name
                            </label>

                            <input
                                type="text"
                                name="certificateName"
                                value={
                                    formData.certificateName
                                }
                                onChange={handleChange}
                                className={`w-full rounded-xl border px-4 py-3.5 outline-none transition ${darkMode
                                    ? "border-white/10 bg-white/[0.04] text-white placeholder-slate-600 focus:border-blue-500/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-blue-500/10"
                                    : "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                    }`}
                                placeholder="AWS Cloud Practitioner"
                                required
                            />

                        </div>


                        {/* ================= TYPE ================= */}

                        <div>

                            <label
                                className={`mb-2 block text-sm font-semibold ${darkMode
                                    ? "text-slate-300"
                                    : "text-slate-700"
                                    }`}
                            >
                                Credential Type
                            </label>

                            <select
                                name="certificateType"
                                value={
                                    formData.certificateType
                                }
                                onChange={handleChange}
                                className={`w-full rounded-xl border px-4 py-3.5 outline-none transition ${darkMode
                                    ? "border-white/10 bg-[#111722] text-white focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10"
                                    : "border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                    }`}
                                required
                            >

                                <option value="">
                                    Select Credential Type
                                </option>

                                <option value="Course">
                                    Course
                                </option>

                                <option value="Internship">
                                    Internship
                                </option>

                                <option value="Workshop">
                                    Workshop
                                </option>

                                <option value="Hackathon">
                                    Hackathon
                                </option>

                                <option value="Competition">
                                    Competition
                                </option>

                                <option value="Professional">
                                    Professional
                                </option>

                            </select>

                        </div>


                        {/* ================= DATES ================= */}

                        <div className="grid gap-6 sm:grid-cols-2">

                            <div>

                                <label
                                    className={`mb-2 block text-sm font-semibold ${darkMode
                                        ? "text-slate-300"
                                        : "text-slate-700"
                                        }`}
                                >
                                    Issue Date
                                </label>

                                <input
                                    type="date"
                                    name="issueDate"
                                    value={
                                        formData.issueDate
                                    }
                                    onChange={handleChange}
                                    className={`w-full rounded-xl border px-4 py-3.5 outline-none transition ${darkMode
                                        ? "border-white/10 bg-white/[0.04] text-white focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10"
                                        : "border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                        }`}
                                    required
                                />

                            </div>


                            <div>

                                <label
                                    className={`mb-2 block text-sm font-semibold ${darkMode
                                        ? "text-slate-300"
                                        : "text-slate-700"
                                        }`}
                                >
                                    Does this credential expire?
                                </label>

                                <select
                                    name="hasExpiry"
                                    value={
                                        formData.hasExpiry
                                    }
                                    onChange={handleChange}
                                    className={`w-full rounded-xl border px-4 py-3.5 outline-none transition ${darkMode
                                        ? "border-white/10 bg-[#111722] text-white focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10"
                                        : "border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                        }`}
                                >

                                    <option value="yes">
                                        Yes
                                    </option>

                                    <option value="no">
                                        No
                                    </option>

                                </select>


                                {formData.hasExpiry === "yes" && (

                                    <div className="mt-5">

                                        <label
                                            className={`mb-2 block text-sm font-semibold ${darkMode
                                                ? "text-slate-300"
                                                : "text-slate-700"
                                                }`}
                                        >
                                            Expiry Date
                                        </label>

                                        <input
                                            type="date"
                                            name="expiryDate"
                                            value={
                                                formData.expiryDate
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            className={`w-full rounded-xl border px-4 py-3.5 outline-none transition ${darkMode
                                                ? "border-white/10 bg-white/[0.04] text-white focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10"
                                                : "border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                                }`}
                                            required
                                        />

                                    </div>

                                )}

                            </div>

                        </div>


                        {/* ================= ISSUER ================= */}

                        <div>

                            <label
                                className={`mb-2 block text-sm font-semibold ${darkMode
                                    ? "text-slate-300"
                                    : "text-slate-700"
                                    }`}
                            >
                                Select Issuer
                            </label>

                            <select
                                value={
                                    selectedOrganisationId
                                }
                                onChange={
                                    handleIssuerChange
                                }
                                className={`w-full rounded-xl border px-4 py-3.5 outline-none transition ${darkMode
                                    ? "border-white/10 bg-[#111722] text-white focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                                    : "border-slate-200 bg-slate-50 text-slate-900 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                                    }`}
                                required
                            >

                                <option value="">
                                    Select Issuer
                                </option>

                                {organisations.map((org) => (

                                    <option
                                        key={org._id}
                                        value={org._id}
                                    >
                                        {org.organisationName}
                                    </option>

                                ))}

                            </select>


                            {formData.issuer && (

                                <div
                                    className={`mt-3 flex items-center justify-between rounded-xl px-4 py-3 text-xs ${darkMode
                                        ? "bg-emerald-500/5 text-emerald-400"
                                        : "bg-emerald-50 text-emerald-600"
                                        }`}
                                >

                                    <div className="flex items-center gap-2">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        <span>Issuer selected: {formData.issuer}</span>
                                    </div>

                                    {selectedIssuerWallet && (
                                        <span className="font-mono text-[11px] opacity-75">
                                            {selectedIssuerWallet.slice(0, 6)}...{selectedIssuerWallet.slice(-4)}
                                        </span>
                                    )}

                                </div>

                            )}

                        </div>


                        {/* ================= DESCRIPTION ================= */}

                        <div>

                            <label
                                className={`mb-2 block text-sm font-semibold ${darkMode
                                    ? "text-slate-300"
                                    : "text-slate-700"
                                    }`}
                            >
                                Description
                            </label>

                            <textarea
                                rows="4"
                                name="description"
                                value={
                                    formData.description
                                }
                                onChange={handleChange}
                                className={`w-full resize-none rounded-xl border px-4 py-3.5 outline-none transition ${darkMode
                                    ? "border-white/10 bg-white/[0.04] text-white placeholder-slate-600 focus:border-blue-500/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-blue-500/10"
                                    : "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                    }`}
                                placeholder="Additional details..."
                            />

                        </div>


                        {/* ================= FILE ================= */}

                        <div>

                            <label
                                className={`mb-2 block text-sm font-semibold ${darkMode
                                    ? "text-slate-300"
                                    : "text-slate-700"
                                    }`}
                            >
                                Certificate File
                            </label>

                            <div
                                className={`rounded-2xl border border-dashed p-6 ${darkMode
                                    ? "border-white/15 bg-white/[0.025]"
                                    : "border-slate-300 bg-slate-50"
                                    }`}
                            >

                                <div className="text-center">

                                    <div
                                        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${darkMode
                                            ? "bg-blue-500/10 text-blue-400"
                                            : "bg-blue-50 text-blue-600"
                                            }`}
                                    >
                                        ↑
                                    </div>

                                    <p className="mt-3 text-sm font-semibold">
                                        Upload your credential
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        PDF, JPG, JPEG or PNG
                                    </p>

                                </div>


                                <input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    onChange={handleFileChange}
                                    className={`mt-5 w-full rounded-xl border px-4 py-3 text-sm ${darkMode
                                        ? "border-white/10 bg-white/[0.04] text-slate-300"
                                        : "border-slate-200 bg-white text-slate-600"
                                        }`}
                                    required
                                />


                                {file && (

                                    <div
                                        className={`mt-3 rounded-xl px-4 py-3 text-xs ${darkMode
                                            ? "bg-emerald-500/5 text-emerald-400"
                                            : "bg-emerald-50 text-emerald-600"
                                            }`}
                                    >
                                        ✓ {file.name}
                                    </div>

                                )}

                            </div>

                        </div>


                        {/* ================= STATUS BANNER ================= */}
                        {statusMessage.text && (
                            <div
                                className={`rounded-2xl p-4 text-sm font-medium ${
                                    statusMessage.type === "success"
                                        ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                        : statusMessage.type === "error"
                                        ? "border border-red-500/30 bg-red-500/10 text-red-400"
                                        : "border border-blue-500/30 bg-blue-500/10 text-blue-400"
                                }`}
                            >
                                {statusMessage.text}
                            </div>
                        )}

                        {/* ================= SUBMIT ================= */}

                        <div
                            className={`border-t pt-7 ${darkMode
                                ? "border-white/10"
                                : "border-slate-200"
                                }`}
                        >

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30 ${
                                    loading ? "cursor-not-allowed opacity-60" : ""
                                }`}
                            >
                                {loading ? "Uploading & Creating On-Chain Request..." : "Upload Certificate & Request Verification →"}
                            </button>

                            <p className="mt-3 text-center text-xs text-slate-500">
                                Your credential will be submitted for
                                on-chain organisation verification.
                            </p>

                        </div>

                    </form>

                </div>

            </div>

        </div>

    );
};

export default UploadCertificate;