const pgp = require('pg-promise')();
const conn = 'postgres://fdsdbuser:2102fdsgroup57@localhost:5432/fds';

// Creating a new database instance from the connection details:
const db = pgp(conn);

// Exporting the database object for shared use:
module.exports = db;
// const { Pool, Client } = require('pg');
// const pool = new Pool({
//     user: 'fdsdbuser',
//     host: 'localhost',
//     database: 'fds',
//     password: '2102fdsgroup57',
//     // port: 3211,
// })
// pool.beginTransaction = () => {
//     return pool.connect()
//                .then(client => {
//                    client.commit = async () => {
//                        try {
//                            await client.query("COMMIT");
//                        } catch (e) {
//                            await client.query("ROLLBACK");
//                            throw e;
//                        } finally {
//                            client.release();
//                        }
//                    };
//                    client.rollback = async () => await client.query("ROLLBACK");
                   
//                    client.query("BEGIN");
//                    return client;
//                });
// }
// module.exports = pool;