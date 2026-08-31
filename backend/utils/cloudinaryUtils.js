export const getRawPublicId = (certificateURL) => {

    const url = new URL(certificateURL);

    const pathname = url.pathname;

    // Example pathname:
    // /ayklmpgx/raw/upload/v1787925647/SkillSync/Certificates/file.pdf

    const parts = pathname.split("/");

    // Find the "upload" part
    const uploadIndex = parts.indexOf("upload");

    if (uploadIndex === -1) {
        throw new Error("Invalid Cloudinary URL");
    }

    // Everything after upload/version is the public ID
    const publicIdParts = parts.slice(uploadIndex + 2);

    return publicIdParts.join("/");
};