const express = require('express');
const { check, body, cookie } = require('express-validator');
const order = express.Router();
const { validate, db, generateToken, authenticateUserPass, authenticateToken } = require('./common.js');

// List all orders made by a specific customer.
order.get('/', [
    cookie('authToken')
    .exists()
    .custom(token => authenticateToken(token, 'customers')),
], validate, function (req, res) {
    return db.query("SELECT id, deliverylocation, totalcost, deliveryfee, paymentmethod, creation, departure, arrival, collection, delivery, customername, ridername, array_agg(array[FO.restaurantname, FO.foodname, FO.quantity::text]) \
                     FROM orders \
                     INNER JOIN foodorders AS FO ON orders.id = FO.orderid \
                     WHERE customername IN ( \
                        SELECT username \
                        FROM users \
                        INNER JOIN customers USING (username) \
                        WHERE token = $1 \
                    ) \
                     GROUP BY orders.id", [req.cookies.authToken])
        .then(result => res.success({orders: result}))
        .catch(err => res.failure(`${err}`));
})

// List specific order. Now it's backdoored, in future, for customer (who made the order), or manager only.
order.get('/:id', [
    cookie('authToken')
    .exists(),
    //.custom(token => authenticateToken(token, 'manager')), // manager or customer himself
], validate, function (req, res) {
  offset = req.query.offset || 0;
  return db.query("SELECT cname FROM categories")
    .then(result => res.success({categories: result}))
    .catch(err => res.failure(`${err}`))
})

order.post('/test', [
  body('deliverylocation').exists(),
  body('paymentmethod').exists().custom(value => value === "CASH" || value === "CARD"),
  body('foodorder').exists(),
  cookie('authToken').exists().custom(token => authenticateToken(token, 'customers')),
], function (req, res) {
  console.log(req.body.foodorder);
  db.query("SELECT key as f, value::int \
  FROM json_each_text($2) as orderitems \
  LEFT OUTER JOIN food as F \
  ON (orderitems.key = F.name AND $1 = F.restaurantname) ", [req.body.restaurantname, req.body.foodorder])
    .then(result => res.success({restaurants: result}))
    .catch(err => res.failure(`${err}`))
})


// Given queries as cname: ["orderA", "orderB", ...]
// Query the database for all restaurants that sell at least 1 food with these categories.
// If queries contain 1 item, a single string can be used.
// If omitted, will essentially return all restaurants (implementation in lines involving coalesce array length).
//id, deliverylocation, totalcost, deliveryfee, paymentmethod, creation, departure, arrival, collection, delivery, customername, ridername, array_agg(array
order.post('/', [
  body('deliverylocation').exists(),
  body('paymentmethod').exists().custom(value => value === "CASH" || value === "CARD"),
  body('foodorder').exists(),
  //body('promocode').exists(),
  cookie('authToken').exists().custom(token => authenticateToken(token, 'customers')),
], validate, function (req, res) {
  console.log(req.promocode);
  db.tx(async t => {
    let neworder = await t.one("INSERT INTO orders (deliverylocation, totalcost, deliveryfee, paymentmethod, creation, departure, arrival, collection, delivery, restaurantName, customername, ridername, promocode) \
                  SELECT $1, ( \
                    SELECT SUM(F.price * orderitems.value::int) \
                    FROM json_each_text($5) as orderitems \
                    LEFT OUTER JOIN food as F \
                    ON (orderitems.key = F.name AND $4 = F.restaurantname) \
                  ), 2.00, $2, NOW(), NULL, NULL, NULL, NULL, $4, ( \
                    SELECT username \
                    FROM users \
                    INNER JOIN customers USING (username) \
                    WHERE token = $3 \
                  ), ( \
                    SELECT * \
                    FROM findNearestAvailableRider($4, NOW()) \
                    LIMIT 1 \
                  ), $6\
                  RETURNING id", [req.body.deliverylocation, req.body.paymentmethod, req.cookies.authToken, req.body.restaurantname, req.body.foodorder, req.body.promocode])
    
    await t.none("INSERT INTO foodorders(orderid, restaurantname, foodname, quantity) \
                  SELECT $1, $2, orderitems.key, orderitems.value::int \
                  FROM json_each_text($3) as orderitems", [neworder["id"], req.body.restaurantname, req.body.foodorder]);
    // Apply the promotion code; will throw exceptions if promocode is invalid/expired/unusable etc.
    // Exception message will decribe problem if you want to use those
    // If promocode == '', then returns true and does nothing
    await t.one("SELECT applyPromotionCode( \
                    (SELECT promocode \
                    FROM Orders \
                    WHERE id = $1), $1);", [neworder["id"]]);
    // Deducts from both the customer's current reward point balance and order's total cost (post-promotion application)
    if (req.body.rewardpoints) {
      await t.one("SELECT useRewardPoints( ( \
                      SELECT username \
                      FROM users \
                      INNER JOIN customers USING (username) \
                      WHERE token = $1 \
                    ), $2);", [req.cookies.authToken, neworder["id"]]);
    }
    // Updates reward points for customer once all deductions performed
    await t.one("SELECT updateRewardPoints( ( \
                      SELECT username \
                      FROM users \
                      INNER JOIN customers USING (username) \
                      WHERE token = $1 \
                    ), $2);", [req.cookies.authToken, neworder["id"]]);
    return neworder["id"];
    }).then(result => res.success({orderid: result}))
      .catch(err => res.failure(`${err}`))
})

order.post('/review', [
  cookie('authToken').exists().custom(token => authenticateToken(token, 'customers')),
  body('orderid').exists(),
  body('deliveryrating').exists(),
  body('foodreview').isArray() //Verify that it is an array... Not string or something.
], validate, function(req, res) {
  db.tx(async t => {
    await t.none("INSERT INTO foodreviews(orderid, foodname, restaurantname, customername, rating, content) \
                  SELECT $1, orderitems.foodname, ( \
                    SELECT restaurantname FROM orders WHERE id = $1 \
                  ), ( \
                    SELECT username  FROM users INNER JOIN customers USING (username) WHERE token = $2 \
                  ), orderitems.rating, orderitems.content \
                  FROM json_to_recordset($3) as orderitems(foodname TEXT, rating INTEGER, content TEXT)", [req.body.orderid, req.cookies.authToken, JSON.stringify(req.body.foodreview)]);
    await t.none("INSERT INTO deliveryratings (orderid, ridername, customername, rating) \
                  SELECT $1, ( \
                    SELECT ridername FROM orders WHERE id = $1 \
                  ), ( \
                    SELECT username  FROM users INNER JOIN customers USING (username) WHERE token = $2 \
                  ), $3", [req.body.orderid, req.cookies.authToken, req.body.deliveryrating])
  }).then(success => res.success(req.body.orderid))
  .catch(error => {console.log(error); res.failure(`Failed to add review: ${error}`)});
})

module.exports = order;

    