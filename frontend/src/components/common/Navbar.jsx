import { FaUserCircle } from "react-icons/fa";

const Navbar = () => {
  return (
    <nav className="h-16 bg-white shadow flex items-center justify-between px-8">

      <h1 className="text-2xl font-bold text-blue-600">
        SkillSync
      </h1>

      <div className="flex items-center gap-4">

        <span className="text-gray-600">
          Student
        </span>

        <FaUserCircle
          size={35}
          className="text-gray-600 cursor-pointer"
        />

      </div>

    </nav>
  );
};

export default Navbar;