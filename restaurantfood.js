const express = require('express');
const { check, body, cookie } = require('express-validator');
const food = express.Router({mergeParams: true});
const { validate, db, generateToken, authenticateUserPass, authenticateToken } = require('./common.js');

// List all food sold by restaurant. Offset optional.
food.get('/', function (req, res) {
  //console.log(req);
  offset = req.query.offset || 0;
  console.log(req.params.rname);
  return db.query("SELECT F.name as fname, F.price, F.maxqty, F.currqty, array_agg(FC.category) as categories \
                   FROM food as F \
                   LEFT OUTER JOIN foodcategory as FC \
                   ON FC.restaurantname = F.restaurantname AND FC.foodname = F.name \
                   WHERE F.restaurantname = $1 \
                   GROUP BY (F.name, F.price, F.maxqty, F.currqty) \
                   LIMIT 30 OFFSET $2", [req.params.rname, offset])
    .then(result => res.success({food: result}))
    .catch(err => res.failure(`${err}`))
})

food.post('/new', [
  cookie('authToken')
    .exists(),
    //.custom(token => authenticateToken(token, 'staff')),
  body('fname')
    .exists(),
  body('price')
    .exists()
    .isFloat(),
  body('maxqty')
    .exists()
    .isInt(),
  body('categories')
    .customSanitizer(categories => {
      if (categories === undefined || categories.length == 0) return [];
      return categories;
    })
    .isArray() //Verify that it is an array... Not string or something.
], validate, async function (req, res) {
  db.tx(async t => {
    await t.none("INSERT INTO food(name, restaurantname, price, maxqty, currqty) VALUES($1, $2, $3, $4, $5)", [req.body.fname, req.params.rname, req.body.price, req.body.maxqty, 0])
    if (req.body.categories.length == 0) {
      return true;
    }
    let preparedString = "INSERT INTO foodcategory VALUES ";
    for (let i = 0; i < req.body.categories.length; i++) {
      preparedString += `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`;
    }
    let categories = req.body.categories.flatMap(category => [category, req.body.fname, req.params.rname]);
    await db.none(preparedString, categories);
  }).then(success => res.success({food: {rname: req.params.rname, fname: req.params.fname, price: req.params.price, maxqty: req.params.maxqty, currqty: 0, categories: req.body.categories}}))
    .catch(err => res.failure(`${err}`))
})

/*
restaurant.post('/:name/food', [
  cookie('authToken')
    .exists()
    .custom(token => authenticateToken(token, 'customers'))
], validate, function (req, res) {
  console.log(req.params.name);
  res.success({test: "Good"});
})

restaurant.post('/new', [
  cookie('authToken')
    .exists()
    .custom(token => authenticateToken(token, 'managers')),
  body('rname')
    .exists(),
  body('minOrder')
    .exists()
    .isInt(),
  body('location')
    .exists()
], validate, async function (req, res) {
  return db.query("INSERT INTO restaurants VALUES($1, $2, $3)", [req.body.rname, req.body.minOrder, req.body.location])
    .then(result => res.success({restaurants: {rname: req.body.rname, minOrder: req.body.minOrder, location: req.body.location}}))
    .catch(err => res.failure(`${err}`))
})

// User login
restaurant.post('/login', [
  body('username')
    .exists(),
  body('password')
    .exists()
], validate, async function(req, res) {
  return new Promise(async (resolve, reject) => {
    let res = await db.query("SELECT COUNT(*)::int FROM users INNER JOIN customers USING (username) WHERE username = $1 AND password = $2", [req.body.username, req.body.password]);
    if (res.rows[0].count == 0) reject("Invalid username/password, or user is not a customer.");
    let token = generateToken();
    res = await db.query("UPDATE users SET token = $1 WHERE username = $2", [token, req.body.username]);
    resolve(token);
  }).then((token) => res.success({username: req.body.username, token: token}))
    .catch(err => res.failure(`${err}`, 401));
})
*/
module.exports = food;

    