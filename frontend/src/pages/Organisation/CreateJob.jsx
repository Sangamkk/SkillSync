import { useState } from "react";
import { createJob } from "../../services/employmentService";

function CreateJob() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requiredSkills: "",
    employmentType: "Internship",
    location: "",
    stipend: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await createJob({
        ...formData,
        requiredSkills: formData.requiredSkills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
      });

      alert("Job Created");

      setFormData({
        title: "",
        description: "",
        requiredSkills: "",
        employmentType: "Internship",
        location: "",
        stipend: "",
      });
    } catch (error) {
      console.error(error);
      alert("Failed to create job");
    }
  };

  return (
    <div>
      <h1>Create Job</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="title"
          placeholder="Job Title"
          value={formData.title}
          onChange={handleChange}
          required
        />

        <br />

        <textarea
          name="description"
          placeholder="Job Description"
          value={formData.description}
          onChange={handleChange}
          required
        />

        <br />

        <input
          type="text"
          name="requiredSkills"
          placeholder="React, Node.js, MongoDB"
          value={formData.requiredSkills}
          onChange={handleChange}
        />

        <br />

        <select
          name="employmentType"
          value={formData.employmentType}
          onChange={handleChange}
        >
          <option value="Internship">Internship</option>
          <option value="FullTime">Full Time</option>
          <option value="PartTime">Part Time</option>
        </select>

        <br />

        <input
          type="text"
          name="location"
          placeholder="Location"
          value={formData.location}
          onChange={handleChange}
        />

        <br />

        <input
          type="number"
          name="stipend"
          placeholder="Stipend"
          value={formData.stipend}
          onChange={handleChange}
        />

        <br />

        <button type="submit">
          Create Job
        </button>
      </form>
    </div>
  );
}

export default CreateJob;