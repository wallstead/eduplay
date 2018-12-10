var util = require('util');
var express = require('express');
var app = express();
var passport = require("passport");
var fs = require('fs');
var request = require('request');
const {
	Pool,
	Client
} = require('pg')
const bcrypt = require('bcrypt')
const uuidv4 = require('uuid/v4');
const LocalStrategy = require('passport-local').Strategy;

var currentAccountsData = [];

/* DB Connection info */
const pool = new Pool({
	user: process.env.PGUSER,
	host: process.env.PGHOST,
	database: process.env.PGDATABASE,
	password: process.env.PGPASSWORD,
	port: process.env.PGPORT,
	ssl: false // Change to true when deploying to heroku
});

/* Export Routes */
module.exports = function (app) {
	app.get('/', function (req, res, next) {
		res.render('index', {
			title: "Home",
			userData: req.user,
			messages: {
				danger: req.flash('danger'),
				warning: req.flash('warning'),
				success: req.flash('success')
			}
		});

		console.log(req.user);
	});

	app.get('/teacher-signup', function (req, res, next) {
		res.render('teacher-signup', {
			title: "Teacher Signup",
			userData: req.user,
			messages: {
				danger: req.flash('danger'),
				warning: req.flash('warning'),
				success: req.flash('success')
			}
		});
	});

	app.post('/teacher-signup', async function (req, res) {
		try {
			const client = await pool.connect()
			await client.query('BEGIN')
			var password = await bcrypt.hash(req.body.password, 5);
			await JSON.stringify(client.query('SELECT id FROM teachers WHERE email=$1', [req.body.username], (err, result) => {
				if (err) {
					console.log(err.stack)
				} else {
					if (result.rows[0]) {
						req.flash('warning', "This email address is already registered. <a href='/'>Log in!</a>");
						res.redirect('/join');
					} else {
						client.query('INSERT INTO teachers (id, firstname, lastname, email, password) VALUES ($1, $2, $3, $4, $5)', [uuidv4(), req.body.firstname, req.body.lastname, req.body.username, password], function (err, result) {
							if (err) {
								console.log(err);
							} else {

								client.query('COMMIT')
								console.log(result)
								req.flash('success', 'User created.')
								res.redirect('/');
								return;
							}
						});
					}
				}
			}));
			client.release();
		} catch (e) {
			throw (e)
		}
	});

	

	app.get('/account', function (req, res, next) {
		if (req.isAuthenticated()) {
			res.render('account', {
				title: "Account",
				userData: req.user,
				userData: req.user,
				messages: {
					danger: req.flash('danger'),
					warning: req.flash('warning'),
					success: req.flash('success')
				}
			});
		} else {
			res.redirect('/login');
		}
	});

	app.get('/login', function (req, res, next) {
		if (req.isAuthenticated()) {
			res.redirect('/account');
		} else {
			res.render('login', {
				title: "Log in",
				userData: req.user,
				messages: {
					danger: req.flash('danger'),
					warning: req.flash('warning'),
					success: req.flash('success')
				}
			});
		}
	});

	app.get('/logout', function (req, res) {
		console.log(req.isAuthenticated());
		req.logout();
		console.log(req.isAuthenticated());
		req.flash('success', "Logged out.");
		res.redirect('/');
	});

	app.post('/login', passport.authenticate('local', {
		successRedirect: '/account',
		failureRedirect: '/login',
		failureFlash: true
	}), function (req, res) {
		if (req.body.remember) {
			req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // Cookie expires after 30 days
		} else {
			req.session.cookie.expires = false; // Cookie expires at end of session
		}
		res.redirect('/');
	});
}

passport.use('local', new LocalStrategy({
	passReqToCallback: true
}, (req, username, password, done) => {

	loginAttempt();
	async function loginAttempt() {

		const client = await pool.connect()
		try {
			await client.query('BEGIN')
			var currentAccountsData = await JSON.stringify(client.query('SELECT id, firstname, email, password FROM teachers WHERE email=$1', [username], function (err, result) {

				if (err) {
					return done(err)
				}
				if (result.rows[0] == null) {
					req.flash('danger', "Oops. Incorrect login details.");
					return done(null, false);
				} else {
					bcrypt.compare(password, result.rows[0].password, function (err, check) {
						if (err) {
							console.log('Error while checking password');
							return done();
						} else if (check) {
							return done(null, [{
								email: result.rows[0].email,
								firstname: result.rows[0].firstname
							}]);
						} else {
							req.flash('danger', "Oops. Incorrect login details.");
							return done(null, false);
						}
					});
				}
			}))
		} catch (e) {
			throw (e);
		}
	};
}))

passport.serializeUser(function (user, done) {
	done(null, user);
});

passport.deserializeUser(function (user, done) {
	done(null, user);
});