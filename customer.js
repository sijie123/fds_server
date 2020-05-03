const express = require('express');
const { check, body, cookie } = require('express-validator');
const customer = express.Router();
const { validate, db, generateToken, authenticateToken, authenticateUserPass } = require('./common.js');

customer.post('/test', function (req, res) {
  res.success({test: "hi"});
})
// New User
customer.post('/new', [
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
    await t.none("INSERT INTO customers VALUES($1);", [req.body.username]);
  }).then(() => res.success({username: req.body.username}))
    .catch(err => res.failure(`Failed to create user. ${err}`))
})


// User login
customer.post('/login', [
  body('username')
    .exists(),
  body('password')
    .exists()
], validate, async function(req, res) {
  authenticateUserPass(req.body.username, req.body.password, 'customers')
    .then(() => generateToken())
    .then(async (token) => {
      return db.none("UPDATE users SET token = $1 WHERE username = $2", [token, req.body.username])
        .then(() => token) // Passes token to next step
    })
    .then((token) => res.cookie('authToken', token).success({username: req.body.username}))
    .catch(err => res.failure(`${err}`, 401))
})

customer.post('/testlogin', [
  body('username')
    .exists(),
  body('password')
    .exists()
], validate, async function(req, res) {
  authenticateUserPass(req.body.username, req.body.password, 'customers')
    .then(() => generateToken())
    .then(async (token) => {
      const result = await db.tx(async t => {
          await t.none("UPDATE users SET token = $1 WHERE username = $2", [token, req.body.username]);
          return t.query("SELECT rewardPoints, cardNumber FROM customers WHERE username = $1", [req.body.username]);
        });
      return [result, token]
    })
    .then((data) => res.cookie('authToken', data[1], {domain: '54.169.81.205'}).success({
      username: req.body.username,
      rewardpoints: data[0][0].rewardpoints,
      cardnumber: data[0][0].cardnumber
    }))
    .catch(err => res.failure(`${err}`, 401))
})

customer.post('/testcard', [
  body('username')
    .exists(),
  body('cardnumber')
    .exists()
], validate, async function(req, res) {
  return db.none("UPDATE customers SET cardnumber = $1 WHERE username = $2", [req.body.cardnumber, req.body.username])
    .then(() => res.success({cardnumber: req.body.cardnumber}))
    .catch(err => res.failure(`Failed to set card number. ${err}`))
})

customer.post('/:cname/stats', [
  cookie('authToken').exists().custom(token => {
    return authenticateToken(token, 'customers')
    .catch(err => {
        return authenticateToken(token, 'managers')
    })
  }),
], validate, function(req, res) {
  return db.query("SELECT * FROM singleCustomerOrdersStatsMonthly($1)", [req.params.cname])
    .then(result => res.send(result))
    .catch(err => res.failure(`${err}`))
})

module.exports = customer;
