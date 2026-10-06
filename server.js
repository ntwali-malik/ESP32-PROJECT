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

        const setupState = await pool.query(`
            SELECT EXISTS (SELECT 1 FROM concrete_batches) AS setup_complete
        `);

        if (!setupState.rows[0]?.setup_complete) {
            return res.status(409).json({
                success: false,
                recorded: false,
                message: "Register a concrete batch and specimens before using sensor capture"
            });
        }

        const recordingState = await pool.query(`
            SELECT active
            FROM sensor_recording_state
            WHERE id = 1
        `);

        const curingSession = await pool.query(`
            SELECT id, batch_id FROM curing_sessions
            WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1
        `);

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

        if (!recordingState.rows[0]?.active && !curingSession.rows.length) {
            return res.status(202).json({
                success: true,
                recorded: false,
                message: "Sensor data ignored because recording and curing capture are stopped"
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

        if (curingSession.rows.length) {
            await pool.query(`
                INSERT INTO curing_readings (session_id, batch_id, temperature_c, distance_cm, recorded_at)
                VALUES ($1, $2, $3, $4, COALESCE($5, NOW()))
            `, [curingSession.rows[0].id, curingSession.rows[0].batch_id, temperature, distance, req.body.recorded_at || null]);
        }

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
    const client = await pool.connect();

    try {
        const {
            event,
            status,
            distance_cm,
            temperature_c,
            sensor_recorded_at,
            recorded_at,
            source = "dashboard",
            readings = []
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

        if (event === "start") {
            const setupState = await pool.query(`
                SELECT EXISTS (SELECT 1 FROM concrete_batches) AS setup_complete
            `);
            if (!setupState.rows[0]?.setup_complete) {
                return res.status(409).json({
                    success: false,
                    message: "Register a concrete batch and specimens before starting sensor capture"
                });
            }
        }

        if (event === "start" || event === "stop") {
            await pool.query(`
                UPDATE sensor_recording_state
                SET active = $1, updated_at = NOW()
                WHERE id = 1
            `, [event === "start"]);
        }

        if (!Array.isArray(readings)) {
            return res.status(400).json({
                success: false,
                message: "readings must be an array"
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

        const sessionReadings = event === "stop"
            ? readings
            : event === "reading" && distance !== null
                ? [{ distance_cm: distance, temperature_c: temperature, sensor_recorded_at }]
                : [];

        const normalizedReadings = sessionReadings.map((reading) => ({
            distance: Number(reading.distance_cm),
            temperature: Number(reading.temperature_c),
            sensorRecordedAt: reading.sensor_recorded_at || null
        }));

        if (normalizedReadings.some((reading) =>
            !Number.isFinite(reading.distance) || !Number.isFinite(reading.temperature)
        )) {
            return res.status(400).json({
                success: false,
                message: "Every captured reading must contain valid sensor values"
            });
        }

        await client.query("BEGIN");

        const result = await client.query(`
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
        `, [event, status, distance, temperature, sensor_recorded_at || null, recorded_at || new Date(), source]);

        for (const reading of normalizedReadings) {
            await client.query(`
                INSERT INTO sensor_recordings
                (event, status, distance_cm, temperature_c, sensor_recorded_at, recorded_at, source)
                VALUES ('reading', 'recording', $1, $2, $3, NOW(), $4)
            `, [reading.distance, reading.temperature, reading.sensorRecordedAt, source]);
        }

        await client.query("COMMIT");

        res.status(201).json({
            success: true,
            message: "Recording data saved successfully",
            data: result.rows[0],
            captured_count: normalizedReadings.length
        });
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        console.error("Error saving recording data:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to save recording data"
        });
    } finally {
        client.release();
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

const OPC_STRENGTH_RATIOS = [
    { age: 1, ratio: 0.16 },
    { age: 3, ratio: 0.4 },
    { age: 7, ratio: 0.65 },
    { age: 14, ratio: 0.9 },
    { age: 28, ratio: 1 }
];

function positiveNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
}

function getSpecimenVolumeM3(shape, dimensions, quantity) {
    const dimension = (key) => positiveNumber(dimensions?.[key]);
    let volumeMm3;

    if (shape === "cube") {
        const side = dimension("side_mm");
        volumeMm3 = side && side ** 3;
    } else if (shape === "cylinder") {
        const diameter = dimension("diameter_mm");
        const height = dimension("height_mm");
        volumeMm3 = diameter && height && Math.PI * (diameter / 2) ** 2 * height;
    } else if (["beam", "custom"].includes(shape)) {
        const length = dimension("length_mm");
        const width = dimension("width_mm");
        const height = dimension("height_mm");
        volumeMm3 = length && width && height && length * width * height;
    }

    if (!Number.isFinite(volumeMm3) || volumeMm3 <= 0 || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        return null;
    }
    const volumeM3 = volumeMm3 * quantity / 1e9;
    return Number.isFinite(volumeM3) ? volumeM3 : null;
}

function opcRatioAtAge(ageDays) {
    if (!Number.isFinite(ageDays) || ageDays < 1) return null;
    if (ageDays >= 28) return 1;
    const upperIndex = OPC_STRENGTH_RATIOS.findIndex((point) => point.age >= ageDays);
    if (upperIndex <= 0) return OPC_STRENGTH_RATIOS[0].ratio;
    const lower = OPC_STRENGTH_RATIOS[upperIndex - 1];
    const upper = OPC_STRENGTH_RATIOS[upperIndex];
    const fraction = (ageDays - lower.age) / (upper.age - lower.age);
    return lower.ratio + fraction * (upper.ratio - lower.ratio);
}

function buildStrengthProjection(tests, currentMaturity, castingDate) {
    const earlyTests = tests.filter((test) =>
        test.test_stage === "early" && Number.isFinite(Number(test.maturity_index))
    );
    if (earlyTests.length < 2) return null;

    const points = earlyTests.map((test) => ({
        maturity: Number(test.maturity_index),
        strength: Number(test.compressive_strength_mpa)
    }));
    const meanMaturity = points.reduce((sum, point) => sum + point.maturity, 0) / points.length;
    const meanStrength = points.reduce((sum, point) => sum + point.strength, 0) / points.length;
    const denominator = points.reduce((sum, point) => sum + (point.maturity - meanMaturity) ** 2, 0);
    if (denominator === 0) return null;

    const slope = points.reduce((sum, point) =>
        sum + (point.maturity - meanMaturity) * (point.strength - meanStrength), 0
    ) / denominator;
    const intercept = meanStrength - slope * meanMaturity;
    const currentStrength = Math.max(0, intercept + slope * currentMaturity);
    const ageDays = (Date.now() - new Date(castingDate).getTime()) / 86400000;
    const ageRatio = opcRatioAtAge(ageDays);
    if (!ageRatio || currentStrength <= 0) return { intercept, slope, current_maturity: currentMaturity, projections: null };

    const estimated28DayStrength = currentStrength / ageRatio;
    return {
        intercept,
        slope,
        current_maturity: currentMaturity,
        estimated_28_day_strength_mpa: estimated28DayStrength,
        projections: OPC_STRENGTH_RATIOS.map(({ age, ratio }) => ({
            age_days: age,
            ratio,
            estimated_strength_mpa: estimated28DayStrength * ratio
        }))
    };
}

async function getBatchMaturityIndex(batchId, endTime = new Date()) {
    const result = await pool.query(`
        WITH points AS (
            SELECT temperature_c, recorded_at,
                LAG(temperature_c) OVER (ORDER BY recorded_at) AS previous_temperature,
                LAG(recorded_at) OVER (ORDER BY recorded_at) AS previous_recorded_at
            FROM curing_readings
            WHERE batch_id = $1 AND recorded_at <= $2
        ), intervals AS (
            SELECT SUM(
                GREATEST(previous_temperature + 10, 0) *
                EXTRACT(EPOCH FROM (recorded_at - previous_recorded_at)) / 3600
            ) AS maturity
            FROM points
            WHERE previous_recorded_at IS NOT NULL
        ), latest AS (
            SELECT temperature_c, recorded_at FROM points
            ORDER BY recorded_at DESC LIMIT 1
        )
        SELECT COALESCE(intervals.maturity, 0) + COALESCE(
            GREATEST(latest.temperature_c + 10, 0) *
            GREATEST(EXTRACT(EPOCH FROM ($2::timestamptz - latest.recorded_at)) / 3600, 0),
            0
        ) AS maturity
        FROM intervals LEFT JOIN latest ON TRUE
    `, [batchId, endTime]);
    return Number(result.rows[0]?.maturity || 0);
}

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
        CREATE TABLE IF NOT EXISTS concrete_batches (
            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            batch_number VARCHAR(100) NOT NULL UNIQUE,
            concrete_grade VARCHAR(50) NOT NULL,
            casting_date DATE NOT NULL,
            test_age_days INTEGER NOT NULL DEFAULT 28 CHECK (test_age_days > 0),
            cement_ratio NUMERIC(10, 4) NOT NULL CHECK (cement_ratio > 0),
            sand_ratio NUMERIC(10, 4) NOT NULL CHECK (sand_ratio > 0),
            aggregate_ratio NUMERIC(10, 4) NOT NULL CHECK (aggregate_ratio > 0),
            water_cement_ratio NUMERIC(10, 4) NOT NULL CHECK (water_cement_ratio > 0),
            wet_volume_m3 NUMERIC(12, 6) NOT NULL,
            dry_volume_m3 NUMERIC(12, 6) NOT NULL,
            cement_kg NUMERIC(12, 3) NOT NULL,
            sand_kg NUMERIC(12, 3) NOT NULL,
            aggregate_kg NUMERIC(12, 3) NOT NULL,
            water_liters NUMERIC(12, 3) NOT NULL,
            specimen_shape VARCHAR(20) NOT NULL,
            dimensions_mm JSONB NOT NULL,
            specimen_quantity INTEGER NOT NULL CHECK (specimen_quantity > 0),
            slump_class VARCHAR(2) NOT NULL,
            measured_slump_mm NUMERIC(10, 2),
            slump_status VARCHAR(20) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS concrete_cubes (
            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            qr_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
            cube_number VARCHAR(100) NOT NULL UNIQUE,
            concrete_grade VARCHAR(50) NOT NULL,
            casting_date DATE NOT NULL,
            test_age_days INTEGER NOT NULL CHECK (test_age_days > 0),
            batch_id BIGINT REFERENCES concrete_batches(id) ON DELETE SET NULL,
            specimen_shape VARCHAR(20),
            dimensions_mm JSONB,
            status VARCHAR(30) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE concrete_cubes ADD COLUMN IF NOT EXISTS batch_id BIGINT REFERENCES concrete_batches(id) ON DELETE SET NULL;
        ALTER TABLE concrete_cubes ADD COLUMN IF NOT EXISTS specimen_shape VARCHAR(20);
        ALTER TABLE concrete_cubes ADD COLUMN IF NOT EXISTS dimensions_mm JSONB;
        CREATE TABLE IF NOT EXISTS compression_tests (
            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            cube_id BIGINT NOT NULL REFERENCES concrete_cubes(id) ON DELETE CASCADE,
            test_date DATE NOT NULL,
            tested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            cube_image_url TEXT NOT NULL,
            maximum_load_kn NUMERIC(12, 3) NOT NULL CHECK (maximum_load_kn >= 0),
            compressive_strength_mpa NUMERIC(12, 3) NOT NULL CHECK (compressive_strength_mpa >= 0),
            confirmed_by VARCHAR(150) NOT NULL DEFAULT 'Unknown',
            approval_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
            test_stage VARCHAR(20) NOT NULL DEFAULT 'final',
            maturity_index NUMERIC(18, 3),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE compression_tests ADD COLUMN IF NOT EXISTS confirmed_by VARCHAR(150) NOT NULL DEFAULT 'Unknown';
        ALTER TABLE compression_tests ADD COLUMN IF NOT EXISTS approval_confirmed BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE compression_tests ADD COLUMN IF NOT EXISTS test_stage VARCHAR(20) NOT NULL DEFAULT 'final';
        ALTER TABLE compression_tests ADD COLUMN IF NOT EXISTS maturity_index NUMERIC(18, 3);
        ALTER TABLE compression_tests ADD COLUMN IF NOT EXISTS tested_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        CREATE INDEX IF NOT EXISTS idx_compression_tests_cube_id ON compression_tests(cube_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_compression_tests_cube_stage
            ON compression_tests(cube_id, test_stage);
        CREATE TABLE IF NOT EXISTS curing_sessions (
            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            batch_id BIGINT NOT NULL REFERENCES concrete_batches(id) ON DELETE CASCADE,
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ended_at TIMESTAMPTZ
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_curing_session
            ON curing_sessions ((ended_at IS NULL)) WHERE ended_at IS NULL;
        CREATE TABLE IF NOT EXISTS curing_readings (
            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            session_id BIGINT NOT NULL REFERENCES curing_sessions(id) ON DELETE CASCADE,
            batch_id BIGINT NOT NULL REFERENCES concrete_batches(id) ON DELETE CASCADE,
            temperature_c NUMERIC(10, 3) NOT NULL,
            distance_cm NUMERIC(10, 3),
            recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_curing_readings_batch_time
            ON curing_readings(batch_id, recorded_at);
    `);
}

async function initializeSensorRecordingTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS sensor_recording_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            active BOOLEAN NOT NULL DEFAULT FALSE,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        INSERT INTO sensor_recording_state (id, active)
        VALUES (1, FALSE)
        ON CONFLICT (id) DO NOTHING;
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

app.post("/api/batches", async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            batch_number,
            concrete_grade,
            casting_date,
            test_age_days = 28,
            mix_ratio,
            water_cement_ratio,
            specimen_shape,
            dimensions_mm,
            specimen_quantity,
            slump_class
        } = req.body;
        const cementRatio = positiveNumber(mix_ratio?.cement);
        const sandRatio = positiveNumber(mix_ratio?.sand);
        const aggregateRatio = positiveNumber(mix_ratio?.aggregate);
        const waterCementRatio = positiveNumber(water_cement_ratio);
        const quantity = Number(specimen_quantity);
        const age = Number(test_age_days);
        const wetVolume = getSpecimenVolumeM3(specimen_shape, dimensions_mm, quantity);

        if (!batch_number?.trim() || !concrete_grade?.trim() || !casting_date ||
            !Number.isInteger(age) || age <= 0 || !cementRatio || !sandRatio ||
            !aggregateRatio || !waterCementRatio || !wetVolume ||
            !["S1", "S2", "S3", "S4", "S5"].includes(slump_class)) {
            return res.status(400).json({ success: false, message: "Provide valid batch, mix, specimen dimensions, quantity, and slump class" });
        }

        const dryVolume = wetVolume * 1.54;
        const ratioTotal = cementRatio + sandRatio + aggregateRatio;
        const cementKg = (dryVolume * cementRatio / ratioTotal) * 1440;
        const sandKg = (dryVolume * sandRatio / ratioTotal) * 1600;
        const aggregateKg = (dryVolume * aggregateRatio / ratioTotal) * 1500;
        const waterLiters = cementKg * waterCementRatio;

        await client.query("BEGIN");
        const batchResult = await client.query(`
            INSERT INTO concrete_batches (
                batch_number, concrete_grade, casting_date, test_age_days,
                cement_ratio, sand_ratio, aggregate_ratio, water_cement_ratio,
                wet_volume_m3, dry_volume_m3, cement_kg, sand_kg, aggregate_kg,
                water_liters, specimen_shape, dimensions_mm, specimen_quantity, slump_class
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17, $18)
            RETURNING *
        `, [batch_number.trim(), concrete_grade.trim(), casting_date, age, cementRatio, sandRatio,
            aggregateRatio, waterCementRatio, wetVolume, dryVolume, cementKg, sandKg, aggregateKg,
            waterLiters, specimen_shape, JSON.stringify(dimensions_mm), quantity, slump_class]);
        const batch = batchResult.rows[0];
        const specimens = [];

        for (let index = 1; index <= quantity; index += 1) {
            const specimenNumber = `${batch_number.trim()}-S${String(index).padStart(2, "0")}`;
            const specimenResult = await client.query(`
                INSERT INTO concrete_cubes (
                    cube_number, concrete_grade, casting_date, test_age_days,
                    batch_id, specimen_shape, dimensions_mm
                ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
                RETURNING *
            `, [specimenNumber, concrete_grade.trim(), casting_date, age, batch.id,
                specimen_shape, JSON.stringify(dimensions_mm)]);
            const specimen = specimenResult.rows[0];
            const scanUrl = `${publicUrl}/api/cubes/${specimen.qr_token}`;
            specimens.push({
                ...specimen,
                scan_url: scanUrl,
                qr_code_data_url: await QRCode.toDataURL(scanUrl, { margin: 2, width: 400 })
            });
        }

        await client.query("COMMIT");
        res.status(201).json({ success: true, data: { batch, specimens } });
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        if (error.code === "23505") {
            return res.status(409).json({ success: false, message: "Batch or specimen number already exists" });
        }
        console.error("Error creating concrete batch:", error.message);
        res.status(500).json({ success: false, message: "Failed to create concrete batch" });
    } finally {
        client.release();
    }
});

app.get("/api/batches", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT b.*,
                (SELECT COUNT(*)::integer FROM concrete_cubes c WHERE c.batch_id = b.id) AS created_specimens,
                (SELECT COUNT(*)::integer FROM compression_tests t
                    INNER JOIN concrete_cubes c ON c.id = t.cube_id WHERE c.batch_id = b.id) AS compression_test_count
            FROM concrete_batches b
            ORDER BY b.created_at DESC
        `);
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        console.error("Error retrieving concrete batches:", error.message);
        res.status(500).json({ success: false, message: "Failed to retrieve concrete batches" });
    }
});

app.get("/api/batches/:batch_id", async (req, res) => {
    try {
        const batchResult = await pool.query("SELECT * FROM concrete_batches WHERE id = $1", [req.params.batch_id]);
        if (!batchResult.rows.length) {
            return res.status(404).json({ success: false, message: "Concrete batch not found" });
        }
        const batch = batchResult.rows[0];
        const [specimenResult, testResult, readingsResult, sessionResult] = await Promise.all([
            pool.query("SELECT * FROM concrete_cubes WHERE batch_id = $1 ORDER BY id", [batch.id]),
            pool.query(`
                SELECT t.*, c.cube_number FROM compression_tests t
                INNER JOIN concrete_cubes c ON c.id = t.cube_id
                WHERE c.batch_id = $1 ORDER BY t.test_date, t.created_at
            `, [batch.id]),
            pool.query("SELECT * FROM curing_readings WHERE batch_id = $1 ORDER BY recorded_at DESC LIMIT 500", [batch.id]),
            pool.query("SELECT * FROM curing_sessions WHERE batch_id = $1 ORDER BY started_at DESC LIMIT 1", [batch.id])
        ]);
        const maturityIndex = await getBatchMaturityIndex(batch.id);
        const tests = testResult.rows;
        res.json({
            success: true,
            data: {
                batch,
                specimens: specimenResult.rows,
                tests,
                curing_readings: readingsResult.rows.reverse(),
                curing_session: sessionResult.rows[0] || null,
                maturity_index: maturityIndex,
                strength_projection: buildStrengthProjection(tests, maturityIndex, batch.casting_date)
            }
        });
    } catch (error) {
        console.error("Error retrieving concrete batch:", error.message);
        res.status(500).json({ success: false, message: "Failed to retrieve concrete batch" });
    }
});

app.post("/api/batches/:batch_id/slump", async (req, res) => {
    try {
        const slump = Number(req.body.measured_slump_mm);
        const slumpClass = req.body.slump_class;
        const bounds = { S1: [10, 40], S2: [50, 90], S3: [100, 150], S4: [160, 210], S5: [220, Infinity] };
        if (!Number.isFinite(slump) || slump < 0 || !bounds[slumpClass]) {
            return res.status(400).json({ success: false, message: "Provide a valid slump in millimetres and class S1-S5" });
        }
        const [minimum, maximum] = bounds[slumpClass];
        const status = slump >= minimum && slump <= maximum ? "approved" : "adjustment_required";
        const result = await pool.query(`
            UPDATE concrete_batches SET measured_slump_mm = $1, slump_class = $2, slump_status = $3
            WHERE id = $4 RETURNING *
        `, [slump, slumpClass, status, req.params.batch_id]);
        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: "Concrete batch not found" });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error("Error recording slump:", error.message);
        res.status(500).json({ success: false, message: "Failed to record slump" });
    }
});

app.post("/api/batches/:batch_id/curing", async (req, res) => {
    try {
        const { action } = req.body;
        if (!["start", "stop"].includes(action)) {
            return res.status(400).json({ success: false, message: "action must be start or stop" });
        }
        if (action === "start") {
            const result = await pool.query(`
                INSERT INTO curing_sessions (batch_id)
                SELECT id FROM concrete_batches WHERE id = $1 AND slump_status = 'approved'
                RETURNING *
            `, [req.params.batch_id]);
            if (!result.rows.length) {
                const batch = await pool.query("SELECT id FROM concrete_batches WHERE id = $1", [req.params.batch_id]);
                if (!batch.rows.length) {
                    return res.status(404).json({ success: false, message: "Concrete batch not found" });
                }
                return res.status(409).json({ success: false, message: "Record an approved slump result before starting curing" });
            }
            return res.status(201).json({ success: true, data: result.rows[0] });
        }
        const result = await pool.query(`
            UPDATE curing_sessions SET ended_at = NOW()
            WHERE batch_id = $1 AND ended_at IS NULL RETURNING *
        `, [req.params.batch_id]);
        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: "No active curing session for this batch" });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ success: false, message: "Another curing session is already active" });
        }
        console.error("Error changing curing session:", error.message);
        res.status(500).json({ success: false, message: "Failed to change curing session" });
    }
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
        const cube = result.rows[0];
        const scanUrl = `${publicUrl}/api/cubes/${cube.qr_token}`;
        res.json({ success: true, data: {
            ...cube,
            scan_url: scanUrl,
            qr_code_data_url: await QRCode.toDataURL(scanUrl, { margin: 2, width: 400 })
        } });
    } catch (error) {
        console.error("Error retrieving concrete cube:", error.message);
        res.status(500).json({ success: false, message: "Failed to retrieve concrete cube" });
    }
});

app.post("/api/cubes/:qr_token/compression-tests", upload.single("cube_image"), async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            test_date,
            maximum_load_kn,
            compressive_strength_mpa,
            confirmed_by,
            approval_confirmed,
            test_stage = "final",
            tested_at
        } = req.body;
        if (!req.file || !test_date || maximum_load_kn === undefined || compressive_strength_mpa === undefined || !confirmed_by?.trim()) {
            return res.status(400).json({ success: false, message: "test_date, maximum_load_kn, compressive_strength_mpa, confirmed_by, and cube_image are required" });
        }

        if (approval_confirmed !== "true") {
            return res.status(400).json({ success: false, message: "You must confirm that the compression result is correct" });
        }

        if (!["early", "final"].includes(test_stage)) {
            return res.status(400).json({ success: false, message: "test_stage must be early or final" });
        }

        const maximumLoad = Number(maximum_load_kn);
        const strength = Number(compressive_strength_mpa);
        if (!Number.isFinite(maximumLoad) || maximumLoad < 0 || !Number.isFinite(strength) || strength < 0) {
            return res.status(400).json({ success: false, message: "Compression values must be non-negative numbers" });
        }

        await client.query("BEGIN");
        const cubeResult = await client.query("SELECT id, batch_id, casting_date FROM concrete_cubes WHERE qr_token = $1 FOR UPDATE", [req.params.qr_token]);
        if (cubeResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Concrete cube not found" });
        }

        const testedAt = tested_at ? new Date(tested_at) : new Date(`${test_date}T12:00:00.000Z`);
        if (!Number.isFinite(testedAt.getTime())) {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, message: "tested_at must be a valid timestamp" });
        }
        const castingDate = cubeResult.rows[0].casting_date;
        const castingDateString = castingDate instanceof Date
            ? castingDate.toISOString().slice(0, 10)
            : String(castingDate).slice(0, 10);
        const castingDay = Date.parse(`${castingDateString}T00:00:00Z`);
        const testDay = Date.parse(`${test_date}T00:00:00Z`);
        const ageDays = Math.floor((testDay - castingDay) / 86400000);
        if (test_stage === "early" && (!Number.isFinite(ageDays) || ageDays < 1 || ageDays > 3)) {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, message: "Early-age calibration tests must be recorded 1 to 3 days after casting" });
        }
        const existingTest = await client.query(
            "SELECT id FROM compression_tests WHERE cube_id = $1 AND test_stage = $2 LIMIT 1",
            [cubeResult.rows[0].id, test_stage]
        );
        if (existingTest.rows.length) {
            await client.query("ROLLBACK");
            return res.status(409).json({ success: false, message: `A ${test_stage} test is already recorded for this specimen` });
        }
        const maturityIndex = cubeResult.rows[0].batch_id
            ? await getBatchMaturityIndex(cubeResult.rows[0].batch_id, testedAt)
            : null;
        const image = await uploadImageToCloudinary(req.file);
        const testResult = await client.query(`
            INSERT INTO compression_tests
            (cube_id, test_date, tested_at, cube_image_url, maximum_load_kn, compressive_strength_mpa,
             confirmed_by, approval_confirmed, test_stage, maturity_index)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
        `, [cubeResult.rows[0].id, test_date, testedAt, image.secure_url, maximumLoad, strength,
            confirmed_by.trim(), true, test_stage, maturityIndex]);
        if (test_stage === "final") {
            await client.query("UPDATE concrete_cubes SET status = 'tested' WHERE id = $1", [cubeResult.rows[0].id]);
        }
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