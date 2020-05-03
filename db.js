const pgp = require('pg-promise')();
const conn = 'postgres://fdsdbuser:2102fdsgroup57@localhost:5432/fds';

// Creating a new database instance from the connection details:
const db = pgp(conn);

module.exports = db;
