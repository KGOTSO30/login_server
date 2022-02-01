const express = require('express');
const router = express.Router();

const User = require('./../models/User');
const UserVerification = require('./../models/UserVerification');

//email handler
const nodemailer = require("nodemailer");


//unique string

const {v4: uuidv4} = require("uuid");

// env variables

require("dotenv").config();

//password handler
const bcrypt = require('bcrypt');

//nodemailer stuff
let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS
    }
})

// testing success
transporter.verify((error, success) => {
    if(error){
        console.log(error);
    } else {
        console.log("Ready for messages");
        console.log(success);
    }
})

// Signup
router.post('/signup', (req, res) => {
    let { FirstName, LastName, Mobile, email, password, createdAt} = req.body;
        FirstName:FirstName.trim();
        LastName: LastName.trim();
        Mobile: Mobile.trim();
        email: email.trim();
        password: password.trim();
        createdAt: createdAt.trim();
        

                // some form validations to be done!

                // check if user exists
                User.find({email}).then(result => {
                    if(result.length){
                        // user already exists
                        res.json({
                            status: "FAILED",
                            message: "User with this email already exists!"
                        })
                    }else{
                        // try to create new user

                        const saltRounds = 10;
                        bcrypt.hash(password, saltRounds).then(hashedPassword => {
                        const newUser = new User({
                            FirstName,
                            LastName,
                            Mobile,
                            email,
                            password: hashedPassword,
                            createdAt,
                            verified: false
                        });

                        newUser.save().then(result => {
                            // handle account verification
                            sendVerificationEmail(result, res);
                        })
                        .catch(err => {
                            res.json({
                                status: "FAILED",
                                message: "An error occurred while saving user account!"
                            })
                        })
                        

                        })
                        .catch(err => {
                            
                            res.json({
                                status: "FAILED",
                                message: "An error occurred while hashing the password!"
                            })
                        })
                    }

                    }).catch(err => {
                        console.log(err);
                        res.json({
                            status: "FAILED",
                            message: "An error occurred while checking for existing user!"
                        })
                    })
})    

 // send verification email
 
 const sendVerificationEmail = ({_id, email}, res) => {
    // url to be used in the email
    const currentUrl = "mongodb://localhost:27017/auth",

    var uniqueString = uuidv4() + _id;

    //mail optins
    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Verify Your Email",
        html:` <p>Verify your email address to complete the signup and login into your account.</p>
                <p>This link <b>expires in 6 hours</b>.</p><p>Press <a href=${currentUrl + "user/verify/"+ _id + "/" + uniqueString}>here</a>
                 to proceed.</p>`,
        
    };
    const saltRounds = 10;
    bcrypt
        .hash(uniqueString, saltRounds)
        .then((hashedUniqueString) => {
            // set values in userVerification collection
            const newVerification = new UserVerification({
                userId: _id,
                uniqueString: hashedUniqueString,
                createdAt: Date.now(),
                expiresAt: Date.now()+ 21600000,
            });
            newVerification
                .save()
                .then(() => {
                    transporter
                        .sendMail(mailOptions)
                        .then(() => {
                            //email sent and verification record saved
                            res.json({
                                status: "PENDING",
                                message: "Verification email sent!",
                        })

                        })
                        .catch((error) => {
                            console.log(error);
                            res.json({
                                status: "FAILED",
                                message: "Verification email failed!",
                        })
                })
                .catch((error) => {
                    console.log(error);
                    res.json({
                        status: "FAILED",
                        message: "Couldn't save verification email data!",
                    });
                })
        })
        .catch(() => {
            res.json({
                status: "FAILED",
                message: "An error occurred while hashing email data!",
                date: data,
            })
        })
 });


 }

// Signin
router.post('/signin', (req, res) => {
    let { email, password} = req.body;
    email: email.trim();
    password: password.trim();

    // some validations to be done
    User.find({email}).then(data => {
        if(data.length) {
            //User exists

            const hashedPassword = data[0].password;
            bcrypt.compare(password, hashedPassword).then(result => {
                if(result) {
                    // password match
                    res.json({
                        status: "SUCCESS",
                        message: "Signin successful!",
                        date: data,
                    })
                }else {
                    res.json({
                        status: "FAILED",
                        message: "Invalid password entered!"
                    })
                }
            })
            .catch(err => {
               
                res.json({
                    status: "FAILED",
                    message: "An error occurred while comparing passwords"
                })
            })
        }else {
            res.json({
                status: "FAILED",
                message: "Invalid Credentials entered!"
            })
        }
    })
    .catch(err => {
        
        res.json({
            status: "FAILED",
            message: "An error occurred while checking for existing user!"
        })
    })
})


module.exports = router;