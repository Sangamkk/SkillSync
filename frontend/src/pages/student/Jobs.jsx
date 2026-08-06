import { useEffect, useState } from "react";
import { getAllJobs, applyToJob } from "../../services/employmentService";

function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

async function fetchJobs() {
  try {
    const jobs = await getAllJobs();
    setJobs(jobs);
  } catch (err) {
    console.error(err);
  }finally {
    setLoading(false);
  }
}

async function handleApply(jobId) {
  try {
    await applyToJob(jobId);

    alert("Applied Successfully");
  } catch (err) {
    console.error(err);
  }
}

  if (loading) {
    return <h1>Loading...</h1>;
  }

  return (
    <div>
      <h1>Jobs</h1>

      {jobs.length === 0 ? (
        <p>No jobs available</p>
      ) : (
        jobs.map((job) => (
          <div
            key={job._id}
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              margin: "10px 0",
            }}
          >
            <h2>{job.title}</h2>

            <p>{job.description}</p>

            <p>
              <strong>Type:</strong>{" "}
              {job.employmentType}
            </p>

            <p>
              <strong>Skills:</strong>{" "}
              {job.requiredSkills?.join(", ")}
            </p>

            <button
              onClick={() =>
                handleApply(job._id)
              }
            >
              Apply
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default Jobs;