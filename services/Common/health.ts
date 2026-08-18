import mongoose from "mongoose";

export const getHealthStatusService = async () => {
    // 1. Check MongoDB Connection State
    // 1 = connected, 2 = connecting, 0 = disconnected, 3 = disconnecting
    const dbState = mongoose.connection.readyState;
    const isDbConnected = dbState === 1;

    const healthData = {
        uptime: `${Math.floor(process.uptime())}s`,
        timestamp: new Date().toISOString(),
        database: {
            status: isDbConnected ? "CONNECTED" : "DISCONNECTED",
            readyState: dbState,
        },
        system: {
            memoryUsage: {
                rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
                heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
            },
            nodeVersion: process.version,
        },
    };

    // 2. If Database is down, respond with 530 / 503 status
    if (!isDbConnected) {
        return {
            status: false,
            code: 503,
            message: "Service unavailable: Database connection is degraded.",
            data: healthData,
        };
    }

    return {
        status: true,
        code: 200,
        message: "Server and database are healthy.",
        data: healthData,
    };
};