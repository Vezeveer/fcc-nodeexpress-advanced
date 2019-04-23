'use strict';

const express     = require('express');
const bodyParser  = require('body-parser');
const fccTesting  = require('./freeCodeCamp/fcctesting.js');
const session     = require('express-session');
const mongo       = require('mongodb').MongoClient;

const passport    = require('passport');
const GitHubStrategy = require('passport-github').Strategy

const app = express();

const routes = require('./Routes.js')

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'pug')

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
}));


mongo.connect(process.env.DATABASE, {useNewUrlParser: true},(err, db) => {
    if(err) {
      console.log('Database error: ' + err);
    } else {
      console.log('Successful database connection');

      routes(app, db)
      
      app.route('/auth/github')
        .get(passport.authenticate('github'));

      app.route('/auth/github/callback')
        .get(passport.authenticate('github', { failureRedirect: '/' }), (req,res) => {
            res.redirect('/profile');
        });

      passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: 'https://fcc-nodeexpress-advanced.glitch.me/auth/github/callback' /*INSERT CALLBACK URL ENTERED INTO GITHUB HERE*/
      },
      function(accessToken, refreshToken, profile, cb) {
        console.log(profile);
        //Database logic here with callback containing our user object
        db.collection('socialusers').findAndModify(
          {id: profile.id},
          {},
          {$setOnInsert:{
              id: profile.id,
              name: profile.displayName || 'John Doe',
              photo: profile.photos[0].value || '',
              email: profile.emails[0].value || 'No public email',
              created_on: new Date(),
              provider: profile.provider || ''
          },$set:{
              last_login: new Date()
          },$inc:{
              login_count: 1
          }},
          {upsert:true, new: true},
          (err, doc) => {
              return cb(null, doc.value);
          }
        );
      }
));
      
}});