const express = require('express');
const { check, body, cookie } = require('express-validator');
const restaurant = express.Router();
const { validate, db, generateToken, authenticateUserPass, authenticateToken } = require('./common.js');
const foodRouter = require('./restaurantfood.js');

restaurant.use('/:rname/food', foodRouter);

// List all restaurants. Offset optional.
restaurant.get('/', function (req, res) {
  offset = req.query.offset || 0;
  return db.query("SELECT name, location, minorder FROM restaurants LIMIT 30 OFFSET $1", [offset])
    .then(result => res.success({restaurants: result}))
    .catch(err => res.failure(`${err}`))
})

// Get details specific restaurant.
restaurant.get('/:rname', function (req, res) {
  return db.query("SELECT name, location, minorder FROM restaurants WHERE name = $1", [req.params.rname])
    .then(result => res.success({restaurants: result}))
    .catch(err => res.failure(`${err}`))
})

restaurant.post('/:rname/stats', [
  cookie('authToken').exists().custom(token => {
    return authenticateToken(token, 'staff')
    .catch(err => {
        return authenticateToken(token, 'managers')
    })
  }),
], validate, function(req, res) {
  return db.query("SELECT year, month, countOrders as ordercount, sumOrdersCost as revenue FROM singleRestaurantOrdersStatsMonthly($1)", [req.params.rname])
    .then(result => res.send(result))
    .catch(err => res.failure(`${err}`))
})

restaurant.post('/:rname/foodstats', [
  cookie('authToken').exists().custom(token => {
    return authenticateToken(token, 'staff')
    .catch(err => {
        return authenticateToken(token, 'managers')
    })
  }),
], validate, function(req, res) {
  return db.query("SELECT year, month, foodName, totalqty FROM singleRestaurantFoodOrdersStatsMonthly($1)", [req.params.rname])
    .then(result => res.send(result))
    .catch(err => res.failure(`${err}`))
})

restaurant.post('/:rname/promostats', [
  cookie('authToken').exists().custom(token => {
    return authenticateToken(token, 'staff')
    .catch(err => {
        return authenticateToken(token, 'managers')
    })
  }),
], validate, function(req, res) {
  return db.query("SELECT * FROM singleRestaurantPromotionsStats($1)", [req.params.rname])
    .then(result => res.send(result))
    .catch(err => res.failure(`${err}`))
})

restaurant.post('/new', [
  cookie('authToken')
    .exists(),
    //.custom(token => authenticateToken(token, 'managers')),
  body('name')
    .exists(),
  body('minorder')
    .exists()
    .isFloat(),
  body('location')
    .exists()
], validate, async function (req, res) {
  return db.query("INSERT INTO restaurants(name, location, minorder) VALUES($1, $2, $3)", [req.body.name, req.body.location, req.body.minorder])
    .then(result => res.success({restaurants: {rname: req.body.name, minOrder: req.body.minorder, location: req.body.location}}))
    .catch(err => res.failure(`${err}`))
})

module.exports = restaurant;

    