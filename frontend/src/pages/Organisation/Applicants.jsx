import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ethers } from "ethers";
import { createOffer } from "../../services/blockchainService";
import {
  getApplicants,
  createEmploymentOffer,
} from "../../services/employmentService";
import { EmploymentType } from "../../utils/enums";

function Applicants() {
  const { jobId } = useParams();

  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employmentType, setEmploymentType] = useState("");
  const [deadline, setDeadline] = useState("");

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

      const employmentHash = crypto.randomUUID();
      const employmentHashBytes = ethers.id(employmentHash);

      const deadlineTimestamp = Math.floor( new Date(deadline).getTime() / 1000 );

      //BlockChain
      const { txHash, offerId } =
        await createOffer(
          employmentHashBytes,
          EmploymentType[employmentType],
          application.student.walletAddress,
          deadlineTimestamp
        );

      //MongoDB
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
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="w-full border rounded-lg p-3"
              required
            >
              <option value="">
                Select Type
              </option>

              <option value="Internship">
                Internship
              </option>

              <option value="Employment">
                Employment
              </option>
            </select>

            <div>
              <label className="font-semibold">
                Application Deadline
              </label>

              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full border rounded-lg p-3"
                required
              />
            </div>

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