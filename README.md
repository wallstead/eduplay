# Eduplay README

## Things you should know the basics of
- Git (https://www.atlassian.com/git/tutorials/learn-git-with-bitbucket-cloud)
- Databases (https://www.youtube.com/watch?v=wR0jg0eQsZA)
- HTML/CSS/JS

## How to setup locally
1. [set up postgresql on your local machine](https://devcenter.heroku.com/articles/heroku-postgresql#local-setup)
2. [import database from heroku and set up](https://devcenter.heroku.com/articles/heroku-postgresql#local-setup)
3. Set up git (many tutorials online)
3. Clone git repo for project using `git clone https://github.com/wallstead/eduplay.git`
4. `cd` into root directory of project
5. run `npm run start`
6. *ALWAYS* `git pull master` before branching off to get newest code from upstream. 
7. Checkout a topic branch for whatever you're working on (give it a good description) `git checkout -b [put branch name here without brackets]`
8. *Make any changes you want*
9. Make sure the site is running as intended with changes locally
10. If you want to commit a change, do it with `git commit -m [put a message about the changes here]`
11. merge your topic branch into master with `git checkout master`, then `git merge [topic branch name]`, and push master with `git push origin master`.
11. This automatically starts the build on heroku. Log into heroku to see logs, see if builds succeed, set env vars, etc.
12. If build succeeds go to `https://myeduplay.herokuapp.com/` and see your changes. 

## If site goes down on push to master
1. Look at logs to see what the issue is, do testing locally
2. implement fix locally
3. push change to master
4. see if that fixed it
5. repeat 1-4 until fixed

## How do I put my database on heroku?
Don't. If you really need to, let me know and I'll run you through it, but there is almost no case in which this will need to happen.

## If you want to revert some code in git
Be careful, make sure you know what you are doing. Make sure you test any reverted code on your local thoroughly before pushing a commit upstream.

## What is a .pug file?
Basically it's HTML, in a different format that enables templating. Look at [documentation here](https://pugjs.org/api/getting-started.html).

## What is a .scss file?
Basically it is better CSS, it gets compiled into CSS when you save a change to a scss file if you're running the `npm run scss` script. 
