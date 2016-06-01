var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');
var SaltFactor = 10;
var MaxLoginAttempts= 5;
var LockTime= 2 * 60 * 60 * 1000;
var password_length = 8;

var UserSchema = new Schema({
	email: {
		type: String,
		required: true,
		unique: true,
		set: function (value) {return value.trim();},
		validate: [
			function (email) {
				return (email.match(/\w+@\w+\.\w+/) !== null);
			},
			'Invalid email']
	},
    password: {
		type: String,
		required: true,
		validate: [
			function (password) {
				return password.length >= password_length;
			},
			'password must be at least' + password_length + 'characters long']
    },
    status: {
		type: String,
		default: 'online'
    },
    connection: {
		type: String,
		default: this.username
    },
    contacts: {
		type: Schema.Types.Mixed,
		default: {}
    },
    requests: {
		type: Schema.Types.Mixed,
		default: {}
    },
    loginAttempts: {
		type: Number
    },
    lockUntil: {
		type: Number
    }
});

UserSchema.virtual('isLocked').get(function () {
	return !!(this.lockUntil && this.lockUntil > Date.now());
});

UserSchema.pre('save', function (next) {
	var user = this;

	if(!user.isModified('password')){
		return next();
	}
	bcrypt.genSalt(SaltFactor, function (err, salt) {
		if(err){
			return next(err);
		}

		bcrypt.hash(user.password, salt, function (err, hash) {

			if(err) {
				return next(err);
			}

			user.password = hash;
			next();

		});

	});

});


UserSchema.methods.comparePassword = function (pass, callback) {
	bcrypt.compare(pass, this.password, function (err, isMatch) {
		if (err) {
			return callback(err);
		}
		callback(null, isMatch);
	});
};

UserSchema.methods.incLoginAttempts = function (callback) {
	if (this.lockUntil && this.lockUntil < Date.now() ){
		return this.update({
			$set: {loginAttempts: 1},
			$unset: {lockUntil: 1}
		}, callback);
	}
	var updates = { $inc: {loginAttempts: 1}};

	if(this.loginAttempts + 1 >=MaxLoginAttempts && !this.isLocked){
		updates.$set = { lockUntil: Date.now() + LockTime};
	}
	return this.update(updates, callback);
};

var reasons = UserSchema.statics.failedLogin = {
    NOT_FOUND: 1,
    PASSWORD_INCORRECT: 1,
    MAX_ATTEMPTS: 2
};

UserSchema.statics.getAuthenticated = function (username, password, callback) {
	this.findOne({email: username}, function (err, user) {
		if(err) {
			return callback(err);
		}
		if(!user){
			return callback(null, null, reasons.NOT_FOUND);
		}

		if(user.isLocked){
			return user.incLoginAttempts(function (err) {
				if (err) {
					return callback(err);
				}
				return callback(null, null, reasons.MAX_ATTEMPTS);
			});
		}

		user.comparePassword(password, function (err, isMatch) {
			if (err) {
				return callback(err);
			}

			if(isMatch) {
				if(!user.loginAttempts && !user.lockUntil) {
					return callback(null, user);
				}

				var updates = {
					$set: {loginAttempts: 0},
					$unset: {lockUntil: 1}
				};
				return user.update(updates, function (err) {
					if (err) {
						return callback(err);
					}
					return callback(null, user);
				});
			}

			user.incLoginAttempts(function (err) {
				if(err) {
					return callback(err);
				}
				return callback(null, null, reasons.PASSWORD_INCORRECT);
			});

		});

	});
};

module.exports = mongoose.model('User', UserSchema);