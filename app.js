require('dotenv').config();
const express = require('express')
const cors = require('cors'); // Import the cors package
const morgan = require('morgan');
const connectDB = require('./db/connect')
const ServerStatus = require('./middleware/helper.js');
const CorsConfig = require('./cors.config');
const product_routes = require("./routes/products");
const ProblemRoutes = require("./routes/ProblemRoutes");
const CompilersRoutes = require("./routes/CompilersRoutes");
const ProblemAdminRoutes = require("./routes/ProblemAdminRoutes");
const CodingAssessmentRoutes = require("./routes/CodingAssessmentRoutes");

const app = express();

app.use(cors({
	origin: CorsConfig,
	credentials: true,
})); // Enable CORS for all routes

app.use(morgan('tiny'))
app.disable('x-powered-by') //less hackers know about our stack

// HTTP GET Request
app.get('/', ServerStatus.getServerLoadInfo, (req, res) => {
	const uptime = ServerStatus.calculateUptime();
	const serverLoadInfo = req.serverLoadInfo;
	res.status(201).send({
		success: true,
		message: 'Hoping Minds IDE Backend!',
		dateTime: new Date().toLocaleString(),
		connectedClient: process.env.CLIENT_BASE_URL,
		systemStatus: {
			uptime: `${uptime}s`,
			cpuLoad: serverLoadInfo.cpuLoad,
			memoryUsage: serverLoadInfo.memoryUsage,
		}
	})
})

app.use(express.json());
app.use("/api", product_routes)
app.use("/api", ProblemRoutes)
app.use("/api", CompilersRoutes)
app.use("/api", ProblemAdminRoutes)
app.use("/api", CodingAssessmentRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).send('Something went wrong!');
});

const PORT = process.env.PORT || 3015;

// start server only when we have valid connection
connectDB().then(() => {
	try {
		app.listen(PORT, () => {
			console.log(`Server connected to  http://localhost:${PORT}`)
		})
	} catch (error) {
		console.log("Can\'t connect to the server");
	}
})
.catch((err) => {
	console.log("MongoDB connnection failed !!!", err);
})