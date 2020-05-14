const express = require('express');
const { check, body, cookie } = require('express-validator');
const food = express.Router({mergeParams: true});
const { validate, db, generateToken, authenticateUserPass, authenticateToken } = require('./common.js');

// List all food sold by restaurant. Offset optional.
food.get('/', function (req, res) {
  offset = req.query.offset || 0;
  console.log(req.params.rname);
  return db.query("WITH FoodAndCategories AS ( \
                     SELECT F.name, F.price, F.maxqty, F.currqty, F.restaurantname, array_agg(FC.category) as categories \
                     FROM food as F \
                     LEFT OUTER JOIN foodcategories as FC \
                     ON FC.restaurantname = F.restaurantname AND FC.foodname = F.name \
                     WHERE F.restaurantname = $1 AND F.currqty > 0 \
                     GROUP BY (F.name, F.price, F.maxqty, F.currqty, F.restaurantname) \
                     ) \
                   SELECT FAC.name as fname, FAC.price, FAC.maxqty, FAC.currqty, FAC.categories, AVG(FR.rating) as avgrating, COUNT(FR.rating) as countrating, array_remove(array_agg(FR.content), NULL) as reviews \
                   FROM FoodAndCategories as FAC \
                   LEFT OUTER JOIN foodreviews as FR \
                   ON FR.restaurantname = FAC.restaurantname AND FR.foodname = FAC.name \
                   GROUP BY (FAC.name, FAC.price, FAC.maxqty, FAC.currqty, FAC.categories) \
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
    await t.none("INSERT INTO food(name, restaurantname, price, maxqty, currqty) VALUES($1, $2, $3, $4, $5)", [req.body.fname, req.params.rname, req.body.price, req.body.maxqty, req.body.maxqty])
    if (req.body.categories.length == 0) {
      return true;
    }
    await t.none("INSERT INTO foodcategories(category, foodname, restaurantname) \
                  SELECT cat, $2, $3 \
                  FROM unnest($1) as cat", [req.body.categories, req.body.fname, req.params.rname]);
  }).then(success => res.success({food: {rname: req.params.rname, fname: req.body.fname, price: req.body.price, maxqty: req.body.maxqty, currqty: req.body.maxqty, categories: req.body.categories}}))
    .catch(err => res.failure(`${err}`))
})

module.exports = food;

    