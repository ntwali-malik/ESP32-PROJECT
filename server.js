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

const multer = require("multer");
const QRCode = require("qrcode");
const { v2: cloudinary } = require("cloudinary");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        if (file.mimetype.startsWith("image/")) {
            return callback(null, true);
        }
        callback(new Error("Only image files are allowed"));
    }
});

// ========================================
// PostgreSQL / Neon connection
// ========================================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error:", error.message);
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
// SAVE RECORDING SESSION DATA
// ========================================

app.post("/api/sensors/recording", async (req, res) => {
    try {
        const {
            event,
            status,
            distance_cm,
            temperature_c,
            sensor_recorded_at,
            recorded_at,
            source = "dashboard"
        } = req.body;

        if (!["start", "reading", "stop"].includes(event)) {
            return res.status(400).json({
                success: false,
                message: "event must be start, reading, or stop"
            });
        }

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "status is required"
            });
        }

        const distance = distance_cm === null || distance_cm === undefined
            ? null
            : Number(distance_cm);
        const temperature = temperature_c === null || temperature_c === undefined
            ? null
            : Number(temperature_c);

        if (
            (distance !== null && !Number.isFinite(distance)) ||
            (temperature !== null && !Number.isFinite(temperature))
        ) {
            return res.status(400).json({
                success: false,
                message: "Sensor values must be valid numbers"
            });
        }

        const result = await pool.query(`
            INSERT INTO sensor_recordings
            (
                event,
                status,
                distance_cm,
                temperature_c,
                sensor_recorded_at,
                recorded_at,
                source
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [
            event,
            status,
            distance,
            temperature,
            sensor_recorded_at || null,
            recorded_at || new Date(),
            source
        ]);

        res.status(201).json({
            success: true,
            message: "Recording data saved successfully",
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Error saving recording data:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to save recording data"
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

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const publicUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

function uploadImageToCloudinary(file) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: process.env.CLOUDINARY_FOLDER || "concrete-cubes", resource_type: "image" },
            (error, result) => error ? reject(error) : resolve(result)
        );
        stream.end(file.buffer);
    });
}

async function initializeConcreteCubeTables() {
    await pool.query(`
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
        CREATE TABLE IF NOT EXISTS concrete_cubes (
            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            qr_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
            cube_number VARCHAR(100) NOT NULL UNIQUE,
            concrete_grade VARCHAR(50) NOT NULL,
            casting_date DATE NOT NULL,
            test_age_days INTEGER NOT NULL CHECK (test_age_days > 0),
            status VARCHAR(30) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS compression_tests (
            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            cube_id BIGINT NOT NULL REFERENCES concrete_cubes(id) ON DELETE CASCADE,
            test_date DATE NOT NULL,
            cube_image_url TEXT NOT NULL,
            maximum_load_kn NUMERIC(12, 3) NOT NULL CHECK (maximum_load_kn >= 0),
            compressive_strength_mpa NUMERIC(12, 3) NOT NULL CHECK (compressive_strength_mpa >= 0),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_compression_tests_cube_id ON compression_tests(cube_id);
    `);
}

async function initializeSensorRecordingTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS sensor_recordings (
            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            event VARCHAR(20) NOT NULL CHECK (event IN ('start', 'reading', 'stop')),
            status VARCHAR(20) NOT NULL,
            distance_cm NUMERIC,
            temperature_c NUMERIC,
            sensor_recorded_at TIMESTAMPTZ,
            recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            source VARCHAR(50) NOT NULL DEFAULT 'dashboard'
        );
        CREATE INDEX IF NOT EXISTS idx_sensor_recordings_recorded_at
            ON sensor_recordings(recorded_at DESC);
    `);
}

initializeConcreteCubeTables().catch((error) => {
    console.error("Concrete cube tables could not be initialized:", error.message);
});

initializeSensorRecordingTable().catch((error) => {
    console.error("Sensor recording table could not be initialized:", error.message);
});

// ========================================
// CONCRETE CUBE / QR CODE API
// ========================================

app.post("/api/cubes", async (req, res) => {
    try {
        const { cube_number, concrete_grade, casting_date, test_age_days } = req.body;
        if (!cube_number || !concrete_grade || !casting_date || test_age_days === undefined) {
            return res.status(400).json({ success: false, message: "cube_number, concrete_grade, casting_date, and test_age_days are required" });
        }

        const age = Number(test_age_days);
        if (!Number.isInteger(age) || age <= 0) {
            return res.status(400).json({ success: false, message: "test_age_days must be a positive integer" });
        }

        const result = await pool.query(`
            INSERT INTO concrete_cubes (cube_number, concrete_grade, casting_date, test_age_days)
            VALUES ($1, $2, $3, $4) RETURNING *
        `, [cube_number.trim(), concrete_grade.trim(), casting_date, age]);
        const cube = result.rows[0];
        const scanUrl = `${publicUrl}/api/cubes/${cube.qr_token}`;
        const qrCodeDataUrl = await QRCode.toDataURL(scanUrl, { margin: 2, width: 400 });

        res.status(201).json({ success: true, data: { ...cube, scan_url: scanUrl, qr_code_data_url: qrCodeDataUrl } });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ success: false, message: "cube_number already exists" });
        }
        console.error("Error creating concrete cube:", error.message);
        res.status(500).json({ success: false, message: "Failed to create concrete cube" });
    }
});

