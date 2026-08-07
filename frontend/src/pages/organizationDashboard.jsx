import { useEffect, useState } from "react";

import { getIssuerRequests } from "../services/requestService";
import { getCertificateByHash } from "../services/certificateService";

const OrganisationRequests = () => {

    const [requests, setRequests] = useState([]);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        console.log("Loading Requests...");
        const blockchainRequests = await getIssuerRequests();
        console.log("Blockchain Requests:", blockchainRequests);
        const data = [];
        for (const request of blockchainRequests) {
            console.log("Request:", request);
            const certificate = await getCertificateByHash(request.credentialHash);
            console.log("Certificate:", certificate);
            console.log(certificate);
            console.log(certificate.certificateURL);
            data.push({
                request,
                certificate
            });
        }
        console.log("Final Data:", data);
        setRequests(data);
    };

    return (

        <div>
            {
                requests.map((item, index) => (
                    <div
                        key={index}
                        className="border p-5 mb-5 rounded"
                    >
                        <h2>
                            {item.certificate.certificateName}
                        </h2>
                        <p>
                            Issuer :
                            {item.certificate.issuer}
                        </p>
                        <p>
                            Type :
                            {item.certificate.certificateType}
                        </p>
                        <a
                            href={item.certificate.certificateURL}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline"
                        >
                            View Certificate
                        </a>
                    </div>
                ))
            }
        </div>
    );
};

export default OrganisationRequests;