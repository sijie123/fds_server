const express = require('express');
const { check, body, cookie } = require('express-validator');
const manager = express.Router();
const { validate, db, generateToken, authenticateToken, authenticateUserPass } = require('./common.js');

manager.post('/new', [
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
      await t.none("INSERT INTO managers VALUES($1);", [req.body.username]);
    }).then(() => res.success({username: req.body.username}))
      .catch(err => res.failure(`Failed to create user. ${err}`))
})

// User login
manager.post('/login', [
    body('username')
      .exists(),
    body('password')
      .exists()
  ], validate, async function(req, res) {
    authenticateUserPass(req.body.username, req.body.password, 'managers')
      .then(() => generateToken())
      .then(async (token) => {
        return db.none("UPDATE users SET token = $1 WHERE username = $2", [token, req.body.username])
          .then(() => token) // Passes token to next step
      })
      .then((token) => res.cookie('authToken', token).success({username: req.body.username}))
      .catch(err => res.failure(`${err}`, 401))
  })

manager.post('/monthlycustomers', [
  cookie('authToken').exists().custom(token => authenticateToken(token, 'managers')),
], validate, function(req, res) {
  return db.query("SELECT * FROM newCustomersMonthlyCount()")
    .then(result => res.send(result))
    .catch(err => res.failure(`${err}`))
})

manager.post('/monthlyorder', [
  cookie('authToken').exists().custom(token => authenticateToken(token, 'managers')),
], validate, function(req, res) {
  return db.query("SELECT year, month, count as ordercount, sum as revenue FROM ordersStatsMonthly()")
    .then(result => res.send(result))
    .catch(err => res.failure(`${err}`))
})

manager.post('/monthlyorderbycustomer', [
  cookie('authToken').exists().custom(token => authenticateToken(token, 'managers')),
], validate, function(req, res) {
  return db.query("SELECT year, month, customerName, count as ordercount, sum as revenue FROM customersOrdersStatsMonthly()")
    .then(result => res.send(result))
    .catch(err => res.failure(`${err}`))
})

manager.post('/monthlyorderbyrider', [
  cookie('authToken').exists().custom(token => authenticateToken(token, 'managers')),
], validate, function(req, res) {
  return db.query("SELECT * FROM ridersOrdersStatsMonthly()")
    .then(result => res.send(result))
    .catch(err => res.failure(`${err}`))
})
module.exports = manager;
