import { useEffect, useState } from "react";

import {
    acceptOffer as acceptOfferOnChain,
    rejectOffer as rejectOfferOnChain,
} from "../../services/blockchainService";

import {
    getMyOffers,
    acceptOffer as acceptOfferBackend,
    rejectOffer as rejectOfferBackend,
} from "../../services/employmentService";

import MeshBackground from "../../components/common/MeshBackground";

function StudentOffers() {

    const [offers, setOffers] = useState([]);

    const [darkMode] = useState(() => {
        return localStorage.getItem("skillsync-theme") !== "light";
    });


    useEffect(() => {
        fetchOffers();
    }, []);


    async function fetchOffers() {

        try {

            const data = await getMyOffers();

            setOffers(data);

        } catch (err) {

            console.error(err);

        }

    }


    const [processingId, setProcessingId] = useState(null);
    const [statusMessage, setStatusMessage] = useState({ id: null, text: "", type: "" });

    async function handleAccept(offer) {
        setProcessingId(offer.offerId);
        setStatusMessage({ id: offer.offerId, text: "Prompting MetaMask transaction to accept offer on-chain...", type: "info" });

        try {
            // Step 1: Blockchain accept offer
            setStatusMessage({ id: offer.offerId, text: "Waiting for blockchain confirmation...", type: "info" });
            await acceptOfferOnChain(offer.offerId);

            // Step 2: MongoDB / Backend
            setStatusMessage({ id: offer.offerId, text: "Synchronizing database employment record...", type: "info" });
            await acceptOfferBackend(offer.offerId);

            setStatusMessage({ id: offer.offerId, text: "✓ Offer Accepted successfully on-chain!", type: "success" });

            setTimeout(() => {
                fetchOffers();
                setStatusMessage({ id: null, text: "", type: "" });
            }, 1500);
        } catch (err) {
            console.error("Accept offer error:", err);
            const errMsg = err.shortMessage || err.reason || err.message || "Failed to accept offer";
            setStatusMessage({ id: offer.offerId, text: `❌ ${errMsg}`, type: "error" });
        } finally {
            setProcessingId(null);
        }
    }

    async function handleReject(offerId) {
        setProcessingId(offerId);
        setStatusMessage({ id: offerId, text: "Prompting MetaMask transaction to reject offer on-chain...", type: "info" });

        try {
            // Step 1: Blockchain reject offer
            setStatusMessage({ id: offerId, text: "Waiting for blockchain confirmation...", type: "info" });
            await rejectOfferOnChain(offerId);

            // Step 2: MongoDB / Backend
            setStatusMessage({ id: offerId, text: "Updating database status...", type: "info" });
            await rejectOfferBackend(offerId);

            setStatusMessage({ id: offerId, text: "Offer Rejected.", type: "success" });

            setTimeout(() => {
                fetchOffers();
                setStatusMessage({ id: null, text: "", type: "" });
            }, 1500);
        } catch (err) {
            console.error("Reject offer error:", err);
            const errMsg = err.shortMessage || err.reason || err.message || "Failed to reject offer";
            setStatusMessage({ id: offerId, text: `❌ ${errMsg}`, type: "error" });
        } finally {
            setProcessingId(null);
        }
    }


    return (

        <div
            className={`relative min-h-screen overflow-hidden px-6 py-10 transition-colors duration-500 ${
                darkMode
                    ? "bg-[#070B14] text-white"
                    : "bg-[#F6F8FC] text-slate-900"
            }`}
        >

            {/* ================= MESH ================= */}

            <MeshBackground darkMode={darkMode} />


            {/* ================= BACKGROUND GLOW ================= */}

            <div
                className={`pointer-events-none fixed -left-40 -top-40 h-96 w-96 rounded-full blur-[130px] ${
                    darkMode
                        ? "bg-blue-600/15"
                        : "bg-blue-500/10"
                }`}
            />

            <div
                className={`pointer-events-none fixed -bottom-40 -right-40 h-96 w-96 rounded-full blur-[130px] ${
                    darkMode
                        ? "bg-violet-600/15"
                        : "bg-violet-500/10"
                }`}
            />


            {/* ================= MAIN ================= */}

            <div className="relative z-10 mx-auto max-w-6xl">


                {/* ================= HEADER ================= */}

                <div className="mb-8">

                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">
                        Employment
                    </p>

                    <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                        My Offers
                    </h1>

                    <p
                        className={`mt-3 max-w-2xl text-sm leading-6 ${
                            darkMode
                                ? "text-slate-400"
                                : "text-slate-500"
                        }`}
                    >
                        Review employment opportunities and manage
                        offers received from verified organisations.
                    </p>

                </div>


                {/* ================= OFFER COUNT ================= */}

                <div
                    className={`mb-6 inline-flex items-center gap-3 rounded-2xl border px-5 py-3 ${
                        darkMode
                            ? "border-white/10 bg-white/[0.04]"
                            : "border-slate-200 bg-white shadow-sm"
                    }`}
                >

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                        ✉
                    </div>

                    <div>

                        <p className="text-xs text-slate-500">
                            Total Offers
                        </p>

                        <p className="text-lg font-bold">
                            {offers.length}
                        </p>

                    </div>

                </div>


                {/* ================= EMPTY STATE ================= */}

                {offers.length === 0 ? (

                    <div
                        className={`rounded-3xl border p-12 text-center backdrop-blur-xl ${
                            darkMode
                                ? "border-white/10 bg-white/[0.04]"
                                : "border-slate-200 bg-white/85 shadow-sm"
                        }`}
                    >

                        <div
                            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-2xl ${
                                darkMode
                                    ? "bg-violet-500/10"
                                    : "bg-violet-50"
                            }`}
                        >
                            ✉
                        </div>

                        <h2 className="mt-5 text-xl font-bold">
                            No Offers Found
                        </h2>

                        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                            Employment offers from organisations will
                            appear here when you receive them.
                        </p>

                    </div>

                ) : (

                    /* ================= OFFERS ================= */

                    <div className="grid gap-6 md:grid-cols-2">

                        {offers.map((offer) => (

                            <div
                                key={offer._id}
                                className={`rounded-3xl border p-6 backdrop-blur-xl transition-all duration-300 ${
                                    darkMode
                                        ? "border-white/10 bg-white/[0.045] shadow-xl shadow-black/20 hover:-translate-y-1 hover:border-violet-500/20"
                                        : "border-slate-200 bg-white/85 shadow-sm hover:-translate-y-1 hover:shadow-lg"
                                }`}
                            >

                                {/* ================= OFFER HEADER ================= */}

                                <div className="flex items-start justify-between gap-4">

                                    <div
                                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                                            darkMode
                                                ? "bg-violet-500/10 text-violet-400"
                                                : "bg-violet-50 text-violet-600"
                                        }`}
                                    >
                                        💼
                                    </div>


                                    <span
                                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                            offer.status === "Offered"
                                                ? darkMode
                                                    ? "bg-blue-500/10 text-blue-400"
                                                    : "bg-blue-50 text-blue-600"
                                                : offer.status === "Accepted"
                                                    ? darkMode
                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                        : "bg-emerald-50 text-emerald-600"
                                                    : darkMode
                                                        ? "bg-red-500/10 text-red-400"
                                                        : "bg-red-50 text-red-600"
                                        }`}
                                    >
                                        {offer.status}
                                    </span>

                                </div>


                                {/* ================= JOB ================= */}

                                <h2 className="mt-6 text-xl font-bold">
                                    {offer.job?.title}
                                </h2>

                                <p
                                    className={`mt-3 text-sm leading-6 ${
                                        darkMode
                                            ? "text-slate-400"
                                            : "text-slate-500"
                                    }`}
                                >
                                    {offer.job?.description}
                                </p>


                                {/* ================= STATUS ================= */}

                                <div
                                    className={`mt-6 rounded-2xl border p-4 ${
                                        darkMode
                                            ? "border-white/10 bg-black/10"
                                            : "border-slate-100 bg-slate-50"
                                    }`}
                                >

                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Offer Status
                                    </p>

                                    <p
                                        className={`mt-2 font-semibold ${
                                            offer.status === "Offered"
                                                ? "text-blue-500"
                                                : offer.status === "Accepted"
                                                    ? "text-emerald-500"
                                                    : "text-red-500"
                                        }`}
                                    >
                                        {offer.status}
                                    </p>

                                </div>

                                {/* STATUS MESSAGE */}
                                {statusMessage.id === offer.offerId && statusMessage.text && (
                                    <div
                                        className={`mt-4 rounded-xl p-3 text-xs font-medium ${
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


                                {/* ================= ACTIONS ================= */}

                                {offer.status === "Offered" && (

                                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">

                                        <button
                                            disabled={processingId === offer.offerId}
                                            onClick={() =>
                                                handleAccept(offer)
                                            }
                                            className={`flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${
                                                processingId === offer.offerId ? "cursor-not-allowed opacity-60" : ""
                                            }`}
                                        >
                                            {processingId === offer.offerId ? "Accepting..." : "✓ Accept Offer"}
                                        </button>


                                        <button
                                            disabled={processingId === offer.offerId}
                                            onClick={() =>
                                                handleReject(
                                                    offer.offerId
                                                )
                                            }
                                            className={`flex-1 rounded-xl border py-3 font-semibold transition-all duration-300 ${
                                                darkMode
                                                    ? "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10"
                                                    : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                            } ${processingId === offer.offerId ? "cursor-not-allowed opacity-60" : ""}`}
                                        >
                                            Reject Offer
                                        </button>

                                    </div>

                                )}


                                {/* ================= ACCEPTED ================= */}

                                {offer.status === "Accepted" && (

                                    <div
                                        className={`mt-6 rounded-xl px-4 py-3 text-center text-sm font-medium ${
                                            darkMode
                                                ? "bg-emerald-500/10 text-emerald-400"
                                                : "bg-emerald-50 text-emerald-600"
                                        }`}
                                    >
                                        ✓ Employment offer accepted
                                    </div>

                                )}


                                {/* ================= REJECTED ================= */}

                                {offer.status !== "Offered" &&
                                    offer.status !== "Accepted" && (

                                        <div
                                            className={`mt-6 rounded-xl px-4 py-3 text-center text-sm font-medium ${
                                                darkMode
                                                    ? "bg-red-500/10 text-red-400"
                                                    : "bg-red-50 text-red-600"
                                            }`}
                                        >
                                            Offer rejected
                                        </div>

                                    )}

                            </div>

                        ))}

                    </div>

                )}

            </div>

        </div>

    );
}

export default StudentOffers;