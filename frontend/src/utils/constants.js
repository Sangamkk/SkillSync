// Application-wide constants

export const ROLES = {
  STUDENT: "STUDENT",
  ORGANISATION: "ORGANISATION",
  ADMIN: "ADMIN",
};

export const CERT_TYPES = [
  "Course",
  "Internship",
  "Workshop",
  "Hackathon",
  "Competition",
  "Professional",
];

export const EMPLOYMENT_TYPES = ["Internship", "FullTime", "PartTime"];

export const VERIFICATION_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
};

export const CERT_VERIFICATION_STATUS = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  REVOKED: "Revoked",
};

export const PROJECT_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

export const BLOCKCHAIN_TX_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  CONFIRMED: "CONFIRMED",
  FAILED: "FAILED",
};
