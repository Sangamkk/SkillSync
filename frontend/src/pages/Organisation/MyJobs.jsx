import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getMyJobs,
  deleteJob,
} from "../../services/employmentService";

function MyJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const data = await getMyJobs();
      setJobs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId) => {
    try {
      await deleteJob(jobId);

      setJobs((prev) =>
        prev.filter((job) => job._id !== jobId)
      );
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return <h2>Loading...</h2>;
  }

  return (
    <div>
      <h1>My Jobs</h1>

      {jobs.length === 0 ? (
        <p>No jobs posted yet</p>
      ) : (
        jobs.map((job) => (
          <div
            key={job._id}
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              marginBottom: "15px",
            }}
          >
            <h2>{job.title}</h2>

            <p>{job.description}</p>

            <p>
              <strong>Type:</strong>{" "}
              {job.employmentType}
            </p>

            <button
              onClick={() =>
                navigate(
                  `/organisation/jobs/${job._id}/applications`
                )
              }
            >
              View Applicants
            </button>

            <button
              onClick={() =>
                handleDelete(job._id)
              }
            >
              Remove Job
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default MyJobs;