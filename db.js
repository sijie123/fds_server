const pgp = require('pg-promise')();
const conn = require('./config.js').DB_CONNECTION;

// Creating a new database instance from the connection details:
const db = pgp(conn);

module.exports = db;
