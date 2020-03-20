const { validationResult } = require('express-validator');
const pool = require('./db.js');
const UIDGenerator = require('uid-generator');
const uidgen = new UIDGenerator(); // Default is a 128-bit UID encoded in base58

const validate = async (req, res, next) => {
    let errors = await validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }
    next();
}

const authenticateUserPass = async (username, password, usertype = 'customer') => {
    let queryStatement = `SELECT COUNT(*)::int FROM users INNER JOIN ${usertype} USING (username) WHERE users.username = $1 AND users.password = $2`; //No problem with SQL injection. usertype supplied by us.
    let res = await pool.one(queryStatement, [username, password]);
    console.log(res);
    if (res.count === 0) return Promise.reject('Incorrect username/password.');
    return Promise.resolve();
}

const authenticateToken = async (token, usertype = 'customer') => {
    let queryStatement = `SELECT COUNT(*)::int FROM users INNER JOIN ${usertype} USING (username) WHERE users.token = $1`; //No problem with SQL injection. usertype supplied by us.
    let res = await pool.one(queryStatement, [token]);
    if (res.count === 0) return Promise.reject('Invalid token.');
    return Promise.resolve();
}

module.exports = {
    validate: validate,
    db: pool,
    generateToken: async () => uidgen.generate(),
    authenticateToken: authenticateToken,
    authenticateUserPass: authenticateUserPass
}