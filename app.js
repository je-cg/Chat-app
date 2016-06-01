// core and downloaded module
var express = require('express');
var session = require('express-session');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
// var mongoClient = require('mongodb').MongoClient;
var mongoose = require('mongoose');
var Mongostore = require('connect-mongo')(session);
var uuid = require('uuid');


// file modules
var routes = require('./routes/index');
// var users = require('./routes/users');

// getting db
var dbUrl = process.env.MONGOHQ_URL || 'mongodb://@localhost:27017/chatdb';
mongoose.connect(dbUrl, {safe: true});



var app = express();
var server= http.createServer(app);
//configure express session middleware
var sessionMiddleware= session({
    genid: function(req){
        return uuid();
    },
    secret: 'this needs to be a environment variable',
    resave: true,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 30,
        httpOnly: true
    },
    rolling: true,
    // resaver: true,
    store: new Mongostore({
        mongooseConnection: mongoose.connection,
        stringify: false,
        autoRemove: 'interval',
        autoRemoveInterval: 0
    })
});

var sio= require('./routes/sockets.js');
sio.initialize(server, sessionMiddleware);
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon());
app.use(logger('dev'));
app.use(sessionMiddleware);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(function (req, res, next){
    if(!!req.session && !!req.session.email){
        console.log("before touch",req.session);
        req.session.touch();
        console.log("after touch",req.session);
    }
    return next();
});
app.use('/', routes);

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

// module.exports = app;



app.set('port', process.env.PORT || 3000);

server.listen(app.get('port'), function () {
    console.log('express server listening on port ' + app.get('port'));
});

