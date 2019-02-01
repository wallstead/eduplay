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

if (process.env.DATABASE_URL) { // if heroku is loading the app this var will exist, so use it to connect
	const client = new Client({
		connectionString: process.env.DATABASE_URL,
		ssl: true,
	});
}

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

/* For converting to and from slugs */
function slugify(text) {
	return text.toLowerCase()
		.replace(/\s+/g, '-') // Replace spaces with -
		.replace(/[^\w\-]+/g, '') // Remove all non-word chars
		.replace(/\-\-+/g, '-') // Replace multiple - with single -
		.replace(/^-+/, '') // Trim - from start of text
		.replace(/-+$/, ''); // Trim - from end of text
}

function titleize(slug) {
	var words = slug.split("-");
	return words.map(function (word) {
		return word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
	}).join(' ');
}

/* For generating game links */
function randomString() {
	var chars = "0123456789abcdefghiklmnopqrstuvwxyz";
	var string_length = 6;
	var randomstring = '';
	for (var i=0; i<string_length; i++) {
		var rnum = Math.floor(Math.random() * chars.length);
		randomstring += chars.substring(rnum,rnum+1);
	}
	return randomstring
}

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
						if (result.rows.length > 0) {
							for (var rowIndex in result.rows) {
								result.rows[rowIndex].slug = slugify(result.rows[rowIndex].name);
							}
						} else {
							console.log("none")
						}
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
				client.release();
			} catch (e) {
				throw (e);
			}
		} else {
			res.redirect('/');
		}
	});

	app.get('/my-games/:gameName', async function (req, res) {
		if (req.isAuthenticated()) {

			var gameName = titleize(req.params.gameName) // look for this game in database
			const client = await pool.connect()
			try {
				await client.query('BEGIN')
				var game = await JSON.stringify(client.query('SELECT name, gametype, options, games.id, code FROM games WHERE teacherid=$1 AND LOWER(name)=LOWER($2)', [req.user[0].id, gameName], function (err, result) {

					if (err) {
						return done(err)
					} else {
						console.log(result)
						res.render('game-detail', {
							title: result.rows[0].name,
							userData: req.user,
							gameData: result.rows[0],
							gameSlug: req.params.gameName,
							messages: {
								danger: req.flash('danger'),
								warning: req.flash('warning'),
								success: req.flash('success')
							}
						});
					}
				}))
				client.release();
			} catch (e) {
				throw (e);
			}
		} else {
			res.redirect('/');
		}
	});

	app.get('/my-games/:gameName/results', async function (req, res) {
		if (req.isAuthenticated()) {

			var gameName = titleize(req.params.gameName) // look for this game in database
			const client = await pool.connect()
			try {
				await client.query('BEGIN')
				var game = await JSON.stringify(client.query('SELECT name, gametype, options, games.id FROM games JOIN teacher_student_bridge ON games.teacherid = teacher_student_bridge.teacherid WHERE teacher_student_bridge.teacherid=$1 AND LOWER(name)=LOWER($2)', [req.user[0].id, gameName], function (err, result) {

					if (err) {
						return done(err)
					} else {
						var gameid = result.rows[0].id
						var gameData = result.rows[0]
						client.query('SELECT * FROM games_played WHERE gameid=$1', [gameid], function (err, result) {

							if (err) {
								return done(err)
							} else {

								gameResultsData = result.rows[0]
								console.log(result.rows[0])

								client.query('SELECT * FROM students WHERE id=$1', [gameResultsData.studentid], function (err, result) {

									if (err) {
										return done(err)
									} else {
		
										studentData = result.rows[0]
										console.log(result.rows[0])
										res.render('game-detail-results', {
											title: 'Results',
											userData: req.user,
											gameResultsData: gameResultsData,
											gameSlug: req.params.gameName,
											gameData: gameData,
											studentData: studentData,
											messages: {
												danger: req.flash('danger'),
												warning: req.flash('warning'),
												success: req.flash('success')
											}
										});
									}
								})
							}
						})
					}
				}))
				client.release();
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
				await client.query('INSERT INTO games (id, teacherid, name, gametype, options, code) VALUES ($1, $2, $3, $4, $5, $6)', [uuidv4(), req.user[0].id, req.body.name, req.body.gametype, wordsJSONString, randomString()], function (err, result) {
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

	app.post('/update-game', async function (req, res) {
		if (req.isAuthenticated()) {
			var wordsJSONString = JSON.stringify(req.body.words);
			try {
				const client = await pool.connect()
				await client.query('BEGIN')
				await client.query('UPDATE games SET options = $1 WHERE id = $2', [wordsJSONString, req.body.id], function (err, result) {
					if (err) {
						console.log(err);
					} else {

						client.query('COMMIT')
						console.log(result)
						req.flash('success', 'Game updated successfully!')
						res.redirect(req.get('referer')); // refresh page
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

	app.get('/play/:gameCode', async function (req, res, done) { // this is the student signup page
	
		const client = await pool.connect()
		try {
			await client.query('BEGIN')
			var game = await JSON.stringify(client.query('SELECT * FROM games WHERE code=$1', [req.params.gameCode], function (err, result) {

				if (err) {
					return done(err)
				} 
				if (result.rows[0] == null) {
					return done(null, false);
				} else {
					var teacherID = result.rows[0].teacherid

					// create a student in the database

					res.render('student-signup', {
						title: "Student Signup",
						teacherID: teacherID,
						messages: {
							danger: req.flash('danger'),
							warning: req.flash('warning'),
							success: req.flash('success')
						}
					});
				}
			}))
			client.release();
		} catch (e) {
			throw (e);
		}
	});

	app.post('/student-signup', async function (req, res) {
		try {
			const client = await pool.connect()
			await client.query('BEGIN')
			var password = await bcrypt.hash(req.body.password, 5);
			await JSON.stringify(client.query('SELECT id FROM students WHERE username=$1', [req.body.username], (err, result) => {
				if (err) {
					console.log(err.stack)
				} else {
					if (result.rows[0]) {
						req.flash('warning', "That username is already registered as a Student. Login Below.");
						res.redirect('/');
					} else {
						/* First: Add student to students table */
						var studentID = uuidv4()
						client.query('INSERT INTO students (id, firstname, lastname, username, password) VALUES ($1, $2, $3, $4, $5)', [studentID, req.body.firstname, req.body.lastname, req.body.username, password], function (err, result) {
							if (err) {
								console.log(err);
							} else {
								client.query('COMMIT')
								console.log(result)
								
								/* Then: Add student/teacher relationship to bridging table */
								client.query('INSERT INTO teacher_student_bridge (teacherid, studentid) VALUES ($1, $2)', [req.body.teacherid, studentID], function (err, result) {
									if (err) {
										console.log(err);
									} else {
										client.query('COMMIT')
										console.log(result)
										
										req.flash('success', 'Student account created successfully! Login Below.')
										res.redirect('/');
										return;
									}
								});
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
	// CREATE TABLE games (
	// 	id UUID NOT NULL,
	// 	teacherID UUID NOT NULL,
	// 	name VARCHAR(64),
	// 	gametype VARCHAR(64),
	// 	CONSTRAINT games_pkey PRIMARY KEY(id)
	// )
	// WITH (oids = false);

	app.post('/simulate-game-data', async function (req, res) {
		if (req.isAuthenticated()) {
			var resultsJSONString = '{"word1":{"timeswrong":3,"timescorrect":5},"word2":{"timeswrong":1,"timescorrect":7},"word3":{"timeswrong":0,"timescorrect":8},"word4":{"timeswrong":3,"timescorrect":5},"word5":{"timeswrong":6,"timescorrect":2}}';
			try {
				const client = await pool.connect()
				await client.query('BEGIN')
				console.log(req.body)
				await client.query('INSERT INTO games_played (id, studentid, gameid, results) VALUES ($1, $2, $3, $4)', [uuidv4(), req.user[0].id, req.body.gameid, resultsJSONString], function (err, result) {
					if (err) {
						console.log(err);
					} else {

						client.query('COMMIT')
						console.log(result)
						req.flash('success', 'Game Simulated!')
						res.redirect(req.get('referer')); // refresh page
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
		// if (req.body.remember) {
			req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // Cookie expires after 30 days
		// } else {
		// 	req.session.cookie.expires = false; // Cookie expires at end of session
		// }
		res.redirect('/');
	});

	app.post('/login-student', passport.authenticate('local-student', {
		successRedirect: '/games',
		failureRedirect: '/',
		failureFlash: true
	}), function (req, res) {
		// if (req.body.remember) {
			req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // Cookie expires after 30 days
		// } else {
			// req.session.cookie.expires = false; // Cookie expires at end of session
		// }
		res.redirect('/');
	});

	app.get('/games', async function (req, res) {
		if (req.isAuthenticated()) {
			const client = await pool.connect()
			try {
				await client.query('BEGIN')
				// get teachers for student
				var gamesForStudent = await JSON.stringify(client.query('SELECT name, gametype FROM games JOIN teacher_student_bridge ON games.teacherid = teacher_student_bridge.teacherid WHERE teacher_student_bridge.studentid=$1', [req.user[0].id], function (err, result) {

					if (err) {
						return done(err)
					} else {
						console.log(result)
						for (var rowIndex in result.rows) {
							result.rows[rowIndex].slug = slugify(result.rows[rowIndex].name);
						}
						res.render('games', {
							title: "Games",
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
				client.release();
			} catch (e) {
				throw (e);
			}
		} else {
			res.redirect('/');
		}
	});

	app.get('/games/:gameName', async function (req, res) {
		if (req.isAuthenticated()) {

			var gameName = titleize(req.params.gameName) // look for this game in database
			const client = await pool.connect()
			try {
				await client.query('BEGIN')
				var game = await JSON.stringify(client.query('SELECT name, gametype, options, games.id FROM games JOIN teacher_student_bridge ON games.teacherid = teacher_student_bridge.teacherid WHERE teacher_student_bridge.studentid=$1 AND LOWER(name)=LOWER($2)', [req.user[0].id, gameName], function (err, result) {

					if (err) {
						return done(err)
					} else {
						console.log(result)
						res.render('game-detail-student', {
							title: result.rows[0].name,
							userData: req.user,
							gameData: result.rows[0],
							gameSlug: req.params.gameName,
							messages: {
								danger: req.flash('danger'),
								warning: req.flash('warning'),
								success: req.flash('success')
							}
						});
					}
				}))
				client.release();
			} catch (e) {
				throw (e);
			}
		} else {
			res.redirect('/');
		}
	});

	app.get('/games/:gameName/results', async function (req, res) {
		if (req.isAuthenticated()) {

			var gameName = titleize(req.params.gameName) // look for this game in database
			const client = await pool.connect()
			try {
				await client.query('BEGIN')
				var game = await JSON.stringify(client.query('SELECT name, gametype, options, games.id FROM games JOIN teacher_student_bridge ON games.teacherid = teacher_student_bridge.teacherid WHERE teacher_student_bridge.studentid=$1 AND LOWER(name)=LOWER($2)', [req.user[0].id, gameName], function (err, result) {

					if (err) {
						return done(err)
					} else {
						// console.log(result)
						var gameid = result.rows[0].id
						var gameData = result.rows[0]
						// console.log(gameid)
						client.query('SELECT * FROM games_played WHERE studentid=$1 AND gameid=$2', [req.user[0].id, gameid], function (err, result) {

							if (err) {
								return done(err)
							} else {
								console.log(result.rows[0])
								res.render('game-detail-student-results', {
									title: 'Results',
									userData: req.user,
									gameResultsData: result.rows[0],
									gameSlug: req.params.gameName,
									gameData: gameData,
									messages: {
										danger: req.flash('danger'),
										warning: req.flash('warning'),
										success: req.flash('success')
									}
								});
							}
						})
					}
				}))
				client.release();
			} catch (e) {
				throw (e);
			}
		} else {
			res.redirect('/');
		}
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

passport.use('local-student', new LocalStrategy({
	passReqToCallback: true
}, (req, username, password, done) => {

	loginAttempt();
	async function loginAttempt() {

		const client = await pool.connect()
		try {
			await client.query('BEGIN')
			var currentAccountsData = await JSON.stringify(client.query('SELECT id, firstname, lastname, username, password FROM students WHERE username=$1', [username], function (err, result) {

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
								username: result.rows[0].username,
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