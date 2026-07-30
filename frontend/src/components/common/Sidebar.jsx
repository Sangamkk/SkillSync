import {
  FaHome,
  FaProjectDiagram,
  FaCertificate,
  FaBriefcase,
  FaClipboardList
} from "react-icons/fa";

const Sidebar = () => {
  return (
    <div className="w-64 bg-white shadow min-h-screen">

      <div className="p-6">

        <ul className="space-y-5">

          <li className="flex items-center gap-3 cursor-pointer hover:text-blue-600">
            <FaHome />
            Dashboard
          </li>

          <li className="flex items-center gap-3 cursor-pointer hover:text-blue-600">
            <FaCertificate />
            Certificates
          </li>

          <li className="flex items-center gap-3 cursor-pointer hover:text-blue-600">
            <FaProjectDiagram />
            Projects
          </li>

          <li className="flex items-center gap-3 cursor-pointer hover:text-blue-600">
            <FaBriefcase />
            Employment
          </li>

          <li className="flex items-center gap-3 cursor-pointer hover:text-blue-600">
            <FaClipboardList />
            Requests
          </li>

        </ul>

      </div>

    </div>
  );
};

export default Sidebar;