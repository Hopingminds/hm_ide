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
        html: text,
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

async function generateEmailTemplate(candidateName, testTime, StartDateForMail, EndDateForMail, assessmentName, candidateToken) {
    return `
    <div style="background-color: #f5f5f5; font-family: 'poppins', sans-serif; width: 98%; margin: 0; padding: 0; color:#000;">
		<section style="background-color: #f5f5f5; display:block;">
			<img src="https://hoping-minds.s3.ap-south-1.amazonaws.com/course%2FAWS-TAJWAR%2F1729170510182-banner-17-10_upscayl_4x_realesrgan-x4plus%20(1).png" alt="photo" style="width: 100%; object-fit: cover;" />
			<div class="paragraph" style="padding: 10px 40px; font-size: 18px; font-weight: 400; line-height: 1.5;">
				<p>Dear ${candidateName},</p>
				<p style="margin-top: 20px">Greetings from Hoping minds!</p>
				<p style="margin-top: 20px">We are pleased to share that you have been Invited for the Online Assessment test <span class="highlight" style="color: #000; font-weight: 600;">(${assessmentName})</span>. This assessment is mandatory to advance in the hiring process, and the duration of the same will be <span class="highlight" style="color: #000; font-weight: 600;">${testTime} minutes</span>.</p>
				<p class="line" style="margin-top: 20px;">It is a proctored assessment, and hence we request you to complete the mandatory prerequisites well in advance to ensure a smooth assessment.</p>
			</div>
			<div class="paragraph-2" style="padding: 10px 40px; font-size: 18px; font-weight: 400; line-height: 1.5;">
				<h1>Mandatory pre-requisite:</h1>
				<ul class="ul" style="gap: 20px; padding-left: 20px;">
					<li style="margin-bottom: 10px;">Ensure webcam is functional and well connected. You will be monitored via webcam during the assessment.</li>
					<li style="margin-bottom: 10px;">Require stable internet connection with minimum 2 mbps speed.</li>
				</ul>
			</div>
		</section>
		<section class="container-2" style="padding: 20px 40px; background-color:rgb(174, 205, 222); color: rgb(64, 64, 133); font-size: 18px; font-weight: 400;">
			<div>
				<h1>Important Points</h1>
				<ul class="ul" style="gap: 20px; padding-left: 20px;">
					<li style="margin-bottom: 0;"><span class="highlight" style="color: #000; font-weight: 600;">3 Times Alert:</span> You will receive an alert if you leave the testing area or look away from the screen for an extended period. After three alerts, continued deviations may impact your assessment.</li>
					<li style="margin-bottom: 10px;"><span class="highlight" style="color: #000; font-weight: 600;">2-Person Alert:</span>  If the system detects the presence of a second person in the testing area, an alert will be issued.</li>
					<li style="margin-bottom: 10px;"><span class="highlight" style="color: #000; font-weight: 600;">Tab Change Alert:</span> Switching between tabs or windows during the test will trigger an alert.</li>
					<li style="margin-bottom: 10px;"><span class="highlight" style="color: #000; font-weight: 600;">New Window Alert:</span> Opening a new window while the test is active will result in an alert.</li>
					<li style="margin-bottom: 10px;"><span class="highlight" style="color: #000; font-weight: 600;">Block User Alert:</span> If you receive three alerts for leaving the testing area or looking away from the screen, you will be automatically blocked from further test access.</li>
					<li style="margin-bottom: 10px;">Use <span class="highlight" style="color: #000; font-weight: 600;">"Check System Compatibility"</span>link at the top to perform system readiness check and any required installation / configuration.</li>
					<li style="margin-bottom: 10px;">Take the assessment in a <span class="back" style="color:rgb(20, 24, 60); background-color: rgb(222, 237, 10); padding: 5px;">quiet, noise-free and well-lit</span> environment.</li>
					<li style="margin-bottom: 10px;">Hit "Start Test" link only at the specified test commencement time as it will be enabled only then.<span class="highlight">The assessment login window will remain opened only for ${testTime} minutes after the scheduled start time</span>. You will be able to login and start the assessments only withinthis timeline.</li>
					<li style="margin-bottom: 10px;">Assessment has more than 1 section, so <span class="highlight">do not click 'Finish Test' button until all the sections are completed</span>.</li>
					<li style="margin-bottom: 10px;"><span class="highlight" style="color: #000; font-weight: 600;">Only one attempt is available</span>. Ensure laptop battery is fully charged / desktop is powered throughout the assessment duration and you have uninterrupted internet connection.</li>
					<li class="highlight" style="color: #000; font-weight: 600;"><span class="back" style="color:rgb(20, 24, 60); background-color: rgb(222, 237, 10); padding: 5px;">Do not press F5 or refresh during the exam</span>- as it would auto-submit and end the assessment.</li>
					<li style="margin-bottom: 0;">In case of any disconnection due to power failure or internet issue, please restart your assessment immediately using the same invitationlink.</li>
				</ul>
			</div>
		</section>
		<section style="padding: 20px 40px; font-size: 18px; font-weight: 400;">
			<div>
				<h1>Do's</h1>
				<ul class="ul-do" style="gap: 20px; padding: 0; list-style-type: none;">
					<li style="margin-bottom: 10px;">✓&nbsp; &nbsp;Take the assessment in a quiet and well-lit space.</li>
					<li style="margin-bottom: 10px;">✓&nbsp; &nbsp;Adjust camera angle to make sure your face is clearly visible at all times. The background should be plain. Avoid photos and pictures as a backdrop.</li>
					<li style="margin-bottom: 0;">✓&nbsp; &nbsp;Complete the assessment in one sitting</li>
				</ul>
			</div>
		</section>
		<section>
			<div class="paragraph-6" style="padding: 20px 40px; font-size: 18px; font-weight: 400; line-height: 1.5;">
				<h1 style="color: rgb(46, 48, 130)">Zero Tolerance for Malpractice</h1>
				<ul class="ul-done" style="gap: 20px; padding-left: 20px;">
					<li style="margin-bottom: 10px;">The assessment platform uses AI mechanisms to track malpractice. Any candidate found to be using unfair means (like Telegram) will be disqualified from the hiring process, without notice.</li>
					<li style="margin-bottom: 10px;">Hoping Minds has a zero-tolerance policy for malpractice. A disqualification may be issued at any stage of the process, as and when malpractice is detected and is solely at the discretion of Hoping Minds.</li>
				</ul>
				<p style="margin-top: 50px; color: rgb(46, 48, 130)">We hope you have read all the important instructions mentioned above. We reiterate, kindly be seated in a noise-free environment and ensure you have a clear camera device. Please recheck everything to avoid any circumstances that will hamper your ability to take the test.<br /><br />Please click on the button given below to start the assessment.<br /> Assessment will only be available at <span class="highlight" style="color: rgb(46, 48, 130); font-weight: 600;">${StartDateForMail}</span> till <span style="color: rgb(46, 48, 130); font-weight: 600;">${EndDateForMail}</span></p>
				<button class="button" style="background-color: rgb(46, 48, 130); color: #fff; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-top: 50px; align-items: center; font-size: 20px; margin-left: auto; margin-right: auto;">
					<a href="${process.env.CLIENT_BASE_URL}?assessmenttoken=${candidateToken}" style="text-decoration: none; color: #fff">Start Test</a>
				</button>
				<p style="margin-top: 50px; line-height: 0;"><span class="highlight" style="color: rgb(46, 48, 130)">Best Wishes</span></p>
				<p style="line-height: 1.5;"><span class="highlight" style="color: rgb(46, 48, 130)">Human Resources - Hopingminds</span></p>
			</div>
		</section>
	</div>`;
}

// Export the registerMail function
module.exports = { registerMail, generateEmailTemplate };
