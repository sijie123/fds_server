const express = require('express');
const { check, body, cookie } = require('express-validator');
const category = express.Router();
const { validate, db, generateToken, authenticateUserPass, authenticateToken } = require('./common.js');

// List all categories. Offset optional.
category.get('/', function (req, res) {
  offset = req.query.offset || 0;
  return db.query("SELECT cname FROM categories")
    .then(result => res.success({categories: result}))
    .catch(err => res.failure(`${err}`))
})

// Given queries as cname: ["categoryA", "categoryB", ...]
// Query the database for all restaurants that sell at least 1 food with these categories.
// If queries contain 1 item, a single string can be used.
// If omitted, will essentially return all restaurants (implementation in lines involving coalesce array length).
category.post('/', [
  body('cname')
    .toArray()
], function (req, res) {
  console.log(req.body.cname);
  return db.query("SELECT R.name, R.location, R.minorder, array_agg(DISTINCT(FC.category)) as categories \
                   FROM restaurants as R \
                   INNER JOIN food as F ON R.name = F.restaurantname \
                   INNER JOIN foodcategories as FC ON F.name = FC.foodname AND R.name = FC.restaurantname \
                   WHERE CASE \
                     WHEN COALESCE(array_length($1::VARCHAR[], 1), 0) > 0 \
                     THEN FC.category = ANY ($1) \
                     ELSE TRUE \
                   END \
                   GROUP BY R.name \
                   LIMIT 30 OFFSET $2", [req.body.cname, req.query.offset])
    .then(result => res.success({restaurants: result}))
    .catch(err => res.failure(`${err}`))
})

module.exports = category;

    