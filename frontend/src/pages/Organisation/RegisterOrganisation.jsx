import { useState } from "react";
import { applyOrganisation } from "../../services/organisationService";
import MeshBackground from "../../components/common/MeshBackground";


const RegisterOrganisation = () => {
    const [darkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });

    const [formData, setFormData] = useState({
        organisationName: "",
        email: "",
        password: "",
        confirmPassword: "",
        registrationNumber: "",
        organisationType: "Company",
    });

    const [details, setDetails] = useState({
        industry: "",
        website: "",
        institutionCode: "",
        affiliation: "",
        researchArea: "",
        parentInstitution: "",
        focusArea: "",
        registrationAuthority: "",
        department: "",
        jurisdiction: "",
        description: ""
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleDetailsChange = (e) => {
        setDetails({
            ...details,
            [e.target.name]: e.target.value
        });
    };

    const validateForm = () => {
        if (!formData.organisationName.trim()) return "Organization Name is required";
        if (!formData.email.trim()) return "Official Email is required";
        if (!formData.password) return "Password is required";
        if (formData.password.length < 8) return "Password must be at least 8 characters";
        if (formData.password !== formData.confirmPassword) return "Passwords do not match";
        if (!formData.registrationNumber.trim()) return "Registration Number is required";

        // Type specific validation
        switch (formData.organisationType) {
            case "Company":
                if (!details.industry.trim()) return "Industry is required for Company";
                if (!details.website.trim()) return "Website is required for Company";
                break;
            case "University":
                if (!details.institutionCode.trim()) return "Institution Code is required";
                if (!details.affiliation.trim()) return "Affiliation is required";
                if (!details.website.trim()) return "Website is required";
                break;
            case "ResearchLab":
                if (!details.researchArea.trim()) return "Research Area is required";
                if (!details.parentInstitution.trim()) return "Parent Institution is required";
                if (!details.website.trim()) return "Website is required";
                break;
            case "NGO":
                if (!details.focusArea.trim()) return "Focus Area is required";
                if (!details.registrationAuthority.trim()) return "Registration Authority is required";
                if (!details.website.trim()) return "Website is required";
                break;
            case "Government":
                if (!details.department.trim()) return "Department is required";
                if (!details.jurisdiction.trim()) return "Jurisdiction is required";
                if (!details.website.trim()) return "Website is required";
                break;
            case "Other":
                if (!details.description.trim()) return "Description is required";
                if (!details.website.trim()) return "Website is required";
                break;
            default:
                break;
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: "", text: "" });

        const validationError = validateForm();
        if (validationError) {
            setMessage({ type: "error", text: validationError });
            return;
        }

        setLoading(true);
        try {
            const { confirmPassword, ...submitData } = formData;
            const response = await applyOrganisation({
                ...submitData,
                details,
                website: details.website,
                description: details.description,
            });

            setMessage({ type: "success", text: response.message || "Application submitted successfully! Awaiting Admin review." });

            setFormData({
                organisationName: "",
                email: "",
                password: "",
                confirmPassword: "",
                registrationNumber: "",
                organisationType: "Company",
            });
            setDetails({
                industry: "",
                website: "",
                institutionCode: "",
                affiliation: "",
                researchArea: "",
                parentInstitution: "",
                focusArea: "",
                registrationAuthority: "",
                department: "",
                jurisdiction: "",
                description: ""
            });
        } catch (error) {
            console.error(error);
            setMessage({
                type: "error",
                text: error.response?.data?.message || error.message || "Application Failed"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className={`relative min-h-screen overflow-hidden px-4 py-10 transition-colors duration-500 ${
                darkMode
                    ? "bg-[#070B14] text-white"
                    : "bg-slate-50 text-slate-900"
            }`}
        >

            {/* ================= MESH BACKGROUND ================= */}

            <MeshBackground darkMode={darkMode} />

            {/* ================= BACKGROUND GLOW ================= */}

            <div
                className={`pointer-events-none absolute -left-40 -top-40 h-[450px] w-[450px] rounded-full blur-[140px] ${
                    darkMode
                        ? "bg-violet-600/20"
                        : "bg-violet-500/10"
                }`}
            />

            <div
                className={`pointer-events-none absolute -bottom-40 -right-40 h-[450px] w-[450px] rounded-full blur-[140px] ${
                    darkMode
                        ? "bg-blue-600/20"
                        : "bg-blue-500/10"
                }`}
            />

            <div
                className={`pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px] ${
                    darkMode
                        ? "bg-cyan-500/5"
                        : "bg-cyan-500/10"
                }`}
            />


            {/* ================= MAIN CONTENT ================= */}

            <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">

                <div className="grid w-full items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">


                    {/* ================================================= */}
                    {/* LEFT SIDE */}
                    {/* ================================================= */}

                    <div className="hidden lg:block">

                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">
                            Organization Network
                        </p>


                        <h1 className="mt-4 max-w-xl text-5xl font-extrabold leading-tight tracking-tight">

                            Connect your
                            <br />

                            <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                                organization.
                            </span>

                        </h1>


                        <p
                            className={`mt-6 max-w-lg text-lg leading-8 ${
                                darkMode
                                    ? "text-slate-400"
                                    : "text-slate-600"
                            }`}
                        >
                            Join SkillSync and become part of a trusted
                            credential verification network.
                        </p>


                        {/* FEATURE CARDS */}

                        <div className="mt-10 grid max-w-lg gap-4">


                            {/* Trusted Organizations */}

                            <div
                                className={`flex items-center gap-4 rounded-2xl border p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 ${
                                    darkMode
                                        ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                                        : "border-slate-200 bg-white/70 hover:bg-white shadow-sm"
                                }`}
                            >

                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-xl">
                                    🏢
                                </div>

                                <div>

                                    <p className="font-semibold">
                                        Trusted Organizations
                                    </p>

                                    <p
                                        className={`mt-1 text-sm ${
                                            darkMode
                                                ? "text-slate-500"
                                                : "text-slate-500"
                                        }`}
                                    >
                                        Build credibility through verified identity
                                    </p>

                                </div>

                            </div>


                            {/* Secure Identity */}

                            <div
                                className={`flex items-center gap-4 rounded-2xl border p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 ${
                                    darkMode
                                        ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                                        : "border-slate-200 bg-white/70 hover:bg-white shadow-sm"
                                }`}
                            >

                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-xl">
                                    🔐
                                </div>

                                <div>

                                    <p className="font-semibold">
                                        Secure Identity
                                    </p>

                                    <p
                                        className={`mt-1 text-sm ${
                                            darkMode
                                                ? "text-slate-500"
                                                : "text-slate-500"
                                        }`}
                                    >
                                        Your organization's identity is verified and secured
                                    </p>

                                </div>

                            </div>


                            {/* Credential Verification */}

                            <div
                                className={`flex items-center gap-4 rounded-2xl border p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 ${
                                    darkMode
                                        ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                                        : "border-slate-200 bg-white/70 hover:bg-white shadow-sm"
                                }`}
                            >

                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-xl">
                                    ✓
                                </div>

                                <div>

                                    <p className="font-semibold">
                                        Credential Verification
                                    </p>

                                    <p
                                        className={`mt-1 text-sm ${
                                            darkMode
                                                ? "text-slate-500"
                                                : "text-slate-500"
                                        }`}
                                    >
                                        Help verify trusted student achievements
                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>


                    {/* ================================================= */}
                    {/* REGISTRATION CARD */}
                    {/* ================================================= */}

                    <div className="w-full max-w-xl lg:ml-auto">


                        {/* MOBILE HEADER */}

                        <div className="mb-7 text-center lg:hidden">

                            <h1 className="text-3xl font-bold tracking-tight">

                                Skill
                                <span className="text-blue-400">
                                    Sync
                                </span>

                            </h1>

                            <p
                                className={`mt-2 text-sm ${
                                    darkMode
                                        ? "text-slate-500"
                                        : "text-slate-500"
                                }`}
                            >
                                Organization registration
                            </p>

                        </div>


                        {/* CARD */}

                        <div
                            className={`rounded-3xl border p-7 shadow-2xl backdrop-blur-2xl sm:p-9 ${
                                darkMode
                                    ? "border-white/10 bg-white/[0.06] shadow-black/30"
                                    : "border-slate-200 bg-white/80 shadow-slate-300/30"
                            }`}
                        >


                            {/* HEADER */}

                            <div className="mb-8">

                                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-400">
                                    Organization Registration
                                </p>

                                <h2 className="mt-2 text-3xl font-bold tracking-tight">
                                    Join SkillSync
                                </h2>

                                <p
                                    className={`mt-2 text-sm leading-6 ${
                                        darkMode
                                            ? "text-slate-400"
                                            : "text-slate-500"
                                    }`}
                                >
                                    Register your organization to participate
                                    in trusted credential verification.
                                </p>

                            </div>


                            {/* FORM */}

                            <form
                                onSubmit={handleSubmit}
                                className="space-y-5"
                            >


                                {/* ORGANISATION NAME */}

                                <div>

                                    <label
                                        className={`mb-2 block text-sm font-medium ${
                                            darkMode
                                                ? "text-slate-300"
                                                : "text-slate-700"
                                        }`}
                                    >
                                        Organisation Name
                                    </label>

                                    <input
                                        type="text"
                                        name="organisationName"
                                        value={formData.organisationName}
                                        onChange={handleChange}
                                        placeholder="Google"
                                        required
                                        className={`w-full rounded-xl border px-4 py-3.5 outline-none transition duration-300 ${
                                            darkMode
                                                ? "border-white/10 bg-white/[0.05] text-white placeholder-slate-600 focus:border-violet-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-violet-500/10"
                                                : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                                        }`}
                                    />

                                </div>


                                {/* EMAIL */}

                                <div>

                                    <label
                                        className={`mb-2 block text-sm font-medium ${
                                            darkMode
                                                ? "text-slate-300"
                                                : "text-slate-700"
                                        }`}
                                    >
                                        Email
                                    </label>

                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="admin@google.com"
                                        required
                                        className={`w-full rounded-xl border px-4 py-3.5 outline-none transition duration-300 ${
                                            darkMode
                                                ? "border-white/10 bg-white/[0.05] text-white placeholder-slate-600 focus:border-violet-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-violet-500/10"
                                                : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                                        }`}
                                    />

                                </div>


                                {/* PASSWORD */}

                                <div>

                                    <label
                                        className={`mb-2 block text-sm font-medium ${
                                            darkMode
                                                ? "text-slate-300"
                                                : "text-slate-700"
                                        }`}
                                    >
                                        Password
                                    </label>

                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="•••••••• (min 8 characters)"
                                        required
                                        minLength={8}
                                        className={`w-full rounded-xl border px-4 py-3.5 outline-none transition duration-300 ${
                                            darkMode
                                                ? "border-white/10 bg-white/[0.05] text-white placeholder-slate-600 focus:border-violet-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-violet-500/10"
                                                : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                                        }`}
                                    />

                                </div>


                                {/* CONFIRM PASSWORD */}

                                <div>

                                    <label
                                        className={`mb-2 block text-sm font-medium ${
                                            darkMode
                                                ? "text-slate-300"
                                                : "text-slate-700"
                                        }`}
                                    >
                                        Confirm Password
                                    </label>

                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        required
                                        minLength={8}
                                        className={`w-full rounded-xl border px-4 py-3.5 outline-none transition duration-300 ${
                                            darkMode
                                                ? "border-white/10 bg-white/[0.05] text-white placeholder-slate-600 focus:border-violet-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-violet-500/10"
                                                : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                                        }`}
                                    />

                                </div>


                                {/* REGISTRATION NUMBER */}

                                <div>

                                    <label
                                        className={`mb-2 block text-sm font-medium ${
                                            darkMode
                                                ? "text-slate-300"
                                                : "text-slate-700"
                                        }`}
                                    >
                                        Registration Number
                                    </label>

                                    <input
                                        type="text"
                                        name="registrationNumber"
                                        value={formData.registrationNumber}
                                        onChange={handleChange}
                                        placeholder="REG123456"
                                        required
                                        className={`w-full rounded-xl border px-4 py-3.5 outline-none transition duration-300 ${
                                            darkMode
                                                ? "border-white/10 bg-white/[0.05] text-white placeholder-slate-600 focus:border-violet-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-violet-500/10"
                                                : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                                        }`}
                                    />

                                </div>


                                {/* ORGANISATION TYPE */}

                                <div>

                                    <label
                                        className={`mb-2 block text-sm font-medium ${
                                            darkMode
                                                ? "text-slate-300"
                                                : "text-slate-700"
                                        }`}
                                    >
                                        Organisation Type
                                    </label>

                                    <select
                                        name="organisationType"
                                        value={formData.organisationType}
                                        onChange={handleChange}
                                        className={`w-full cursor-pointer rounded-xl border px-4 py-3.5 outline-none transition duration-300 ${
                                            darkMode
                                                ? "border-white/10 bg-[#111827] text-white focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                                                : "border-slate-200 bg-white text-slate-900 focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                                        }`}
                                    >

                                        <option value="Company">Company</option>
                                        <option value="University">University</option>
                                        <option value="ResearchLab">Research Lab</option>
                                        <option value="NGO">NGO</option>
                                        <option value="Government">Government</option>
                                        <option value="Other">Other</option>

                                    </select>

                                </div>


                                {/* ================= DYNAMIC TYPE-SPECIFIC DETAILS ================= */}

                                {formData.organisationType === "Company" && (
                                    <div className="space-y-4 rounded-2xl border border-violet-500/20 bg-violet-500/[0.03] p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                                            Company Details
                                        </p>
                                        <div>
                                            <label className={`mb-1 block text-xs font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                                Industry *
                                            </label>
                                            <input
                                                type="text"
                                                name="industry"
                                                value={details.industry}
                                                onChange={handleDetailsChange}
                                                placeholder="e.g. Information Technology, FinTech"
                                                required
                                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                                                    darkMode ? "border-white/10 bg-white/[0.05] text-white" : "border-slate-200 bg-white text-slate-900"
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`mb-1 block text-xs font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                                Website *
                                            </label>
                                            <input
                                                type="url"
                                                name="website"
                                                value={details.website}
                                                onChange={handleDetailsChange}
                                                placeholder="https://example.com"
                                                required
                                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                                                    darkMode ? "border-white/10 bg-white/[0.05] text-white" : "border-slate-200 bg-white text-slate-900"
                                                }`}
                                            />
                                        </div>
                                    </div>
                                )}

                                {formData.organisationType === "University" && (
                                    <div className="space-y-4 rounded-2xl border border-blue-500/20 bg-blue-500/[0.03] p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                                            University Details
                                        </p>
                                        <div>
                                            <label className={`mb-1 block text-xs font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                                Institution Code *
                                            </label>
                                            <input
                                                type="text"
                                                name="institutionCode"
                                                value={details.institutionCode}
                                                onChange={handleDetailsChange}
                                                placeholder="e.g. UNIV-9821"
                                                required
                                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                                                    darkMode ? "border-white/10 bg-white/[0.05] text-white" : "border-slate-200 bg-white text-slate-900"
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`mb-1 block text-xs font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                                Affiliation *
                                            </label>
                                            <input
                                                type="text"
                                                name="affiliation"
                                                value={details.affiliation}
                                                onChange={handleDetailsChange}
                                                placeholder="e.g. State University Board / UGC"
                                                required
                                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                                                    darkMode ? "border-white/10 bg-white/[0.05] text-white" : "border-slate-200 bg-white text-slate-900"
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`mb-1 block text-xs font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                                Website *
                                            </label>
                                            <input
                                                type="url"
                                                name="website"
                                                value={details.website}
                                                onChange={handleDetailsChange}
                                                placeholder="https://university.edu"
                                                required
                                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                                                    darkMode ? "border-white/10 bg-white/[0.05] text-white" : "border-slate-200 bg-white text-slate-900"
                                                }`}
                                            />
                                        </div>
                                    </div>
                                )}

                                {formData.organisationType === "ResearchLab" && (
                                    <div className="space-y-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.03] p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                                            Research Lab Details
                                        </p>
                                        <div>
                                            <label className={`mb-1 block text-xs font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                                Research Area *
                                            </label>
                                            <input
                                                type="text"
                                                name="researchArea"
                                                value={details.researchArea}
                                                onChange={handleDetailsChange}
                                                placeholder="e.g. Quantum Computing, AI Ethics"
                                                required
                                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                                                    darkMode ? "border-white/10 bg-white/[0.05] text-white" : "border-slate-200 bg-white text-slate-900"
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`mb-1 block text-xs font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                                Parent Institution *
                                            </label>
                                            <input
                                                type="text"
                                                name="parentInstitution"
                                                value={details.parentInstitution}
                                                onChange={handleDetailsChange}
                                                placeholder="e.g. National Science Foundation"
                                                required
                                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                                                    darkMode ? "border-white/10 bg-white/[0.05] text-white" : "border-slate-200 bg-white text-slate-900"
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`mb-1 block text-xs font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                                Website *
                                            </label>
                                            <input
                                                type="url"
                                                name="website"
                                                value={details.website}
                                                onChange={handleDetailsChange}
                                                placeholder="https://lab.org"
                                                required
                                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                                                    darkMode ? "border-white/10 bg-white/[0.05] text-white" : "border-slate-200 bg-white text-slate-900"
                                                }`}
                                            />
                                        </div>
                                    </div>
                                )}

                                {formData.organisationType === "NGO" && (
                                    <div className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                                            NGO Details
                                        </p>
                                        <div>
                                            <label className={`mb-1 block text-xs font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                                Focus Area *
                                            </label>
                                            <input
                                                type="text"
                                                name="focusArea"
                                                value={details.focusArea}
                                                onChange={handleDetailsChange}
                                                placeholder="e.g. Education, Sustainability"
                                                required
                                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                                                    darkMode ? "border-white/10 bg-white/[0.05] text-white" : "border-slate-200 bg-white text-slate-900"
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`mb-1 block text-xs font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                                Registration Authority *
                                            </label>
                                            <input
                                                type="text"
                                                name="registrationAuthority"
                                                value={details.registrationAuthority}
                                                onChange={handleDetailsChange}
                                                placeholder="e.g. Charity Commissioner"
                                                required
                                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                                                    darkMode ? "border-white/10 bg-white/[0.05] text-white" : "border-slate-200 bg-white text-slate-900"
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`mb-1 block text-xs font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                                Website *
                                            </label>
                                            <input
                                                type="url"
                                                name="website"
                                                value={details.website}
                                                onChange={handleDetailsChange}
                                                placeholder="https://ngo.org"
                                                required
                                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                                                    darkMode ? "border-white/10 bg-white/[0.05] text-white" : "border-slate-200 bg-white text-slate-900"
                                                }`}
                                            />
                                        </div>
                                    </div>
                                )}

                                {formData.organisationType === "Government" && (
                                    <div className="space-y-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                                            Government Department Details
                                        </p>
                                        <div>
                                            <label className={`mb-1 block text-xs font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                                Department *
                                            </label>
                                            <input
                                                type="text"
                                                name="department"
                                                value={details.department}
                                                onChange={handleDetailsChange}
                                                placeholder="e.g. Ministry of Higher Education"
                                                required
                                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                                                    darkMode ? "border-white/10 bg-white/[0.05] text-white" : "border-slate-200 bg-white text-slate-900"
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`mb-1 block text-xs font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                                Jurisdiction *
                                            </label>
                                            <input
                                                type="text"
                                                name="jurisdiction"
                                                value={details.jurisdiction}
                                                onChange={handleDetailsChange}
                                                placeholder="e.g. National / State"
                                                required
                                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                                                    darkMode ? "border-white/10 bg-white/[0.05] text-white" : "border-slate-200 bg-white text-slate-900"
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`mb-1 block text-xs font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                                Website *
                                            </label>
                                            <input
                                                type="url"
                                                name="website"
                                                value={details.website}
                                                onChange={handleDetailsChange}
                                                placeholder="https://gov.in"
                                                required
                                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                                                    darkMode ? "border-white/10 bg-white/[0.05] text-white" : "border-slate-200 bg-white text-slate-900"
                                                }`}
                                            />
                                        </div>
                                    </div>
                                )}

                                {formData.organisationType === "Other" && (
                                    <div className="space-y-4 rounded-2xl border border-slate-500/20 bg-slate-500/[0.03] p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                            Organisation Details
                                        </p>
                                        <div>
                                            <label className={`mb-1 block text-xs font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                                Description *
                                            </label>
                                            <textarea
                                                name="description"
                                                value={details.description}
                                                onChange={handleDetailsChange}
                                                placeholder="Describe the nature of your organisation..."
                                                rows={3}
                                                required
                                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                                                    darkMode ? "border-white/10 bg-white/[0.05] text-white" : "border-slate-200 bg-white text-slate-900"
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`mb-1 block text-xs font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                                Website *
                                            </label>
                                            <input
                                                type="url"
                                                name="website"
                                                value={details.website}
                                                onChange={handleDetailsChange}
                                                placeholder="https://example.org"
                                                required
                                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                                                    darkMode ? "border-white/10 bg-white/[0.05] text-white" : "border-slate-200 bg-white text-slate-900"
                                                }`}
                                            />
                                        </div>
                                    </div>
                                )}


                                {/* ALERT MESSAGE BANNER */}
                                {message.text && (
                                    <div
                                        className={`rounded-2xl p-4 text-sm font-medium ${
                                            message.type === "success"
                                                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                                : "border border-red-500/30 bg-red-500/10 text-red-400"
                                        }`}
                                    >
                                        {message.text}
                                    </div>
                                )}


                                {/* SUBMIT */}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/30 ${
                                        loading ? "cursor-not-allowed opacity-60" : ""
                                    }`}
                                >
                                    {loading ? "Submitting Application..." : "Submit Application →"}
                                </button>


                                {/* SECURITY */}

                                <div
                                    className={`flex items-center justify-center gap-4 pt-1 text-xs ${
                                        darkMode
                                            ? "text-slate-600"
                                            : "text-slate-500"
                                    }`}
                                >

                                    <span className="flex items-center gap-1.5">

                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                                        Secure Application

                                    </span>


                                    <span className="flex items-center gap-1.5">

                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />

                                        Identity Verified

                                    </span>

                                </div>

                            </form>

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
};

export default RegisterOrganisation;