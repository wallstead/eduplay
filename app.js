var express = require('express');
var flash = require('connect-flash');
var passport = require("passport");
var request = require('request');
var bodyParser = require('body-parser')
var expressSession = require('express-session');
var path = require('path');

/* Config */
require('dotenv').config();
const PORT = process.env.PORT || 5000

/* Setup Express App */
var app = express();
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({
    extended: true
}));
app.use(expressSession({
    secret: 'keyboard cat'
}));
app.use(passport.initialize()); // for authentication
app.use(passport.session());
app.use('/public', express.static(__dirname + '/public'));
app.use(flash()); // for warning & error notices
app.use(bodyParser());
app.set('view engine', 'pug');
app.set('view options', {
    layout: false
});

/* Setup Routes for App */
require('./lib/routes.js')(app);

/* Listen to the things 👂🏻 */
app.listen(PORT);
console.log('Node listening on port %s', PORT);