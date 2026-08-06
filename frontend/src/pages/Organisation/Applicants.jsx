import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ethers } from "ethers";
import { createOffer }
from "../../services/blockchainService";
import {
  getApplicants,
  createEmploymentOffer,
} from "../../services/employmentService";

function Applicants() {
  const { jobId } = useParams();

  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplicants();
  }, []);

  const fetchApplicants = async () => {
    try {
      const data = await getApplicants(jobId);
      setApplicants(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

const handleOffer = async (application) => {
  try {

    const employmentHash =
      crypto.randomUUID();
      const employmentHashBytes = ethers.id(employmentHash);
console.log(application);
console.log(application.student);
console.log(employmentHash);
console.log(employmentHashBytes);
    const {txHash,offerId}=
      await createOffer(
        employmentHashBytes,
        0, //hardcoded internship
        application.student.walletAddress,
        0
      );

await createEmploymentOffer(
  application._id,
  offerId,
  employmentHash,
  txHash
);

    alert("Offer Sent");

  } catch (err) {
    console.error(err);
  }
};

  return (
    <div>
      <h1>Applicants</h1>

      {applicants.length === 0 ? (
        <p>No applicants yet</p>
      ) : (
        applicants.map((application) => (
          <div
            key={application._id}
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              marginBottom: "15px",
            }}
          >
            <h2>
              {application.student?.name}
            </h2>

            <p>
              {application.student?.email}
            </p>

            <p>
              Wallet:
              {" "}
              {application.student?.walletAddress}
            </p>

            <p>
              Status:
              {" "}
              {application.status}
            </p>

            {application.status ===
              "Applied" && (
              <button
                onClick={() =>
                  handleOffer(
                    application
                  )
                }
              >
                Send Offer
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default Applicants;