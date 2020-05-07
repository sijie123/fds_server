const express = require('express');
const { check, body, cookie } = require('express-validator');
const rider = express.Router();
const { validate, db, generateToken, authenticateToken, authenticateUserPass } = require('./common.js');

// New Rider
rider.post('/new', [
  body('username')
    .exists()
    .custom(async (username) => {
      const res = await db.one('SELECT COUNT(*)::int FROM users WHERE username=$1', [username]);
      if (res.count !== 0) return Promise.reject('User already exists');
      return Promise.resolve();
    }),
  body('password')
    .exists()
], validate, async function (req, res) {
  db.tx(async t => {
    await t.none("INSERT INTO users VALUES ($1, $2);", [req.body.username, req.body.password]);
    await t.none("INSERT INTO riders VALUES($1, 0, 0);", [req.body.username]);
  }).then(() => res.success({username: req.body.username}))
    .catch(err => res.failure(`Failed to create user. ${err}`))
})

//User login
rider.post('/login', [
  body('username')
    .exists(),
  body('password')
    .exists()
], validate, async function(req, res) {
  authenticateUserPass(req.body.username, req.body.password, 'riders')
    .then(() => generateToken())
    .then(async (token) => {
      return db.none("UPDATE users SET token = $1 WHERE username = $2", [token, req.body.username])
        .then(() => token) // Passes token to next step
    })
    .then((token) => res.cookie('authToken', token).success({username: req.body.username}))
    .catch(err => res.failure(`${err}`, 401))
})

//User login
rider.post('/status', [
  cookie('authToken').exists().custom(token => authenticateToken(token, 'riders'))
], validate, async function(req, res) {
    return db.one("SELECT riderstatus FROM riderStatus( (SELECT username FROM users INNER JOIN riders USING (username) WHERE token = $1) )", [req.cookies.authToken])
    .then((riderstatus) => res.success({status: riderstatus}))
    .catch(err => res.failure(`${err}`, 401))
})

//User login
rider.post('/update', [
  cookie('authToken').exists().custom(token => authenticateToken(token, 'riders'))
], validate, async function(req, res) {
  db.tx(async t => {
    let nextStatus = await t.one("SELECT riderstatus FROM riderStatus( (SELECT username FROM users INNER JOIN riders USING (username) WHERE token = $1) )", [req.cookies.authToken])
    let capitalizeNextStatus = nextStatus["riderstatus"].charAt(0).toUpperCase() + nextStatus["riderstatus"].slice(1)
    let functionName = `rider${capitalizeNextStatus}`;
    let command = `SELECT * FROM ${functionName}((SELECT username FROM users INNER JOIN riders USING (username) WHERE token = $1))`;
    let update = await t.one(command, [req.cookies.authToken]);
    return update;
  }).then((update) => res.success(update))
    .catch(err => res.failure(`Failed to create user. ${err}`))
})

rider.post('/:rname/stats', [
  cookie('authToken').exists().custom(token => {
    return authenticateToken(token, 'riders')
    .catch(err => {
        return authenticateToken(token, 'managers')
    })
  }),
], validate, function(req, res) {
  return db.query("SELECT riderName, year, month, countOrders, sumInterval::text, avgInterval::text, countRating, sumRating, avgRating, salary FROM singleRiderOrdersStatsMonthly($1)", [req.params.rname])
    .then(result => {console.log(result); res.send(result)})
    .catch(err => {console.log(err); res.failure(`${err}`)})
})

module.exports = rider;
