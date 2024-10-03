const nodemailer = require('nodemailer');
const Mailgen = require('mailgen');
require('dotenv').config();

// Configuration for G Suite Gmail
let nodeConfig = {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USERNAME,
        serviceClient: process.env.OAUTH_CLIENTID,
        privateKey: process.env.OAUTH_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
};

let transporter = nodemailer.createTransport(nodeConfig);

let MailGenerator = new Mailgen({
    theme: 'default',
    product: {
        name: 'Hoping Minds',
        link: 'https://hopingminds.com/',
    },
});

/** POST: http://localhost:8080/api/registerMail 
 * @param: {
    "username" : "example123",
    "userEmail" : "admin123",
    "text" : "",
    "subject" : "",
}
*/
const registerMail = async (req, res) => {
    const { username, userEmail, text, subject } = req.body;
    console.log(username, userEmail, subject);
    // body of the email
    var email = {
        body: {
            name: username,
            intro: text || "Welcome. We're very excited to have you on board.",
            outro: "Need help, or have questions? Just reply to this email, we'd love to help.",
        },
    };

    var emailBody = MailGenerator.generate(email);

    let message = {
        from: process.env.EMAIL_USERNAME,
        to: userEmail,
        subject: subject || 'Signup Successful',
        html: emailBody,
    };

    // send mail
    try {
        await transporter.sendMail(message);
        return res.status(200);
    } catch (error) {
        console.error(error);
        return res.status(500);
    }
};

// Export the registerMail function
module.exports = { registerMail };
