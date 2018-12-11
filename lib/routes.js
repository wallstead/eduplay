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
						req.flash('warning', "That email address is already registered. Login Below.");
						res.redirect('/');
					} else {
						client.query('INSERT INTO teachers (id, firstname, lastname, email, password) VALUES ($1, $2, $3, $4, $5)', [uuidv4(), req.body.firstname, req.body.lastname, req.body.username, password], function (err, result) {
							if (err) {
								console.log(err);
							} else {

								client.query('COMMIT')
								console.log(result)
								req.flash('success', 'Account created successfully. Login Below.')
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

	app.get('/my-games', async function (req, res) {
		if (req.isAuthenticated()) {
			const client = await pool.connect()
			try {
				await client.query('BEGIN')
				var teachergames = await JSON.stringify(client.query('SELECT * FROM games WHERE teacherid=$1', [req.user[0].id], function (err, result) {

					if (err) {
						return done(err)
					} else {
						console.log(result)
						res.render('my-games', {
							title: "My Games",
							userData: req.user,
							games: result.rows,
							messages: {
								danger: req.flash('danger'),
								warning: req.flash('warning'),
								success: req.flash('success')
							}
						});
					}
				}))
			} catch (e) {
				throw (e);
			}

			
		} else {
			res.redirect('/');
		}
	});

	app.get('/create-game', function (req, res, next) {
		if (req.isAuthenticated()) {
			res.render('create-game', {
				title: "Create Game",
				userData: req.user,
				messages: {
					danger: req.flash('danger'),
					warning: req.flash('warning'),
					success: req.flash('success')
				}
			});
		} else {
			res.redirect('/');
		}
	});

	app.post('/create-game', async function (req, res) {
		if (req.isAuthenticated()) {
			var wordsJSONString = JSON.stringify(req.body.words);
			try {
				const client = await pool.connect()
				await client.query('BEGIN')
				await client.query('INSERT INTO games (id, teacherid, name, gametype, options) VALUES ($1, $2, $3, $4, $5)', [uuidv4(), req.user[0].id, req.body.name, req.body.gametype, wordsJSONString], function (err, result) {
					if (err) {
						console.log(err);
					} else {

						client.query('COMMIT')
						console.log(result)
						req.flash('success', 'Game created successfully! Now invite some students.')
						res.redirect('/my-games');
						return;
					}
				});
				client.release();
			} catch (e) {
				throw (e)
			}
		} else {
			res.redirect('/');
		}
	});

	// CREATE TABLE games (
	// 	id UUID NOT NULL,
	// 	teacherID UUID NOT NULL,
	// 	name VARCHAR(64),
	// 	gametype VARCHAR(64),
	// 	CONSTRAINT games_pkey PRIMARY KEY(id)
	// )
	// WITH (oids = false);
	

	app.get('/account', function (req, res, next) {
		if (req.isAuthenticated()) {

			console.log(req.user)

			res.render('account', {
				title: "Account",
				userData: req.user,
				messages: {
					danger: req.flash('danger'),
					warning: req.flash('warning'),
					success: req.flash('success')
				}
			});
		} else {
			res.redirect('/');
		}
	});

	app.get('/logout', function (req, res) {
		req.logout();
		req.flash('success', "Logged out.");
		res.redirect('/');
	});

	app.post('/login', passport.authenticate('local', {
		successRedirect: '/my-games',
		failureRedirect: '/',
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
			var currentAccountsData = await JSON.stringify(client.query('SELECT id, firstname, lastname, email, password FROM teachers WHERE email=$1', [username], function (err, result) {

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
								id: result.rows[0].id,
								email: result.rows[0].email,
								firstname: result.rows[0].firstname,
								lastname: result.rows[0].lastname
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