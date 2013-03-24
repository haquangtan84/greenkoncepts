var express = require('express');
var fbm = require('./app/');
var nlogger = require("nlogger").logger(module);
var config = require("./app/config");

// Setup the Express.js server
app = express(); // app is a global variable

app.use(express.logger());
app.use(express.compress());
app.use(express.bodyParser());
app.use(express.cookieParser());


var oneYear = 365 * 86400000;
app.use(express.static(__dirname + '/public', { maxAge: oneYear }));



var actualPort = process.env.PORT || fbm.config.listening_port;
app.listen(actualPort);
console.log("Server is UP on " + actualPort);
console.log("NODE_ENV: " + process.env.NODE_ENV);

