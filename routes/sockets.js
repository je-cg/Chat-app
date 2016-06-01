var io = require('socket.io');
// var mongoose = require('mongoose');
var models = require('../models');

exports.initialize = function(server, sessions){
	io= io(server);
	io.use(function (socket, next){
		sessions(socket.request, socket.request.res, next);
	});
	io.use(function (socket, next){
		if(!!socket.request.session && socket.request.session.email){
			console.log("log socket request", socket.request.session);
			socket.request.session.touch();
			next();
		}
		else {
			next(new Error('not authorized'));
		}
	});

// socket.request.session.touch();
	io.on('connection', function (socket) {
		models.User.findOne({email: socket.request.session.email}, function (err, user) {
			if(!!err){
				console.log(err);
			}
			if(!!user){
				console.log("log joining msg", user.email);
				socket.join(user.email);
				
				for(var friend in user.contacts){
					console.log("io.nsps['/'].adapter.rooms."+friend, io.nsps['/'].adapter.rooms[user.contacts[friend].email]);
					if(!!user.contacts[friend].confirmed && io.nsps['/'].adapter.rooms[user.contacts[friend].email]){
						io.sockets.in(user.contacts[friend].email).emit('entered', {email: user.email});
						user.contacts[friend].status= 'online';
					}
					else{
						user.contacts[friend].status= 'offline';
					}
				}
				user.save(function(error){
								if(error){
									console.log('error saving when joining', error);
								}
							});
				socket.emit('joined', {contact: user.contacts, requests: user.requests, email: user.email});
				// socket.emit('readytojoin',{contact: user.contacts, requests: user.requests, email: user.email});
			}
		});
		console.log('connected');
		// console.log("log socket request", socket.request.session);
		
		// socket.on('joining', function (msg) {
		// 	console.log("log joining msg", msg);
		// 	socket.join(msg.email);
		// 	socket.emit('joined', {email: msg.email});
		// });

		socket.on('chat', function (msg) {
			for(var user in msg.participants){
				console.log("sending msg to", user);
				io.sockets.in(msg.participants[user]).emit('chat', msg);
			}
		});

		socket.on('joinconversation', function (info) {
			for(var user in info.participants){
				console.log("sending join to", info.participants[user]);
				io.sockets.in(info.participants[user]).emit('joinconversation', info);
			}
		});

		socket.on('leaveConv', function (Conv) {
			for(var user in Conv.participants){
				io.sockets.in(Conv.participants[user]).emit('leaveConv', Conv);
			}
		});

		socket.on('addfriend', function (contact) {
			models.User.findOne({email: contact.email}, function (err, user) {
				if(!!err){
					console.log(err);
				}
				if(!!user){
					if(!!user.contacts[contact.from.replace(".", "\uff0e")] && !user.contacts[contact.from.replace(".", "\uff0e")].confirmed){
						user.contacts[contact.from.replace(".", "\uff0e")].confirmed= true;
						user.markModified('contacts');
						user.save(function(error){
								if(error){
									console.log('error', error);
								}
							});
						models.User.findOne({email: contact.from}, function (err, me) {
								if(!!err){
									console.log(err);
								}
								if(!!me){
									// replace dot for unicode equivalent to be able to save in mongodb
									me.contacts[contact.email.replace('.','\uff0e')]= {
										email: contact.email,
										status: user.status,
										confirmed: true
									};
									console.log("contact", me.contacts);
									me.markModified('contacts');
									var reqstr= 'requests.'+(contact.email.replace('.','\uff0e'));
									me.set(reqstr, undefined);
									console.log('removing request', user.requests);
									// user.markModified('requests');
									user.save(function(error){
												if(error){
													console.log('error', error);
												}
											});
									socket.emit('confirmed', me.contacts[contact.email.replace('.','\uff0e')]);
								}
							});
						io.sockets.in(user.email).emit('entered', {email: contact.from});
					}
					else if(!!user.contacts[contact.from.replace(".", "\uff0e")] && user.contacts[contact.from.replace(".", "\uff0e")].confirmed){
						socket.emit('added', {
							email: user.email,
							status: user.status,
							confirmed: true
						});
					}
					else{
						user.requests[contact.from.replace(".", "\uff0e")] = contact.from;
						user.markModified('requests');
						user.save(function(error){
								if(error){
									console.log('error', error);
								}
							});
						if(user.status=='online'){
							io.sockets.in(contact.email).emit('request', contact.from);
							models.User.findOne({email: contact.from}, function (err, me) {
								if(!!err){
									console.log(err);
								}
								if(!!me){
									console.log('adding contact', contact.email);
									var contactsobj= me.contacts;
									// replace dot for unicode equivalent to be able to save in mongodb
									me.contacts[contact.email.replace('.','\uff0e')]= {
										email: contact.email,
										status: 'offline',
										confirmed: false
									};
									console.log("contact", me.contacts);
									me.markModified('contacts');
									me.save(function(error){
										if(error){
											console.log('error', error);
										}
									});
									socket.emit('added', me.contacts[contact.email.replace('.','\uff0e')]);
								}
							});
						}
					}
				}
				else {
					socket.emit('notfound');
				}
			});
		});

		socket.on('req', function (request) {
			models.User.findOne({email: request.from}, function (err, user) {
				if(!!err){
					console.log(err);
				}
				if(!!user){
					var reqstr= 'requests.'+(request.email.replace('.','\uff0e'));
					user.set(reqstr, undefined);
					console.log('removing request', user.requests);
					// user.markModified('requests');
					user.save(function(error){
								if(error){
									console.log('error', error);
								}
							});
					if(request.confirmed){
						models.User.findOne({email: request.email}, function (err, contact) {
							if(!!err){
								console.log(err);
							}
							if(!!contact){
								user.contacts[contact.email.replace('.','\uff0e')]={
									email: contact.email,
									status: contact.status,
									confirmed: true
								};
								user.markModified('contacts');
								user.save(function(error){
								if(error){
									console.log('error', error);
								}
							});
								contact.contacts[user.email.replace('.','\uff0e')].confirmed= true;
								contact.markModified('contacts');
								contact.save();
								console.log("line 146 check for room", io.nsps['/'].adapter.rooms[contact.email]);
								io.sockets.in(contact.email).emit('entered', {email: user.email});
								socket.emit('confirmed', user.contacts[contact.email.replace('.','\uff0e')]);
							}
						});
					}
				}
			});
		});

		socket.on('disconnect', function () {
			console.log('disconnected');
			models.User.findOne({email: socket.request.session.email}, function (err, user) {
				if(!!err){
					console.log(err);
				}
				if(!!user){
					for(var friend in user.contacts){
						if(!!user.contacts[friend].confirmed && io.nsps['/'].adapter.rooms[user.contacts[friend].email]){
							io.sockets.in(user.contacts[friend].email).emit('left', {email: user.email});
						}
					}
				}
			});
		});

		

	});
};

// io.sockets.in('room').emit('foot', 'bar')