export const getCurrentUser = () => {

    const user = localStorage.getItem("user");

    if (!user)
        return null;

    return JSON.parse(user);
};

export const getToken = () => {

    return localStorage.getItem("token");

};

export const logout = () => {

    localStorage.removeItem("token");

    localStorage.removeItem("user");

};