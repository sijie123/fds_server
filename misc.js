const express = require('express');
const { check, body, cookie } = require('express-validator');
const misc = express.Router();
const { validate, db, generateToken, authenticateToken, authenticateUserPass } = require('./common.js');

misc.post('/locations', function (req, res) {
  return db.one("SELECT array_agg(name) as locations \
                   FROM locations")
    .then(result => res.success(result))
    .catch(err => res.failure(err));
})

misc.post('/promotions', function (req, res) {
    return db.query("SELECT * FROM getAvailablePromotions()")
      .then(result => res.success(result))
      .catch(err => res.failure(err));
  })

module.exports = misc;
