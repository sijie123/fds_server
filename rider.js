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

// User login
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

rider.post('/:rname/stats', [
  cookie('authToken').exists().custom(token => {
    return authenticateToken(token, 'riders')
    .catch(err => {
        return authenticateToken(token, 'managers')
    })
  }),
], validate, function(req, res) {
  return db.query("SELECT * FROM singleRiderOrdersStatsMonthly($1)", [req.params.rname])
    .then(result => res.send(result))
    .catch(err => res.failure(`${err}`))
})
// rider.get('/location', [
//     cookie('authToken').exists()
// ], validate, function(req,res) {
//     db.one("SELECT riders.username, riders.latitude, riders.longitude from riders \
//             INNER JOIN users \
//             ON users.username = riders.username \
//             WHERE users.token = $1", [req.cookies.authToken]
//     ).then(result => res.success({rider: result}))
//     .catch(err => res.failure(`${err}`))
// })
// rider.post('/location', [
//     cookie('authToken').exists(),
//     body('latitude').exists().isNumeric(),
//     body('longitude').exists().isNumeric()
// ], validate, function(req, res) {
//     db.one("UPDATE riders \
//              SET latitude = $2, \
//                  longitude = $3 \
//              WHERE username IN ( \
//                  SELECT riders.username FROM riders \
//                  INNER JOIN users \
//                  ON users.username = riders.username \
//                  WHERE users.token = $1 \
//              ) RETURNING username, latitude, longitude", [req.cookies.authToken, req.body.latitude, req.body.longitude]
//     ).then(updatedRow => {res.success({rider: updatedRow})})
//      .catch(err => res.failure(`${err}`))
// })

// About page route.
rider.get('/about', function (req, res) {
  res.send('About this wiki');
})

module.exports = rider;
