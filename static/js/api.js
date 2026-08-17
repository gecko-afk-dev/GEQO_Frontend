const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";
const backendURL = isLocal ? "http://localhost:8000" : "https://api.mygeqo.com";

export const api = axios.create({
  baseURL: `${backendURL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Send cookies with all requests
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      const path = window.location.pathname;
      if (path !== "/" && path !== "/index.html") {
        window.location.replace("/");
      } else {
        window.dispatchEvent(new Event("storage"));
      }
    } else if (error.response && error.response.status >= 500) {
      alert("A server error occurred. Our team has been notified.");
    } else if (!error.response) {
      alert("Network error. Please check your connection.");
    }
    return Promise.reject(error);
  },
);
