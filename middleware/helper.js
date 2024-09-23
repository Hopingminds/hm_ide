const os = require('os');

// Middleware to capture server start time
let startTime;
function captureStartTime() {
    startTime = process.hrtime();
}

// Function to calculate server uptime
function calculateUptime() {
    const uptime = process.hrtime(startTime);
    const uptimeInSeconds = uptime[0];
    return uptimeInSeconds;
}

// Middleware to get server load information
async function getServerLoadInfo(req, res, next) {
    const cpuUsage = os.loadavg();
    const memoryUsage = process.memoryUsage();
    req.serverLoadInfo = {
        cpuLoad: cpuUsage,
        memoryUsage: memoryUsage,
    };
    next();
}

module.exports = {
    captureStartTime,
    calculateUptime,
    getServerLoadInfo,
};
