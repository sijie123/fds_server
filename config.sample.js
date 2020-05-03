const DB_CONNECTION = 'postgres://postgres:postgres_pass@localhost:5432/group57_db'; // DB Connection URI in the form "postgres://db_user:db_pass@db_IP:db_port/db_name"
const SERVER_IP = "127.0.0.1"; // Public facing IP. Use 127.0.0.1 if hosting locally.
const FRONTEND_PORT = 3000; // 3000 is the default setting. Required to allow CORS requests.
const BACKEND_PORT = 3001; // 3001 is the default setting. Ensure that port is free!

module.exports = {
    DB_CONNECTION: DB_CONNECTION,
    SERVER_IP: SERVER_IP,
    FRONTEND_PORT: FRONTEND_PORT,
    BACKEND_PORT: BACKEND_PORT
};