app.get("/api/cubes", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, qr_token, cube_number, concrete_grade, casting_date, test_age_days, status, created_at
            FROM concrete_cubes ORDER BY created_at DESC
        `);
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        console.error("Error retrieving concrete cubes:", error.message);
        res.status(500).json({ success: false, message: "Failed to retrieve concrete cubes" });
    }
});

app.get("/api/cubes/:qr_token", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, COUNT(t.id)::integer AS compression_test_count
            FROM concrete_cubes c LEFT JOIN compression_tests t ON t.cube_id = c.id
            WHERE c.qr_token = $1 GROUP BY c.id
        `, [req.params.qr_token]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Concrete cube not found" });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error("Error retrieving concrete cube:", error.message);
        res.status(500).json({ success: false, message: "Failed to retrieve concrete cube" });
    }
});

app.post("/api/cubes/:qr_token/compression-tests", upload.single("cube_image"), async (req, res) => {
    const client = await pool.connect();
    try {
        const { test_date, maximum_load_kn, compressive_strength_mpa } = req.body;
        if (!req.file || !test_date || maximum_load_kn === undefined || compressive_strength_mpa === undefined) {
            return res.status(400).json({ success: false, message: "test_date, maximum_load_kn, compressive_strength_mpa, and cube_image are required" });
        }

        const maximumLoad = Number(maximum_load_kn);
        const strength = Number(compressive_strength_mpa);
        if (!Number.isFinite(maximumLoad) || maximumLoad < 0 || !Number.isFinite(strength) || strength < 0) {
            return res.status(400).json({ success: false, message: "Compression values must be non-negative numbers" });
        }

        await client.query("BEGIN");
        const cubeResult = await client.query("SELECT id FROM concrete_cubes WHERE qr_token = $1 FOR UPDATE", [req.params.qr_token]);
        if (cubeResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Concrete cube not found" });
        }

        const image = await uploadImageToCloudinary(req.file);
        const testResult = await client.query(`
            INSERT INTO compression_tests (cube_id, test_date, cube_image_url, maximum_load_kn, compressive_strength_mpa)
            VALUES ($1, $2, $3, $4, $5) RETURNING *
        `, [cubeResult.rows[0].id, test_date, image.secure_url, maximumLoad, strength]);
        await client.query("UPDATE concrete_cubes SET status = 'tested' WHERE id = $1", [cubeResult.rows[0].id]);
        await client.query("COMMIT");
        res.status(201).json({ success: true, data: testResult.rows[0] });
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        console.error("Error saving compression test:", error.message);
        res.status(500).json({ success: false, message: "Failed to save compression test" });
    } finally {
        client.release();
    }
});

app.get("/api/cubes/:qr_token/compression-tests", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.* FROM compression_tests t
            INNER JOIN concrete_cubes c ON c.id = t.cube_id
            WHERE c.qr_token = $1 ORDER BY t.test_date DESC, t.created_at DESC
        `, [req.params.qr_token]);
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        console.error("Error retrieving compression tests:", error.message);
        res.status(500).json({ success: false, message: "Failed to retrieve compression tests" });
    }
});