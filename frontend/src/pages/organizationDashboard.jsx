import { useEffect, useState } from "react";

import { getIssuerRequests } from "../services/requestService";
import { getCertificateByHash } from "../services/certificateService";
import MeshBackground from "../components/common/MeshBackground";
import { Link } from "react-router-dom";

const OrganisationRequests = () => {

    const [requests, setRequests] = useState([]);

    const [darkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });


    useEffect(() => {
        loadRequests();
    }, []);


    const loadRequests = async () => {

        console.log("Loading Requests...");

        const blockchainRequests = await getIssuerRequests();

        console.log(
            "Blockchain Requests:",
            blockchainRequests
        );

        const data = [];

        for (const request of blockchainRequests) {

            console.log("Request:", request);

            const certificate =
                await getCertificateByHash(
                    request.credentialHash
                );

            console.log("Certificate:", certificate);
            console.log(certificate);
            console.log(certificate.certificateURL);

            data.push({
                request,
                certificate,
            });
        }

        console.log("Final Data:", data);

        setRequests(data);
    };


    return (

        <div
            className={`relative min-h-screen overflow-hidden px-6 py-10 transition-colors duration-500 ${
                darkMode
                    ? "bg-[#070B14] text-white"
                    : "bg-[#F6F8FC] text-slate-900"
            }`}
        >

            {/* ================= MESH BACKGROUND ================= */}

            <MeshBackground darkMode={darkMode} />


            {/* ================= BACKGROUND GLOW ================= */}

            <div
                className={`pointer-events-none fixed -left-40 -top-40 h-96 w-96 rounded-full blur-[130px] ${
                    darkMode
                        ? "bg-blue-600/15"
                        : "bg-blue-500/10"
                }`}
            />

            <Link
                to="/organisation/project"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
                Browse Pending Projects
            </Link>

            <div
                className={`pointer-events-none fixed -bottom-40 -right-40 h-96 w-96 rounded-full blur-[130px] ${
                    darkMode
                        ? "bg-violet-600/15"
                        : "bg-violet-500/10"
                }`}
            />


            {/* ================= MAIN CONTENT ================= */}

            <div className="relative z-10 mx-auto max-w-6xl">


                {/* ================= HEADER ================= */}

                <div className="mb-8">

                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">
                        Verification
                    </p>

                    <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                        Certificate Requests
                    </h1>

                    <p
                        className={`mt-3 max-w-2xl text-sm leading-6 ${
                            darkMode
                                ? "text-slate-400"
                                : "text-slate-500"
                        }`}
                    >
                        Review certificate verification requests
                        submitted to your organisation.
                    </p>

                </div>


                {/* ================= REQUEST COUNT ================= */}

                <div
                    className={`mb-6 inline-flex items-center gap-3 rounded-2xl border px-5 py-3 ${
                        darkMode
                            ? "border-white/10 bg-white/[0.04]"
                            : "border-slate-200 bg-white shadow-sm"
                    }`}
                >

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                        ✓
                    </div>

                    <div>

                        <p className="text-xs text-slate-500">
                            Pending Requests
                        </p>

                        <p className="text-lg font-bold">
                            {requests.length}
                        </p>

                    </div>

                </div>


                {/* ================= EMPTY STATE ================= */}

                {requests.length === 0 && (

                    <div
                        className={`rounded-3xl border p-12 text-center backdrop-blur-xl ${
                            darkMode
                                ? "border-white/10 bg-white/[0.04]"
                                : "border-slate-200 bg-white/80 shadow-sm"
                        }`}
                    >

                        <div
                            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-2xl ${
                                darkMode
                                    ? "bg-violet-500/10"
                                    : "bg-violet-50"
                            }`}
                        >
                            📜
                        </div>

                        <h2 className="mt-5 text-xl font-bold">
                            No Requests Found
                        </h2>

                        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                            Certificate verification requests will
                            appear here when they are submitted.
                        </p>

                    </div>

                )}


                {/* ================= REQUESTS ================= */}

                {requests.length > 0 && (

                    <div className="grid gap-6 md:grid-cols-2">

                        {requests.map((item, index) => (

                            <div
                                key={index}
                                className={`rounded-3xl border p-6 backdrop-blur-xl transition-all duration-300 ${
                                    darkMode
                                        ? "border-white/10 bg-white/[0.045] shadow-xl shadow-black/20 hover:-translate-y-1 hover:border-violet-500/20"
                                        : "border-slate-200 bg-white/85 shadow-sm hover:-translate-y-1 hover:shadow-lg"
                                }`}
                            >

                                {/* Card Header */}

                                <div className="flex items-start justify-between gap-4">

                                    <div
                                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                                            darkMode
                                                ? "bg-violet-500/10 text-violet-400"
                                                : "bg-violet-50 text-violet-600"
                                        }`}
                                    >
                                        📜
                                    </div>

                                    <span
                                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                            darkMode
                                                ? "bg-blue-500/10 text-blue-400"
                                                : "bg-blue-50 text-blue-600"
                                        }`}
                                    >
                                        Verification Request
                                    </span>

                                </div>


                                {/* Certificate Name */}

                                <h2 className="mt-6 text-xl font-bold">
                                    {item.certificate.certificateName}
                                </h2>


                                {/* Details */}

                                <div className="mt-5 space-y-3">

                                    {/* Issuer */}

                                    <div
                                        className={`rounded-2xl p-4 ${
                                            darkMode
                                                ? "bg-white/[0.03]"
                                                : "bg-slate-50"
                                        }`}
                                    >

                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            Issuer
                                        </p>

                                        <p className="mt-1 text-sm font-medium">
                                            {item.certificate.issuer}
                                        </p>

                                    </div>


                                    {/* Certificate Type */}

                                    <div
                                        className={`rounded-2xl p-4 ${
                                            darkMode
                                                ? "bg-white/[0.03]"
                                                : "bg-slate-50"
                                        }`}
                                    >

                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            Certificate Type
                                        </p>

                                        <p className="mt-1 text-sm font-medium">
                                            {item.certificate.certificateType}
                                        </p>

                                    </div>

                                </div>


                                {/* View Certificate */}

                                <a
                                    href={
                                        item.certificate.certificateURL
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-6 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30"
                                >
                                    View Certificate →
                                </a>

                            </div>

                        ))}

                    </div>

                )}

            </div>

        </div>

    );
};

export default OrganisationRequests;