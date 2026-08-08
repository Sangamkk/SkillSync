import {  useEffect,  useState } from "react";
import {  getOrganisationEmployees, terminateEmployment } from "../../services/employmentService";
import {terminateEmployment as terminateEmploymentOnChain} from "../../services/blockchainService";

function Employees() {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    const data = await getOrganisationEmployees();
    setEmployees(data);
  }

  async function handleTerminate(offerId) {
    try {
        // Blockchain
        await terminateEmploymentOnChain(offerId);
        // MongoDB / Backend
      await terminateEmployment(offerId);
    } catch (err) {
      console.error(err);
    }
}

  return (
    <div>
      <h1>Employees</h1>

      {employees.map((emp) => (
        <div key={emp._id}>
          <h3>
            {emp.student?.name}
          </h3>

          <p>
            {emp.student?.email}
          </p>

          <p>
            Job:
            {" "}
            {emp.job?.title}
          </p>

          <p>
            Status:
            {" "}
            {emp.status}
          </p>

          <button
          className="btn btn-danger"
            onClick={() =>
            handleTerminate(emp.offerId)}
        >
            Terminate
            </button>
        </div>
      ))}
    </div>
  );
}

export default Employees;