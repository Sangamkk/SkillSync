import { useEffect } from "react";
import { useParams } from "react-router-dom";

import {
    extractCertificate
} from "../../services/mlServices";


const ExtractCertificate = () => {

    const { certificateId } = useParams();


    const handleExtraction = async () => {

        try {

            console.log(
                "Extracting certificate:",
                certificateId
            );

            const result =
                await extractCertificate(
                    certificateId
                );

            console.log(
                "Extraction result:",
                result
            );

        } catch (error) {

            console.error(
                "Extraction error:",
                error.response?.data ||
                error.message
            );

        }

    };


    return (

        <div className="min-h-screen bg-gray-100 p-8">

            <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow">

                <h1 className="text-3xl font-bold mb-6">
                    Certificate Extraction
                </h1>

                <button
                    onClick={handleExtraction}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg"
                >
                    Extract Certificate
                </button>

            </div>

        </div>

    );

};


export default ExtractCertificate;