const express = require('express')
const app = express()
const bodyParser = require('body-parser');
const port = 3001
var cookieParser = require('cookie-parser')

const customerRouter = require('./customer.js');
const restaurantRouter = require('./restaurant.js');
const categoryRouter = require('./category.js');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser())
app.use((req, res, next) => {
    res.success = (json) => {
        return res.status(200).json(Object.assign({status: 'OK'}, json));
    };
    res.failure = (msg, errorCode = 500) => {
        if (typeof msg === 'string')
            return res.status(errorCode).json({status: 'fail', errors: [{msg: msg}]});
        else //Assume JSON
            return res.status(errorCode).json(Object.assign({status: 'fail'}, msg));
    }
    next();
})
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "54.169.81.205:3000"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use('/customer', customerRouter);
app.use('/restaurant', restaurantRouter);
app.use('/category', categoryRouter);

app.get('/', (req, res) => res.send('Hello World!'))
//app.get('/user', (req, res) => res.send('No users here!'))

app.listen(port, () => console.log(`FDS Server listening on port ${port}!`))