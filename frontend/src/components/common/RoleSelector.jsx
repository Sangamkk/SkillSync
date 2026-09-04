import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const RoleSelector = ({ type = "register" }) => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const selectorRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                selectorRef.current &&
                !selectorRef.current.contains(event.target)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleRoleSelect = (role) => {
        setOpen(false);

        if (type === "register") {
            if (role === "applicant") {
                navigate("/register");
            } else if (role === "organisation") {
                navigate("/org/register");
            }
        }

        if (type === "login") {
            navigate("/login");
        }
    };

    return (
        <div
            ref={selectorRef}
            className="relative inline-block"
        >
            {/* Main Button */}
            <button
                onClick={() => setOpen(!open)}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30"
            >
                {type === "register" ? "Create Account" : "Login"}

                <span className="ml-2">
                    {open ? "▲" : "▼"}
                </span>
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">

                    {/* Applicant */}
                    <button
                        onClick={() => handleRoleSelect("applicant")}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-blue-50"
                    >
                        <span className="text-xl">
                            👨‍🎓
                        </span>

                        <div>
                            <p className="font-semibold text-gray-900">
                                Applicant
                            </p>

                            <p className="text-xs text-gray-500">
                                {type === "register"
                                    ? "Create an applicant account"
                                    : "Login as an applicant"}
                            </p>
                        </div>
                    </button>

                    {/* Organisation */}
                    <button
                        onClick={() => handleRoleSelect("organisation")}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-violet-50"
                    >
                        <span className="text-xl">
                            🏢
                        </span>

                        <div>
                            <p className="font-semibold text-gray-900">
                                Organisation
                            </p>

                            <p className="text-xs text-gray-500">
                                {type === "register"
                                    ? "Register your organisation"
                                    : "Login as an organisation"}
                            </p>
                        </div>
                    </button>

                </div>
            )}
        </div>
    );
};

export default RoleSelector;