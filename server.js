const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();

// ========================================
// Middleware
// ========================================

app.use(cors());
app.use(express.json());

// ========================================
// PostgreSQL / Neon connection
// ========================================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// ========================================
// Test database connection
// ========================================

async function testDatabaseConnection() {
    try {
        const result = await pool.query("SELECT NOW()");

        console.log("=================================");
        console.log("Connected to Neon PostgreSQL");
        console.log("Database time:", result.rows[0].now);
        console.log("=================================");

    } catch (error) {
        console.error("Database connection failed:");
        console.error(error.message);
    }
}

testDatabaseConnection();

// ========================================
// HOME
// ========================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "ESP32 Sensor API is running"
    });

});

// ========================================
// HEALTH CHECK
// ========================================

app.get("/health", async (req, res) => {

    try {

        await pool.query("SELECT 1");

        res.json({
            success: true,
            server: "OK",
            database: "Connected"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            server: "OK",
            database: "Disconnected"
        });

    }

});

// ========================================
// RECEIVE SENSOR DATA
// ========================================

app.post("/api/sensors", async (req, res) => {

    try {

        const {
            distance_cm,
            temperature_c
        } = req.body;

        // ------------------------------------
        // Validate data
        // ------------------------------------

        if (
            distance_cm === undefined ||
            temperature_c === undefined
        ) {

            return res.status(400).json({
                success: false,
                message: "distance_cm and temperature_c are required"
            });

        }

        // Convert values to numbers
        const distance = Number(distance_cm);
        const temperature = Number(temperature_c);

        // Check if values are valid numbers
        if (
            !Number.isFinite(distance) ||
            !Number.isFinite(temperature)
        ) {

            return res.status(400).json({
                success: false,
                message: "Sensor values must be numbers"
            });

        }

        // ------------------------------------
        // Insert into PostgreSQL
        // ------------------------------------

        const query = `
            INSERT INTO sensor_readings
            (
                distance_cm,
                temperature_c
            )
            VALUES
            ($1, $2)
            RETURNING *
        `;

        const values = [
            distance,
            temperature
        ];

        const result = await pool.query(
            query,
            values
        );

        // ------------------------------------
        // Response
        // ------------------------------------

        res.status(201).json({
            success: true,
            message: "Sensor data saved successfully",
            data: result.rows[0]
        });

    } catch (error) {

        console.error("Error saving sensor data:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to save sensor data"
        });

    }

});

// ========================================
// GET ALL SENSOR DATA
// ========================================

app.get("/api/sensors", async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                id,
                distance_cm,
                temperature_c,
                recorded_at
            FROM sensor_readings
            ORDER BY recorded_at DESC
        `);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {

        console.error("Error retrieving sensor data:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve sensor data"
        });

    }

});

// ========================================
// GET LATEST SENSOR READING
// ========================================

app.get("/api/sensors/latest", async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                id,
                distance_cm,
                temperature_c,
                recorded_at
            FROM sensor_readings
            ORDER BY recorded_at DESC
            LIMIT 1
        `);

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "No sensor data available"
            });

        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve latest reading"
        });

    }

});

// ========================================
// DELETE ALL SENSOR DATA
// ========================================

app.delete("/api/sensors", async (req, res) => {

    try {

        await pool.query(`
            DELETE FROM sensor_readings
        `);

        res.json({
            success: true,
            message: "All sensor data deleted"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to delete sensor data"
        });

    }

});

// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {

    console.log("");
    console.log("=================================");
    console.log("ESP32 SENSOR API");
    console.log("=================================");
    console.log(`Server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log("=================================");
    console.log("");

});