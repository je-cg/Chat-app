var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var models = require('../models');

var authorize = function(req, res, next) {
	console.log('auth executed');
  if (req.session && req.session.email){
	return next();
  }
  else{
	res.status(401).send("not authorized");
    }
};

var isAjax= function (req, res, next){
	console.log('isAjax executed');
	if(req.xhr || req.headers.accept.indexOf('json') > -1){
		return next();
	}
	else {
		console.log('redirected');
		res.status(303).redirect('/');
	}
};

/* GET home page. */

router.get('/login', function (req, res) {
	res.status(303).redirect('/');
});
router.get('/dashboard', [isAjax, authorize], function (req, res) {
	console.log('dashboard executed');
	res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
	res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
	res.setHeader("Expires", "0"); // Proxies.
	res.status(200).render('materialdashboard');
			
});

router.post('/log', function (req, res) {
	if(!req.body.email || !req.body.password){
		return res.status(400).send('missing email or password');
	}
	mongoose.connection.db.collection("sessions", function (err, collection){
			collection.findOne({'session.email': req.body.email}, function (err, session) {
			// console.log("sessions is " + session);
			// console.log("error is " + err);
			// console.log(req.session.email);
			if(err) {
				return res.send(err.message);
			}
			if(!!session && !req.session.email){
				return res.status(403).send('user already logged in');
			}
			else {
				models.User.getAuthenticated(req.body.email, req.body.password, function (err, user, failed) {
					if(err){
						res.end();
						console.log(err.message);
						return;
					}
					if(failed){
						if(failed<2){
							return res.status(401).send('incorrect username or password');
						}
						else {
							return res.status(403).send('account locked due to max loging attempts exceeded');
						}
					}
					user.status= 'online';
					user.save();
					req.session.email= user.email;
					console.log('email added to session');
					res.status(202).end();
					return;
				});
			}
		});
	});
});



router.post('/reg', function (req, res) {
	// console.log(req.body.email);
	models.User.create({
		email: req.body.email,
		password: req.body.password
	}, function (err, user) {
		if(!err){
			user.status= 'online';
			user.save();
			req.session.email= user.email;
			console.log('email added to session');
			res.status(202).end();
			return;
		}
		else {
			console.log(err);
			return res.send(err.message);
		}
	});
});

router.post('/out', function (req, res) {
	// console.log('out function');
	models.User.findOne({email: req.session.email}, function (err, user) {
		if(!!err){
			return res.end();
		}
		if(!!user){
			// console.log('user found');
			user.status= "offline";
			user.save();
			req.session.destroy();
			mongoose.connection.db.collection('sessions', function (err, collection){
				collection.remove({email: user.email});
				console.log('session deleted');
			});
			return res.status(303).end();
		}
	});
});


module.exports = router;

/*
test users:
test@user.com
test-test
myuser@test.com
hellohello
newuser@test.com
newpassword
testuser@test.com
test-pass
jesus@test.com
12345678
*/