//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const http=require('http');
const {generateMessage} = require('./util/message.js');
const {generateCode} = require('./util/code.js');
const socketIO=require('socket.io');
const {Users}=require('./util/users.js');
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const async = require("async");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
require('dotenv').config();
var flash = require('express-flash');

const app = express();

app.set('view engine', 'ejs');
let server=http.createServer(app);
let io=socketIO(server);
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(flash());



app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://SIRI:vankayalapati@livecode-vrgnr.mongodb.net/userDB", {useNewUrlParser: true,useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema ({
  name:String,
  username:String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  password: String,
    premium: { type: Number, default: 0 }
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});




let users= new Users();


app.get("/",function(req,res){
  if(req.isAuthenticated()){
    res.render("index",{islog: "true",name: req.user.name.split(" ")[0]});

  }else{
    res.render("index",{islog: "false",name: ""});

  }
});
app.get("/login", function(req, res){
  if(req.isAuthenticated())
  res.redirect("/");
  else
  res.render("login",{error:""});
});

app.get("/login/:name",function(req,res){

  res.render('404');
});

app.get("/register", function(req, res){
  if(req.isAuthenticated())
  res.redirect("/");
  else
  res.render("register",{error: ""});
});

app.get("/register/:name",function(req,res){
  res.render('404');
});

// forgot password
app.get('/forgot', function(req, res) {
  res.render('forgot',{msg: "",smsg:""});
});

app.get('/highlight', function(req, res) {
  res.render('highlight');
});

app.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {

      return res.render('forgot',{msg:'Password reset token is invalid or has expired.',smsg:"" });
    }
    res.render('reset', {token: req.params.token,msg:"",smsg:""});
  });
});
app.get('/premium',function(req,res){
  if(req.isAuthenticated())
  res.render("premium");
  else
  res.redirect('/login');
});

app.get('/docs',function(req,res){
  if(req.isAuthenticated())
  res.render("docs",{islog: "true",name: req.user.name.split(" ")[0]});
  else
  res.render("docs",{islog: "false",name: ""});
});

app.get('/privacy-policy',function(req,res){
  if(req.isAuthenticated())
  res.render("privacyPolicy",{islog: "true",name: req.user.name.split(" ")[0]});
  else
  res.render("privacyPolicy",{islog: "false",name: ""});
});

app.get("/:name",function(req,res){
var name=req.params.name;
if(name.trim()==null){
  res.redirect('/');
}else{
  if(req.isAuthenticated()){
    res.render("home",{islog: 'true',name: req.user.name.split(" ")[0]});

  }else{
    res.render("home",{islog: 'false',name: ""});

  }
}
});


app.post("/register", function(req, res){

  User.findOne({
      username: req.body.username.toLowerCase(),

    },function(err,founditems){
      if(founditems){
        res.render("register",{error: "User already exists, please login"});

      }else{
        User.register({username: req.body.username.toLowerCase(),name:req.body.name}, req.body.password, function(err, user){
          if (err) {
            res.render("register",{error: err});
          } else {
            passport.authenticate("local")(req, res, function(){
              res.redirect("/login");
            });
          }
        });
      }
    });




});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username.toLowerCase(),
    password: req.body.password
  });

  User.findOne({
      username: req.body.username.toLowerCase(),

    },function(err,founditems){
 if(err){
   res.render("login",{error: err});
 }else if(!founditems){
   res.render("login",{error: "Please register to continue"});

 }else{
   req.login(user, function(err){
     if (err) {
       res.render("login",{error:err});
     } else {
       passport.authenticate("local")(req, res, function(){

         res.redirect("/");
       });
     }
   });
 }

    });




});

app.post('/forgot', function(req, res, next) {
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        User.findOne({ username: req.body.username.toLowerCase() }, function(err, user) {
          if (!user) {

            return res.render('forgot',{msg: "No account with that email address exists.",smsg:""});
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'gmail',
          address: 'smtp.gmail.com',
          port: 25,
          secure: false,
          auth: {
            user: 'LiveCode05@gmail.com',
            pass: process.env.GMAILPW
          }
        });
        var mailOptions = {
          to: user.username,
          from: 'LiveCode05@gmail.com',
          subject: 'LiveCode Password Reset',
          text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'https://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
           res.render('forgot',{msg: "",smsg:"Mail sent successfully"});
          done(err, 'done');
        });
      }
    ], function(err) {
      if (err) return next(err);
      res.redirect('/forgot');
    });
  });

app.post('/reset/:token', function(req, res) {
async.waterfall([
  function(done) {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
      if (!user) {

        return res.render('forgot',{msg:"Password reset token is invalid or has expired.",smsg: ""});
      }
      User.findByUsername(user.username.toLowerCase()).then(function(sanitizedUser){
    if (sanitizedUser){
        sanitizedUser.setPassword(req.body.password1, function(){
            sanitizedUser.save();
            return res.render('reset',{msg:"",smsg: "Password changed successfully",token:""});
        });
    } else {
      return res.render('reset',{msg:"User doesn't exists",smsg: "",token:""});
    }
},function(err){
    console.error(err);
});

    });
  },
  function(user, done) {
    var smtpTransport = nodemailer.createTransport({
      service: 'gmail',
       port: 465,
      secure: false,
      auth: {
         type: "login",
        user: 'LiveCode05@gmail.com',
        pass: process.env.GMAILPW
      },tls: {
    rejectUnauthorized: false
  }
    });
    var mailOptions = {
      to: user.username,
      from: 'LiveCode05@gmail.com',
      subject: 'Your password has been changed',

      text: 'Hello,\n\n' +
        'This is a confirmation that the password for your account ' + user.username + ' has just been changed.\n'
    };

    smtpTransport.sendMail(mailOptions, function(err) {
      req.flash('success', 'Success! Your password has been changed.');
      done(err);
    });
  }
], function(err) {
  res.redirect('/index');
});
});


var map = {};

//do not touch, its an art
io.on('connection', function(socket){


    socket.on('join',(ob,callback)=>{
    if(ob!=null){
      socket.join(ob[1].toString());
      users.removeUser(socket.id);
      users.addUser(socket.id,'User',ob[1].toString());


      io.to(ob[1]).emit('updateUsersList',users.getUserList(ob[1].toString()));
      socket.emit('newMessage',generateMessage('ADMIN',"Welcome User"));

        let user=users.getUser(socket.id);
        if(map[user.room]!=undefined)
          io.to(user.room).emit('newCode',generateCode(map[user.room]));
        }else{
            io.to(user.room).emit('newCode',generateCode(""));
        }

  });


    socket.on('createCode',function(message){

      let user=users.getUser(socket.id);
      if(user){
        if(message.text!=undefined){
          map[user.room] = message.text;
        io.to(user.room).emit('newCode',generateCode(message.text));
        }
      }
    });


    socket.on('createMessage',function(message){
      let user=users.getUser(socket.id);
      if(user){
        io.in(user.room).emit('newMessage',generateMessage(message.from,message.text));
      }
    });



  socket.on('disconnect', function(reason){
    let user=users.removeUser(socket.id);
 if(user){
   io.to(user.room).emit('updateUsersList',users.getUserList(user.room));
 }
  });
});

app.use((req,res,next)=>{
  res.send("404");

});
server.listen(process.env.PORT||80,function(){
  console.log("server is started on port 80");
});
function fun1()
{
 alert("hii");
}
