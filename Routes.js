
const passport    = require('passport');
const LocalStrategy = require('passport-local')
const ObjectID    = require('mongodb').ObjectID;
const bcrypt = require('bcrypt')



module.exports = function(app, db){
  
  app.use(passport.initialize());
app.use(passport.session());
  
        passport.serializeUser((user, done) => {
          done(null, user._id);
        });

        passport.deserializeUser( (id, done) => {
            db.collection('users').findOne(
                {_id: new ObjectID(id)},
                (err, doc) => {
                    done(null, doc);
                }
            );
        });
      
        passport.use(new LocalStrategy(function(username, password, done){
          db.collection('users').findOne({username: username},(err,user)=>{
            console.log('User ' + username + ' tried to log in')
            if(err) {console.log('Error YOOO: ');return err}
            if(!user) return done(null, false)
            //if(password !== user.password) return done(null, false)
            
            if(!bcrypt.compareSync(password, user.password)) return done(null, false)
            return done(null, user)
          })
        }))

        function ensureAuthenticated(req,res,next) {
          if(req.isAuthenticated()){
            console.log('authenticated')
            return next()
          }
          console.log('not authenticate')
          res.redirect('/')
        }
  
       
      
      
        app.route('/register')
          .post((req, res, next) => {
              db.collection('users').findOne({ username: req.body.username }, function (err, user) {
                  
                  if(err) {
                      next(err);
                  } else if (user) {
                      res.redirect('/');
                  } else {
                    var hash = bcrypt.hashSync(req.body.password, 12)
                        db.collection('users').insertOne(
                          {username: req.body.username,
                           password: hash},
                          (err, doc) => {
                            console.log('creating')
                            if(err) {
                                console.log('creating error:', err)
                                res.redirect('/');
                            } else {
                                next(null, user);
                            }
                          }
                        )
                  }
              })},
            passport.authenticate('local', { failureRedirect: '/' }),
            (req, res, next) => {
                res.redirect('/profile');
            }
        );
      
      app.route('/logout')
          .get((req, res)=>{
            req.logout()
            res.redirect('/')
        })
      
      app.route('/login')
          .post(passport.authenticate('local', {failureRedirect: '/'}),(req, res) => {
          res.redirect('/profile')
        })
      
        app.route('/profile')
          .get(ensureAuthenticated, (req, res)=>{
            res.render(process.cwd() + '/views/pug/profile', {username: req.user.username})
        })

        app.route('/')
          .get((req, res) => {
            res.render(process.cwd() + '/views/pug/index', {
              title: 'Home Page',
              message: 'Please login',
              showLogin: true,
              showRegistration: true
            });
          });
      
        app.use((req, res, next)=>{
          res.status(404)
            .type('text')
            .send('Not Found')
        })

        app.listen(process.env.PORT || 3000, () => {
          console.log("Listening on port " + process.env.PORT);
        });  
}