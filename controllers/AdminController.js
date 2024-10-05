const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AdminModel = require('../models/Admin.model');
require('dotenv').config();

// middleware for verifying admin
async function verifyAdmin(req, res, next) {
    try {
        const { email, mobile } = req.method === 'GET' ? req.query : req.body;
        // check the admin existence
        if (email && !mobile) {
            let exist = await AdminModel.findOne({ email });
            if (!exist) return res.status(404).send({ error: "Can't find admin!" });
            req.adminID = exist._id;
            next();
        } else if (!email && mobile) {
            let exist = await AdminModel.findOne({ mobile });
            if (!exist) return res.status(404).send({ error: "Can't find admin!" });
            req.adminID = exist._id;
            next();
        }
    } catch (error) {
        return res.status(404).send({ error: 'Authentication Error' });
    }
}

/** POST: http://localhost:8080/api/registeradmin 
* @param : {
    "password" : "admin123",
    "email": "example@gmail.com",
    "firstName" : "bill",
    "lastName": "william",
    "mobile": 8009860560,
    "profile": "" (not compulsory)
}
*/
async function register(req, res) {
    try {
        const { password, email, profile, firstName, lastName, mobile, role } = req.body;

        // check for existing mobile number
        const existMobile = AdminModel.findOne({ mobile }).exec();

        // check for existing email
        const existEmail = AdminModel.findOne({ email }).exec();

        // Checking for existing mobile and email
        const [mobileExist, emailExist] = await Promise.all([existMobile, existEmail]);

        if (mobileExist) {
            return res.status(400).send({ error: 'Please use a unique mobile number' });
        }

        if (emailExist) {
            return res.status(400).send({ error: 'Please use a unique email' });
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            const admin = new AdminModel({
                password: hashedPassword,
                profile: profile || '',
                email,
                firstName,
                lastName,
                mobile,
                role
            });

            // Save the admin
            const savedAdmin = await admin.save();
            const token = jwt.sign(
                {
                    adminID: savedAdmin._id,
                    email: savedAdmin.email,
                    mobile: savedAdmin.mobile,
                    role: savedAdmin.role
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Send response with _id and email
            return res.status(201).send({
                msg: 'Admin Registered Successfully',
                token
            });
        }
    } catch (error) {
        return res.status(500).send({ error: 'Internal Server Error' });
    }
}

/** POST: http://localhost:8080/api/loginAdmin 
* @body : {
    "email" : "example123@mail.com",
    "password" : "admin123",
}
*/
async function loginAdmin(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(404).json({ success: false, message: 'Email and Password are required' });
    }
    try {
        AdminModel.findOne({ email })
            .then((admin) => {
                bcrypt
                    .compare(password, admin.password)
                    .then((passwordCheck) => {
                        if (!passwordCheck) return res.status(400).send({ error: "Wrong password" });

                        // create jwt token
                        const token = jwt.sign(
                            {
                                adminID: admin._id,
                                email: admin.email,
                                mobile: admin.mobile,
                                role: admin.role
                            },
                            process.env.JWT_SECRET,
                            { expiresIn: '7d' }
                        );
                        return res.status(200).send({
                            msg: 'Login Successful',
                            email: admin.email,
                            token
                        });
                    })
                    .catch(() => {
                        return res.status(400).send({ error: 'Password does not match' });
                    });
            })
            .catch(() => {
                return res.status(404).send({ error: 'Email not Found' });
            });
    } catch (error) {
        return res.status(500).send(error);
    }
}

/** GET: http://localhost:8080/api/admin 
    query: {
    --pass only one email or mobile according to reset with mobile or reset with email
    "email": "example@gmail.com",
    "mobile": 8009860560,
}
*/
async function getAdmin(req, res) {
    let adminID = req.adminID;
    try {
        const adminData = await AdminModel.findOne({ _id: adminID });

        if (!adminData) {
            return res.status(404).json({ success: false, msg: 'Admin not found' });
        }
        const { password, ...rest } = adminData.toObject();
        res.status(200).json({ success: true, data: rest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, msg: 'Internal server error' });
    }
}

/** PUT: http://localhost:8080/api/updateadmin 
 * @param: {
    "header" : "Bearer <token>"
}
body: {
    "email": "example@gmail.com",
    "firstName" : "bunty",
    "lastName": "william",
    "mobile": 800934860560,
    "profile": "adgsdfg"
}
*/
async function updateAdmin(req, res) {
    try {
        const { adminID } = req.admin;
        const body = req.body;
        if (!adminID) return res.status(401).send({ error: 'Admin Not Found...!' });

        const updateAdmin = new Promise((resolve, reject) => {
            // update the data
            AdminModel.updateOne({ _id: adminID }, body)
                .exec()
                .then(() => {
                    resolve();
                })
                .catch((error) => {
                    throw error;
                });
        });

        Promise.all([updateAdmin])
            .then(() => {
                return res.status(201).send({ msg: "Record Updated" });
            })
            .catch((error) => {
                return res.status(500).send({ error: error.message });
            });
    } catch (error) {
        return res.status(401).send({ error });
    }
}

/** PUT: http://localhost:8080/api/resetPassword 
body: { 
    --pass only one email or mobile according to reset with mobile or reset with email
    "email": "example@gmail.com",
    "mobile": 8009860560,
    "password": "NewPassword"
}
*/
async function resetPassword(req, res) {
    try {
        if (!req.app.locals.resetSession) return res.status(440).send({ error: "Session expired!" });

        const { email, password } = req.body;

        AdminModel.findOne({ email })
            .then((admin) => {
                bcrypt.hash(password, 10)
                    .then((hashedPassword) => {
                        AdminModel.updateOne({ email: admin.email }, { password: hashedPassword })
                            .exec()
                            .then(() => {
                                req.app.locals.resetSession = false; // reset session
                                return res.status(201).send({ msg: "Record Updated...!" });
                            })
                            .catch((error) => {
                                throw error;
                            });
                    })
                    .catch(() => {
                        return res.status(500).send({ error: "Unable to hash password" });
                    });
            })
            .catch(() => {
                return res.status(404).send({ error: "Email not Found" });
            });
    } catch (error) {
        return res.status(401).send({ error });
    }
}

module.exports = {
    verifyAdmin,
    register,
    loginAdmin,
    getAdmin,
    updateAdmin,
    resetPassword
};
