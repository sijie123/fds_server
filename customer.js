const express = require('express');
const { check, body } = require('express-validator');
const customer = express.Router();
const { validate, db, generateToken, authenticateToken, authenticateUserPass } = require('./common.js');

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
    .isLength({ min: 5 })
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

// About page route.
customer.get('/about', function (req, res) {
  res.send('About this wiki');
})

module.exports = customer;
