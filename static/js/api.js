const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const backendURL = isLocal ? 'http://localhost:8000' : 'https://api.mygeqo.com';

export const api = axios.create({
    baseURL: `${backendURL}/api/v1`,
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(response => response, error => {
    if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
    } else if (error.response && error.response.status >= 500) {
        alert('A server error occurred. Our team has been notified.');
    } else if (!error.response) {
        alert('Network error. Please check your connection.');
    }
    return Promise.reject(error);
});
