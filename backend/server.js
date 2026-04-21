const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { query, checkDbConnection, pool } = require("./db");

dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET || "change_me_for_production";
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || `${JWT_SECRET}_refresh`;
const REFRESH_TOKEN_TTL_DAYS = Math.max(1, Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30);
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || "refresh_token";
const REFRESH_COOKIE_PATH = process.env.REFRESH_COOKIE_PATH || "/api/auth";
const USE_SECURE_COOKIES =
  String(process.env.NODE_ENV || "").toLowerCase() === "production" || FRONTEND_ORIGIN.startsWith("https://");
const IMAGE_ANALYSIS_PROVIDER = String(process.env.IMAGE_ANALYSIS_PROVIDER || "auto").toLowerCase();
const IMAGE_ANALYSIS_ENDPOINT = process.env.IMAGE_ANALYSIS_ENDPOINT || "";
const IMAGE_ANALYSIS_TIMEOUT_MS = Number(process.env.IMAGE_ANALYSIS_TIMEOUT_MS) || 15_000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_VISION_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
const WEB3FORMS_ACCESS_KEY = process.env.WEB3FORMS_ACCESS_KEY || "";
const WEB3FORMS_ENDPOINT = String(process.env.WEB3FORMS_ENDPOINT || "https://api.web3forms.com/submit")
  .split("`n")[0]
  .trim();
const WEB3FORMS_FROM_NAME = String(process.env.WEB3FORMS_FROM_NAME || "SkinCare AI Support")
  .split("`n")[0]
  .trim();
const WEB3FORMS_TIMEOUT_MS = Number(process.env.WEB3FORMS_TIMEOUT_MS) || 10_000;
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || "20mb";
const PROFILE_PHOTO_MAX_BYTES = Math.max(100_000, Number(process.env.PROFILE_PHOTO_MAX_BYTES) || 5 * 1024 * 1024);

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
    exposedHeaders: ["Content-Disposition", "Content-Length"],
  }),
);
// Image uploads are sent as base64 JSON payloads, so default 100kb body limit is too small.
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));

function createToken(user, sessionId) {
  // Issue a signed JWT that carries the user id, role, and session id for API authorization.
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role || "user",
      sid: sessionId,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL },
  );
}

function extractBearerToken(authorizationHeader) {
  // Read "Authorization: Bearer <token>" and return only the token value.
  const [scheme, token] = String(authorizationHeader || "").split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token;
}

function createRefreshToken(userId, sessionId) {
  return jwt.sign(
    {
      sub: userId,
      sid: sessionId,
      type: "refresh",
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d` },
  );
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function toRefreshExpiresAt() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function parseCookies(cookieHeader) {
  const safeDecode = (value) => {
    try {
      return decodeURIComponent(value);
    } catch (_error) {
      return value;
    }
  };

  const entries = String(cookieHeader || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex <= 0) {
        return null;
      }
      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      return [key, safeDecode(value)];
    })
    .filter(Boolean);

  return Object.fromEntries(entries);
}

function getRefreshTokenFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[REFRESH_COOKIE_NAME] || null;
}

function getClientIp(req) {
  const xForwardedFor = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return xForwardedFor || req.ip || req.socket?.remoteAddress || null;
}

function normalizeUserAgent(userAgent) {
  const normalized = String(userAgent || "").trim();
  return normalized ? normalized.slice(0, 512) : null;
}

function getRefreshCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure: USE_SECURE_COOKIES,
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH,
    expires: expiresAt,
  };
}

function setRefreshTokenCookie(res, refreshToken, expiresAt) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions(expiresAt));
}

function clearRefreshTokenCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions(new Date(0)));
}

async function resolveRequestUser(token) {
  // Decode JWT, then load the latest user state from DB (role/status can change after login).
  const decoded = jwt.verify(token, JWT_SECRET);
  if (!decoded?.sub || !decoded?.sid) {
    return null;
  }

  await ensureAuthSessionsTable();
  const result = await query(
    `SELECT u.user_id, u.full_name, u.email, u.gender, u.date_of_birth, u.phone, u.is_active, u.is_banned, u.created_at,
            COALESCE(LOWER(r.role_name), 'user') AS role_name
     FROM users u
     LEFT JOIN roles r ON r.role_id = u.role_id
     INNER JOIN user_session s ON s.user_id = u.user_id
     WHERE u.user_id = $1
       AND s.session_id = $2
       AND s.revoked_at IS NULL
       AND s.expires_at > NOW()`,
    [decoded.sub, decoded.sid],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return toApiUser(result.rows[0]);
}

async function authenticateToken(req, res, next) {
  // Strict auth guard: request must include a valid token for an active, non-banned user.
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  try {
    const user = await resolveRequestUser(token);
    if (!user) {
      return res.status(401).json({ error: "Invalid token user" });
    }
    if (user.status === "banned") {
      return res.status(403).json({ error: "Account is banned" });
    }
    if (user.status === "inactive") {
      return res.status(403).json({ error: "Account is inactive" });
    }
    req.authUser = user;
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    return res.status(500).json({ error: "Authentication failed", details: error.message });
  }
}

async function optionalAuth(req, res, next) {
  // Soft auth guard: attach user if token exists; allow anonymous access if token is absent.
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    req.authUser = null;
    return next();
  }

  try {
    const user = await resolveRequestUser(token);
    if (!user) {
      return res.status(401).json({ error: "Invalid token user" });
    }
    if (user.status === "banned") {
      return res.status(403).json({ error: "Account is banned" });
    }
    if (user.status === "inactive") {
      return res.status(403).json({ error: "Account is inactive" });
    }
    req.authUser = user;
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    return res.status(500).json({ error: "Authentication failed", details: error.message });
  }
}

function requireAdmin(req, res, next) {
  // Role guard for admin-only routes.
  if ((req.authUser?.role || "").toLowerCase() !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  return next();
}

function normalizePhoneNumber(value) {
  return String(value || "").replace(/[\s()-]/g, "");
}

function toUserStatus(userRow) {
  if (userRow.is_banned) {
    return "banned";
  }
  if (userRow.is_active === false) {
    return "inactive";
  }
  return "active";
}

function toApiUser(userRow) {
  return {
    id: userRow.user_id,
    name: userRow.full_name,
    email: userRow.email,
    gender: userRow.gender || null,
    dateOfBirth: userRow.date_of_birth || null,
    phoneNumber: userRow.phone || null,
    role: (userRow.role_name || "user").toLowerCase(),
    status: toUserStatus(userRow),
    createdAt: userRow.created_at,
  };
}

async function ensureRoleId(roleName) {
  const existing = await query("SELECT role_id FROM roles WHERE LOWER(role_name) = LOWER($1)", [roleName]);
  if (existing.rowCount > 0) {
    return existing.rows[0].role_id;
  }

  const inserted = await query(
    "INSERT INTO roles (role_name, description) VALUES ($1, $2) RETURNING role_id",
    [roleName, `${roleName} role`],
  );
  return inserted.rows[0].role_id;
}

async function tableExists(tableName) {
  const result = await query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName],
  );
  return result.rowCount > 0;
}

async function tableExistsInClient(client, tableName) {
  const result = await client.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName],
  );
  return result.rowCount > 0;
}

async function columnExists(tableName, columnName, client = null) {
  const runQuery = client ? client.query.bind(client) : query;
  const result = await runQuery(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2`,
    [tableName, columnName],
  );
  return result.rowCount > 0;
}

let authSessionsTableReady = false;

async function ensureAuthSessionsTable() {
  if (authSessionsTableReady) {
    return true;
  }

  const hasTable = await tableExists("user_session");
  if (!hasTable) {
    await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await query(
      `CREATE TABLE IF NOT EXISTS user_session (
         session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
         refresh_token_hash TEXT NOT NULL UNIQUE,
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         last_used_at TIMESTAMPTZ,
         expires_at TIMESTAMPTZ NOT NULL,
         revoked_at TIMESTAMPTZ,
         created_ip VARCHAR(64),
         user_agent TEXT
       )`,
    );
    await query(
      `CREATE INDEX IF NOT EXISTS idx_user_session_user_active
       ON user_session (user_id, expires_at)
       WHERE revoked_at IS NULL`,
    );
    await query(
      `CREATE INDEX IF NOT EXISTS idx_user_session_expires_at
       ON user_session (expires_at)`,
    );
  }

  authSessionsTableReady = true;
  return true;
}

async function createAuthSession({ userId, ipAddress = null, userAgent = null }) {
  await ensureAuthSessionsTable();
  const sessionId = crypto.randomUUID();
  const expiresAt = toRefreshExpiresAt();
  const refreshToken = createRefreshToken(userId, sessionId);
  const refreshTokenHash = hashToken(refreshToken);

  await query(
    `INSERT INTO user_session (session_id, user_id, refresh_token_hash, expires_at, last_used_at, created_ip, user_agent)
     VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
    [sessionId, userId, refreshTokenHash, expiresAt.toISOString(), ipAddress, userAgent],
  );

  return {
    sessionId,
    refreshToken,
    refreshExpiresAt: expiresAt,
  };
}

async function revokeUserSessions(userId, client = null) {
  const runQuery = client ? client.query.bind(client) : query;
  await runQuery(
    `UPDATE user_session
     SET revoked_at = COALESCE(revoked_at, NOW()),
         last_used_at = NOW()
     WHERE user_id = $1
       AND revoked_at IS NULL`,
    [userId],
  );
}

async function revokeSessionById(sessionId, client = null) {
  if (!sessionId) {
    return;
  }
  const runQuery = client ? client.query.bind(client) : query;
  await runQuery(
    `UPDATE user_session
     SET revoked_at = COALESCE(revoked_at, NOW()),
         last_used_at = NOW()
     WHERE session_id = $1`,
    [sessionId],
  );
}

async function ensurePasswordResetTokensTable() {
  const hasTable = await tableExists("password_reset_tokens");
  if (hasTable) return true;

  await query(
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  return true;
}

async function getPasswordResetPrimaryKeyColumn(client = null) {
  const runQuery = client ? client.query.bind(client) : query;
  const result = await runQuery(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'password_reset_tokens'
       AND column_name IN ('id', 'token_id')
     ORDER BY CASE WHEN column_name = 'id' THEN 0 ELSE 1 END
     LIMIT 1`,
  );
  return result.rowCount > 0 ? result.rows[0].column_name : null;
}

let userProfilePhotosTableReady = false;

async function ensureUserProfilePhotosTable() {
  if (userProfilePhotosTableReady) {
    return true;
  }

  await query(
    `CREATE TABLE IF NOT EXISTS user_profile_photos (
      user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
      image_data TEXT NOT NULL,
      mime_type VARCHAR(64),
      file_size INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  );

  userProfilePhotosTableReady = true;
  return true;
}

function parseProfilePhotoDataUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return { error: "imageDataUrl is required" };
  }

  const matched = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (!matched) {
    return { error: "imageDataUrl must be a valid base64 data URL" };
  }

  const mimeType = String(matched[1] || "").toLowerCase();
  const allowedMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
  if (!allowedMimeTypes.has(mimeType)) {
    return { error: "Only JPG, PNG, WEBP, or GIF images are allowed" };
  }

  const normalizedBase64 = String(matched[2] || "").replace(/\s+/g, "");
  const padding = normalizedBase64.endsWith("==") ? 2 : normalizedBase64.endsWith("=") ? 1 : 0;
  const bytes = Math.max(0, Math.floor((normalizedBase64.length * 3) / 4) - padding);
  if (bytes <= 0) {
    return { error: "Invalid image payload" };
  }
  if (bytes > PROFILE_PHOTO_MAX_BYTES) {
    return {
      error: `Profile photo exceeds limit (${Math.ceil(PROFILE_PHOTO_MAX_BYTES / (1024 * 1024))}MB)`,
    };
  }

  return {
    error: null,
    dataUrl: `data:${mimeType};base64,${normalizedBase64}`,
    mimeType,
    bytes,
  };
}

function isNonEmptyPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0);
}

async function getLatestQuestionnaireDataForUser(userId, client = null) {
  const runQuery = client ? client.query.bind(client) : query;
  const result = await runQuery(
    `SELECT notes
     FROM skin_assessments
     WHERE user_id = $1
       AND notes IS NOT NULL
     ORDER BY assessment_date DESC
     LIMIT 20`,
    [userId],
  );

  for (const row of result.rows) {
    if (!row?.notes) continue;
    try {
      const parsed = JSON.parse(row.notes);
      if (isNonEmptyPlainObject(parsed?.questionnaireData)) {
        return parsed.questionnaireData;
      }
    } catch (_error) {
      // Skip malformed notes from older assessments.
    }
  }

  return {};
}

function parseSkinTypeFromAssessmentNotes(notes) {
  if (!notes) return "Unknown";
  try {
    const parsed = JSON.parse(notes);
    return normalizeSkinTypeCandidate(parsed?.skinType) || "Unknown";
  } catch (_error) {
    return "Unknown";
  }
}

function toWeekStartUtcDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const mondayOffset = (normalized.getUTCDay() + 6) % 7;
  normalized.setUTCDate(normalized.getUTCDate() - mondayOffset);
  return normalized;
}

function toDateOnlyString(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function toProgressStatus(currentWeek, previousWeek) {
  if (!previousWeek) {
    return {
      status: "baseline",
      label: "Baseline week",
      scoreChange: null,
      conditionBurdenChange: null,
    };
  }

  const currentScore = Number(currentWeek?.score || 0);
  const previousScore = Number(previousWeek?.score || 0);
  const currentBurden = Number(currentWeek?.conditionBurden || 0);
  const previousBurden = Number(previousWeek?.conditionBurden || 0);

  const scoreChange = currentScore - previousScore;
  const conditionBurdenChange = currentBurden - previousBurden;

  if (scoreChange >= 3 || (scoreChange >= 1 && conditionBurdenChange <= -1) || conditionBurdenChange <= -2) {
    return {
      status: "improved",
      label: "Improved",
      scoreChange,
      conditionBurdenChange,
    };
  }

  if (scoreChange <= -3 || (scoreChange <= -1 && conditionBurdenChange >= 1) || conditionBurdenChange >= 2) {
    return {
      status: "worse",
      label: "Worse",
      scoreChange,
      conditionBurdenChange,
    };
  }

  return {
    status: "no_change",
    label: "No significant change",
    scoreChange,
    conditionBurdenChange,
  };
}

function buildWeeklyProgressPayload(assessments = []) {
  const weekMap = new Map();

  for (const assessment of assessments) {
    const weekStartDate = toWeekStartUtcDate(assessment?.date);
    if (!weekStartDate) continue;
    const weekKey = toDateOnlyString(weekStartDate);
    if (!weekKey) continue;

    if (!weekMap.has(weekKey)) {
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);

      weekMap.set(weekKey, {
        weekStart: weekKey,
        weekEnd: toDateOnlyString(weekEndDate),
        assessmentCount: 1,
        assessmentId: assessment.id,
        assessmentDate: assessment.date,
        score: Number(assessment.score || 0),
        skinType: assessment.skinType || "Unknown",
        conditionCount: Number(assessment.conditionCount || 0),
        conditionBurden: Number(assessment.conditionBurden || 0),
      });
    } else {
      weekMap.get(weekKey).assessmentCount += 1;
    }
  }

  const weeks = Array.from(weekMap.values()).sort(
    (a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime(),
  );

  for (let index = 0; index < weeks.length; index += 1) {
    const previousWeek = weeks[index + 1] || null;
    weeks[index].progress = toProgressStatus(weeks[index], previousWeek);
  }

  const streakDayGap = 7 * 24 * 60 * 60 * 1000;
  let currentStreakWeeks = 0;
  for (let index = 0; index < weeks.length; index += 1) {
    if (index === 0) {
      currentStreakWeeks = 1;
      continue;
    }
    const newer = new Date(weeks[index - 1].weekStart).getTime();
    const older = new Date(weeks[index].weekStart).getTime();
    if (newer - older === streakDayGap) {
      currentStreakWeeks += 1;
    } else {
      break;
    }
  }

  const summary = {
    totalAssessments: assessments.length,
    totalWeeksTracked: weeks.length,
    latestScore: weeks[0]?.score ?? null,
    previousScore: weeks[1]?.score ?? null,
    scoreChangeFromLastWeek: weeks[0]?.progress?.scoreChange ?? null,
    latestStatus: weeks[0]?.progress?.status ?? null,
    currentStreakWeeks,
    improvedWeeks: weeks.filter((week) => week.progress?.status === "improved").length,
    noChangeWeeks: weeks.filter((week) => week.progress?.status === "no_change").length,
    worseWeeks: weeks.filter((week) => week.progress?.status === "worse").length,
  };

  return { summary, weeks };
}

const QUESTIONNAIRE_QUESTION_DEFINITIONS = [
  {
    key: "skinType",
    questionText: "What best describes your skin type?",
    questionType: "single_choice",
    isRequired: true,
    displayOrder: 1,
    options: [
      { label: "Normal", value: "normal" },
      { label: "Dry", value: "dry" },
      { label: "Oily", value: "oily" },
      { label: "Combination", value: "combination" },
      { label: "Sensitive", value: "sensitive" },
      { label: "Acne-prone", value: "acne-prone" },
      { label: "Dehydrated", value: "dehydrated" },
      { label: "Mature", value: "mature" },
    ],
  },
  {
    key: "afterCleansing",
    questionText: "How does your skin feel 30 minutes after cleansing?",
    questionType: "single_choice",
    isRequired: true,
    displayOrder: 2,
    options: [
      { label: "Tight or dry", value: "tight" },
      { label: "Comfortable", value: "comfortable" },
      { label: "Slightly oily", value: "slightly-oily" },
      { label: "Very oily", value: "very-oily" },
      { label: "Dry but still looks dull", value: "dry-dull" },
    ],
  },
  {
    key: "middayFeeling",
    questionText: "By midday, your skin is usually:",
    questionType: "single_choice",
    isRequired: true,
    displayOrder: 3,
    options: [
      { label: "Flaky or dry", value: "flaky" },
      { label: "Balanced and comfortable", value: "balanced" },
      { label: "Shiny in the T-zone (forehead, nose, chin)", value: "shiny-tzone" },
      { label: "Shiny all over", value: "shiny-all" },
      { label: "Red or easily irritated", value: "red-irritated" },
    ],
  },
  {
    key: "productReaction",
    questionText: "How does your skin react to new skincare products?",
    questionType: "single_choice",
    isRequired: true,
    displayOrder: 4,
    options: [
      { label: "Usually no reaction", value: "none" },
      { label: "Mild redness", value: "redness" },
      { label: "Breakouts or pimples", value: "breakout" },
      { label: "Burning or irritation", value: "irritation" },
      { label: "Feels dry or tight", value: "dry-tight" },
    ],
  },
  {
    key: "shineLevel",
    questionText: "How much shine do you notice most days?",
    questionType: "single_choice",
    isRequired: true,
    displayOrder: 5,
    options: [
      { label: "Low (almost none)", value: "low" },
      { label: "Moderate (mainly in T-zone)", value: "medium" },
      { label: "High (shiny all over)", value: "high" },
      { label: "Changes depending on the day", value: "variable" },
    ],
  },
  {
    key: "breakoutFrequency",
    questionText: "How often do you experience breakouts?",
    questionType: "single_choice",
    isRequired: true,
    displayOrder: 6,
    options: [
      { label: "Rarely or never", value: "rarely" },
      { label: "Sometimes", value: "sometimes" },
      { label: "Often", value: "often" },
      { label: "Almost always", value: "always" },
    ],
  },
  {
    key: "skinTexture",
    questionText: "How would you describe your skin texture?",
    questionType: "single_choice",
    isRequired: true,
    displayOrder: 7,
    options: [
      { label: "Smooth and even", value: "smooth-even" },
      { label: "Rough or flaky", value: "rough-flaky" },
      { label: "Oily and thick", value: "oily-thick" },
      { label: "Bumpy or acne-prone", value: "bumpy-acne-prone" },
      { label: "Thin with visible lines", value: "thin-lines" },
    ],
  },
  {
    key: "endOfDay",
    questionText: "How does your skin feel at the end of the day?",
    questionType: "single_choice",
    isRequired: true,
    displayOrder: 8,
    options: [
      { label: "Comfortable", value: "comfortable" },
      { label: "Dry or tight", value: "dry-tight" },
      { label: "Oily or greasy", value: "oily-greasy" },
      { label: "Irritated or sensitive", value: "irritated-sensitive" },
    ],
  },
];

async function ensureQuestionId(client, definition) {
  const existing = await client.query(
    `SELECT question_id
     FROM skin_questions
     WHERE question_text = $1
     LIMIT 1`,
    [definition.questionText],
  );

  if (existing.rowCount > 0) {
    const questionId = existing.rows[0].question_id;
    await client.query(
      `UPDATE skin_questions
       SET question_type = $1, is_required = $2, display_order = $3
       WHERE question_id = $4`,
      [definition.questionType, definition.isRequired, definition.displayOrder, questionId],
    );
    return questionId;
  }

  const inserted = await client.query(
    `INSERT INTO skin_questions (question_text, question_type, is_required, display_order)
     VALUES ($1, $2, $3, $4)
     RETURNING question_id`,
    [definition.questionText, definition.questionType, definition.isRequired, definition.displayOrder],
  );
  return inserted.rows[0].question_id;
}

async function ensureQuestionOptionId(client, questionId, option, displayOrder) {
  const existing = await client.query(
    `SELECT option_id
     FROM question_options
     WHERE question_id = $1
       AND (option_value = $2 OR option_text = $3)
     ORDER BY option_id
     LIMIT 1`,
    [questionId, option.value, option.label],
  );

  if (existing.rowCount > 0) {
    const optionId = existing.rows[0].option_id;
    await client.query(
      `UPDATE question_options
       SET option_text = $1, option_value = $2, display_order = $3
       WHERE option_id = $4`,
      [option.label, option.value, displayOrder, optionId],
    );
    return optionId;
  }

  const inserted = await client.query(
    `INSERT INTO question_options (question_id, option_text, option_value, display_order)
     VALUES ($1, $2, $3, $4)
     RETURNING option_id`,
    [questionId, option.label, option.value, displayOrder],
  );
  return inserted.rows[0].option_id;
}

async function persistQuestionnaireAnswers(client, assessmentId, questionnaireData = {}) {
  const hasQuestionsTable = await tableExistsInClient(client, "skin_questions");
  const hasOptionsTable = await tableExistsInClient(client, "question_options");
  const hasAnswersTable = await tableExistsInClient(client, "assessment_answers");
  if (!hasQuestionsTable || !hasOptionsTable || !hasAnswersTable) {
    return;
  }

  for (const definition of QUESTIONNAIRE_QUESTION_DEFINITIONS) {
    const rawValue = questionnaireData?.[definition.key];
    if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") continue;

    const value = String(rawValue);
    const matchedOption = definition.options.find((option) => option.value === value) || null;
    const questionId = await ensureQuestionId(client, definition);
    const selectedOptionId = matchedOption
      ? await ensureQuestionOptionId(
          client,
          questionId,
          matchedOption,
          definition.options.findIndex((option) => option.value === matchedOption.value) + 1,
        )
      : null;

    await client.query(
      `INSERT INTO assessment_answers (assessment_id, question_id, answer_text, selected_option_id)
       VALUES ($1, $2, $3, $4)`,
      [assessmentId, questionId, matchedOption?.label || value, selectedOptionId],
    );
  }
}

function determineSkinType(questionnaireData = {}) {
  const selectedSkinType = normalizeSkinTypeCandidate(questionnaireData?.skinType);
  if (selectedSkinType) return selectedSkinType;

  const {
    afterCleansing,
    middayFeeling,
    shineLevel,
    productReaction,
    breakoutFrequency,
    skinTexture,
    endOfDay,
  } = questionnaireData;

  if (middayFeeling === "red-irritated" || productReaction === "irritation" || endOfDay === "irritated-sensitive")
    return "Sensitive";
  if (breakoutFrequency === "always" || skinTexture === "bumpy-acne-prone") return "Acne-prone";
  if (
    afterCleansing === "tight" ||
    afterCleansing === "dry-dull" ||
    middayFeeling === "flaky" ||
    productReaction === "dry-tight" ||
    endOfDay === "dry-tight" ||
    skinTexture === "rough-flaky"
  ) {
    return "Dry";
  }
  if (afterCleansing === "very-oily" || middayFeeling === "shiny-all" || shineLevel === "high")
    return "Oily";
  if (
    afterCleansing === "slightly-oily" ||
    middayFeeling === "shiny-tzone" ||
    shineLevel === "medium" ||
    shineLevel === "variable"
  ) {
    return "Combination";
  }
  if (skinTexture === "thin-lines") return "Mature";
  return "Normal";
}

function buildDetectedConditions(questionnaireData = {}, skinType = "Normal") {
  const conditions = [];
  const { afterCleansing, productReaction, middayFeeling, shineLevel, breakoutFrequency, skinTexture, endOfDay } =
    questionnaireData;

  if (
    productReaction === "breakout" ||
    shineLevel === "high" ||
    breakoutFrequency === "often" ||
    breakoutFrequency === "always" ||
    skinTexture === "bumpy-acne-prone" ||
    skinType === "Acne-prone"
  ) {
    conditions.push({
      name: "Acne",
      severity: "moderate",
      description: "Breakout tendency detected in oily-prone areas.",
      confidence: 0.82,
      area: "T-zone",
    });
  }

  if (
    middayFeeling === "flaky" ||
    afterCleansing === "tight" ||
    afterCleansing === "dry-dull" ||
    productReaction === "dry-tight" ||
    endOfDay === "dry-tight" ||
    skinTexture === "rough-flaky" ||
    skinType === "Dry" ||
    skinType === "Dehydrated"
  ) {
    conditions.push({
      name: "Dryness",
      severity: "mild",
      description: "Surface dehydration and dry patches detected.",
      confidence: 0.76,
      area: "Cheeks",
    });
  }

  if (
    productReaction === "redness" ||
    productReaction === "irritation" ||
    middayFeeling === "red-irritated" ||
    endOfDay === "irritated-sensitive" ||
    skinType === "Sensitive"
  ) {
    conditions.push({
      name: "Sensitivity",
      severity: "mild",
      description: "Skin appears reactive to product changes.",
      confidence: 0.71,
      area: "General",
    });
  }

  if (skinType === "Mature" || skinTexture === "thin-lines") {
    conditions.push({
      name: "Fine Lines",
      severity: "mild",
      description: "Early signs of line definition and reduced skin elasticity detected.",
      confidence: 0.68,
      area: "Forehead and eye area",
    });
  }

  if (conditions.length === 0) {
    conditions.push({
      name: "Mild Texture Irregularity",
      severity: "mild",
      description: "Minor unevenness detected; maintain routine consistency.",
      confidence: 0.65,
      area: "General",
    });
  }

  return conditions;
}

function buildRecommendations(skinType, conditions) {
  const recommendations = [
    {
      type: "routine",
      title: "Gentle Cleansing",
      details: "Use a pH-balanced cleanser twice daily to protect your skin barrier.",
      priority: "high",
    },
    {
      type: "routine",
      title: "Daily Sunscreen",
      details: "Apply broad-spectrum SPF 30+ every morning as the final skincare step.",
      priority: "high",
    },
  ];

  const conditionNames = new Set(conditions.map((c) => c.name.toLowerCase()));

  if (conditionNames.has("acne")) {
    recommendations.push({
      type: "product",
      title: "BHA Exfoliant",
      details: "Use 2% salicylic acid 2-3 nights per week to help with clogged pores.",
      priority: "high",
    });
  }

  if (conditionNames.has("dryness")) {
    recommendations.push({
      type: "product",
      title: "Barrier Moisturizer",
      details: "Use ceramide-rich moisturizer after cleansing, especially at night.",
      priority: "medium",
    });
  }

  if (conditionNames.has("sensitivity")) {
    recommendations.push({
      type: "lifestyle",
      title: "Low-Irritation Routine",
      details: "Avoid introducing multiple active ingredients at once.",
      priority: "medium",
    });
  }

  if (conditionNames.has("fine lines")) {
    recommendations.push({
      type: "product",
      title: "Night Retinoid Support",
      details: "Use a gentle retinoid at night 2-3 times weekly and moisturize well.",
      priority: "medium",
    });
  }

  if (skinType === "Oily") {
    recommendations.push({
      type: "routine",
      title: "Lightweight Hydration",
      details: "Choose oil-free gel moisturizers to hydrate without heaviness.",
      priority: "medium",
    });
  }

  return recommendations;
}

function normalizeSeverity(severity) {
  const value = String(severity || "").toLowerCase().trim();
  if (value === "severe" || value === "high") return "severe";
  if (value === "moderate" || value === "medium") return "moderate";
  return "mild";
}

function severityWeight(severity) {
  if (severity === "severe") return 3;
  if (severity === "moderate") return 2;
  return 1;
}

function normalizeSkinTypeCandidate(value) {
  const normalized = String(value || "").toLowerCase().trim();
  if (!normalized) return null;
  if (normalized.includes("acne")) return "Acne-prone";
  if (normalized.includes("dehyd")) return "Dehydrated";
  if (normalized.includes("matur") || normalized.includes("aging") || normalized.includes("ageing"))
    return "Mature";
  if (normalized.includes("comb")) return "Combination";
  if (normalized.includes("oil")) return "Oily";
  if (normalized.includes("dry")) return "Dry";
  if (normalized.includes("sens")) return "Sensitive";
  if (normalized.includes("norm") || normalized.includes("balanc")) return "Normal";
  return null;
}

function clampConfidence(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(1, parsed));
}

function extractJsonObject(text) {
  const value = String(text || "").trim();
  if (!value) return null;
  const first = value.indexOf("{");
  const last = value.lastIndexOf("}");
  if (first === -1 || last === -1 || last < first) return null;
  const sliced = value.slice(first, last + 1);
  try {
    return JSON.parse(sliced);
  } catch (_error) {
    return null;
  }
}

function ensureImageDataUrl(imageBase64) {
  const value = String(imageBase64 || "").trim();
  if (!value) return null;
  if (value.startsWith("data:image/")) return value;
  return `data:image/jpeg;base64,${value}`;
}

function estimateBase64Size(base64Value) {
  const clean = String(base64Value || "").replace(/\s/g, "");
  if (!clean) return null;
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

function buildSkinImageMetadata(imageBase64, assessmentId) {
  const raw = String(imageBase64 || "").trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    return {
      imageUrl: raw,
      mimeType: null,
      fileSize: null,
      fileName: `assessment-${assessmentId}`,
    };
  }

  const dataUrl = ensureImageDataUrl(raw);
  const matched = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl || "");
  const mimeType = matched ? matched[1].toLowerCase() : null;
  const base64Payload = matched ? matched[2] : "";
  const fileSize = estimateBase64Size(base64Payload);
  const extensionByMime = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
  };
  const extension = extensionByMime[mimeType] || "jpg";

  return {
    imageUrl: `inline://assessment/${assessmentId}`,
    mimeType,
    fileSize,
    fileName: `assessment-${assessmentId}.${extension}`,
  };
}

async function persistSkinImage(client, assessmentId, userId, imageBase64) {
  const hasImagesTable = await tableExistsInClient(client, "skin_images");
  if (!hasImagesTable) return;

  const metadata = buildSkinImageMetadata(imageBase64, assessmentId);
  if (!metadata) return;

  await client.query(
    `INSERT INTO skin_images (assessment_id, user_id, image_url, image_type, file_name, mime_type, file_size)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      assessmentId,
      userId,
      metadata.imageUrl,
      "FACE",
      metadata.fileName,
      metadata.mimeType,
      metadata.fileSize,
    ],
  );
}

function normalizeImageConditions(conditions, sourceTag) {
  if (!Array.isArray(conditions)) return [];

  return conditions
    .map((item) => {
      const name = String(item?.name || item?.condition || "").trim();
      if (!name) return null;
      const severity = normalizeSeverity(item?.severity || item?.level);
      const confidence = clampConfidence(item?.confidence);
      return {
        name,
        severity,
        description: String(item?.description || item?.notes || "Detected from image analysis."),
        confidence: confidence ?? 0.62,
        area: String(item?.area || "General"),
        source: sourceTag,
      };
    })
    .filter(Boolean);
}

function normalizeImageInsights(raw, provider) {
  const skinType = normalizeSkinTypeCandidate(raw?.skinType || raw?.skinTypeHint);
  const confidence = clampConfidence(raw?.confidence);
  const summary = String(raw?.summary || raw?.analysis || "").trim();
  const conditions = normalizeImageConditions(raw?.conditions || raw?.detectedConditions, "image");

  return {
    provider,
    skinType,
    confidence,
    summary,
    conditions,
  };
}

function mergeConditions(questionnaireConditions, imageConditions) {
  const merged = new Map();

  for (const condition of questionnaireConditions || []) {
    merged.set(String(condition.name || "").toLowerCase(), {
      ...condition,
      source: "questionnaire",
    });
  }

  for (const condition of imageConditions || []) {
    const key = String(condition.name || "").toLowerCase();
    if (!key) continue;

    if (!merged.has(key)) {
      merged.set(key, condition);
      continue;
    }

    const existing = merged.get(key);
    const chosenSeverity =
      severityWeight(condition.severity) > severityWeight(existing.severity)
        ? condition.severity
        : existing.severity;
    merged.set(key, {
      ...existing,
      severity: chosenSeverity,
      confidence: Math.max(Number(existing.confidence || 0), Number(condition.confidence || 0)),
      area: existing.area || condition.area,
      description:
        condition.description && condition.description !== existing.description
          ? `${existing.description} ${condition.description}`.trim()
          : existing.description,
      source: "questionnaire+image",
    });
  }

  return [...merged.values()];
}

function resolveFinalSkinType(questionnaireSkinType, imageSkinType, imageConfidence) {
  if (imageSkinType && Number(imageConfidence || 0) >= 0.55) {
    return imageSkinType;
  }
  return questionnaireSkinType;
}

function computeAnalysisConfidence(conditions, imageConfidence = null) {
  const conditionAverage =
    conditions.length > 0
      ? conditions.reduce((sum, item) => sum + Number(item.confidence || 0.6), 0) / conditions.length
      : 0.6;

  if (imageConfidence === null) {
    return Math.max(0.5, Math.min(0.95, conditionAverage));
  }
  return Math.max(0.5, Math.min(0.98, (conditionAverage + imageConfidence) / 2));
}

async function fetchJsonWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  } finally {
    clearTimeout(timer);
  }
}

async function analyzeImageViaEndpoint(imageBase64, questionnaireData) {
  if (!IMAGE_ANALYSIS_ENDPOINT) return null;

  const { response, payload } = await fetchJsonWithTimeout(
    IMAGE_ANALYSIS_ENDPOINT,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64,
        questionnaireData,
      }),
    },
    IMAGE_ANALYSIS_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `Image endpoint failed with ${response.status}`);
  }

  return normalizeImageInsights(payload, "endpoint");
}

async function analyzeImageViaOpenAI(imageBase64, questionnaireData) {
  if (!OPENAI_API_KEY) return null;

  const imageUrl = ensureImageDataUrl(imageBase64);
  if (!imageUrl) return null;

  const prompt = [
    "Analyze the face image for skincare concerns.",
    "Combine findings with this questionnaire context:",
    JSON.stringify(questionnaireData || {}),
    'Return strict JSON only with keys: "skinType", "confidence", "summary", "conditions".',
    'Each condition must include: "name", "severity" (mild|moderate|severe), "description", "confidence", "area".',
  ].join("\n");

  const { response, payload } = await fetchJsonWithTimeout(
    `${OPENAI_BASE_URL.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_VISION_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a skincare analysis assistant. Output only valid JSON with the requested schema.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 700,
      }),
    },
    IMAGE_ANALYSIS_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.message || `OpenAI request failed with ${response.status}`);
  }

  const rawText = payload?.choices?.[0]?.message?.content;
  const parsed = typeof rawText === "string" ? extractJsonObject(rawText) : rawText;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("OpenAI returned non-JSON image analysis output");
  }

  return normalizeImageInsights(parsed, "openai");
}

async function analyzeImageWithAI(imageBase64, questionnaireData) {
  if (!imageBase64) return null;

  const mode = IMAGE_ANALYSIS_PROVIDER;
  const providers =
    mode === "endpoint"
      ? ["endpoint"]
      : mode === "openai"
        ? ["openai"]
        : mode === "none"
          ? []
          : ["endpoint", "openai"];

  for (const provider of providers) {
    try {
      if (provider === "endpoint") {
        const result = await analyzeImageViaEndpoint(imageBase64, questionnaireData);
        if (result) return result;
      }
      if (provider === "openai") {
        const result = await analyzeImageViaOpenAI(imageBase64, questionnaireData);
        if (result) return result;
      }
    } catch (error) {
      console.warn(`[image-analysis:${provider}] ${error.message}`);
    }
  }

  return null;
}

function calculateOverallScore(conditions) {
  const severityPenalty = conditions.reduce((total, condition) => {
    if (condition.severity === "severe") return total + 20;
    if (condition.severity === "moderate") return total + 12;
    return total + 6;
  }, 0);
  const score = 100 - severityPenalty;
  return Math.max(35, Math.min(98, score));
}

async function ensureConditionId(conditionName) {
  const inserted = await query(
    `INSERT INTO skin_conditions (condition_name)
     VALUES ($1)
     ON CONFLICT (condition_name) DO UPDATE SET condition_name = EXCLUDED.condition_name
     RETURNING condition_id`,
    [conditionName],
  );
  return inserted.rows[0].condition_id;
}

function normalizeUserStatus(status) {
  const lowered = String(status || "").toLowerCase();
  if (lowered === "banned") return { is_active: false, is_banned: true };
  if (lowered === "inactive" || lowered === "pending") return { is_active: false, is_banned: false };
  return { is_active: true, is_banned: false };
}

async function forwardSupportMessageToWeb3Forms({ name, email, subject, message }) {
  if (!WEB3FORMS_ACCESS_KEY) {
    return { forwarded: false, skipped: true, reason: "WEB3FORMS_ACCESS_KEY is not configured" };
  }

  const summarizeFailure = (rawReason, statusCode = null) => {
    const text = String(rawReason || "").trim();
    if (
      /<!doctype html/i.test(text) ||
      /<html/i.test(text) ||
      /just a moment/i.test(text) ||
      /enable javascript and cookies/i.test(text)
    ) {
      return "Web3Forms blocked this server request (Cloudflare challenge). Restart backend; if it continues, run backend on a hosted server.";
    }
    if (!text) {
      return statusCode ? `Web3Forms request failed (${statusCode})` : "Web3Forms request failed";
    }
    return text.length > 260 ? `${text.slice(0, 260)}...` : text;
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEB3FORMS_TIMEOUT_MS);
  try {
    // Match the Web3Forms browser flow: multipart/form-data POST payload.
    const formData = new FormData();
    formData.append("access_key", WEB3FORMS_ACCESS_KEY);
    formData.append("name", String(name || ""));
    formData.append("email", String(email || ""));
    formData.append("subject", String(subject || "Support message"));
    formData.append("message", String(message || ""));
    if (WEB3FORMS_FROM_NAME) {
      formData.append("from_name", WEB3FORMS_FROM_NAME);
    }

    const response = await fetch(WEB3FORMS_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { message: await response.text() };

    if (!response.ok || payload?.success === false) {
      return {
        forwarded: false,
        skipped: false,
        reason: summarizeFailure(payload?.message || payload?.error, response.status),
      };
    }

    return { forwarded: true, skipped: false, reason: null };
  } catch (error) {
    return {
      forwarded: false,
      skipped: false,
      reason: error?.name === "AbortError" ? "Web3Forms request timed out" : error.message,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeSupportStatus(status) {
  const lowered = String(status || "").toLowerCase();
  if (lowered === "resolved") return "RESOLVED";
  if (lowered === "in_progress" || lowered === "in progress") return "IN_PROGRESS";
  return "OPEN";
}

function normalizeSupportMessageType(type) {
  const lowered = String(type || "").trim().toLowerCase();
  if (lowered === "feedback") return "feedback";
  if (lowered === "contact") return "contact";
  return "all";
}

function safeParseJson(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function formatConditionSummary(conditions = []) {
  if (!Array.isArray(conditions) || conditions.length === 0) return "none detected";
  return conditions
    .slice(0, 3)
    .map((condition) => `${condition.name} (${condition.severity})`)
    .join(", ");
}

function formatRecommendationSummary(recommendations = []) {
  if (!Array.isArray(recommendations) || recommendations.length === 0) return "No saved recommendations yet.";
  return recommendations
    .slice(0, 3)
    .map((recommendation, index) => `${index + 1}. ${recommendation.details}`)
    .join("\n");
}

async function getLatestAssessmentContextForUser(userId, client = null) {
  const runQuery = client ? client.query.bind(client) : query;
  const assessmentResult = await runQuery(
    `SELECT assessment_id, assessment_date, overall_score, notes
     FROM skin_assessments
     WHERE user_id = $1
     ORDER BY assessment_date DESC
     LIMIT 1`,
    [userId],
  );

  if (assessmentResult.rowCount === 0) {
    return null;
  }

  const latestAssessment = assessmentResult.rows[0];
  const parsedNotes = safeParseJson(latestAssessment.notes, {}) || {};
  const analysisResult = await runQuery(
    `SELECT analysis_id, model_name, model_version, summary, confidence_score, analysis_status, created_at
     FROM ai_analyses
     WHERE assessment_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [latestAssessment.assessment_id],
  );
  const latestAnalysis = analysisResult.rowCount > 0 ? analysisResult.rows[0] : null;

  const recommendationResult = await runQuery(
    `SELECT recommendation_id, recommendation_type, title, details, priority_level, created_at
     FROM recommendations
     WHERE assessment_id = $1
     ORDER BY created_at ASC`,
    [latestAssessment.assessment_id],
  );

  let conditionRows = [];
  if (latestAnalysis?.analysis_id) {
    const conditionResult = await runQuery(
      `SELECT sc.condition_name, dc.severity_level, dc.confidence_score, dc.detected_area, dc.notes
       FROM ai_detected_conditions dc
       JOIN skin_conditions sc ON sc.condition_id = dc.condition_id
       WHERE dc.analysis_id = $1
       ORDER BY COALESCE(dc.confidence_score, 0) DESC, sc.condition_name`,
      [latestAnalysis.analysis_id],
    );
    conditionRows = conditionResult.rows;
  }

  const notesImageAnalysis = parsedNotes?.imageAnalysis || {};
  const normalizedConfidence =
    latestAnalysis?.confidence_score === null || latestAnalysis?.confidence_score === undefined
      ? notesImageAnalysis?.confidence ?? null
      : Number(latestAnalysis.confidence_score);

  return {
    assessmentId: latestAssessment.assessment_id,
    assessmentDate: latestAssessment.assessment_date,
    score:
      latestAssessment.overall_score === null || latestAssessment.overall_score === undefined
        ? null
        : Number(latestAssessment.overall_score),
    skinType: parsedNotes?.skinType || "Unknown",
    imageAnalysis: {
      used: Boolean(notesImageAnalysis?.used),
      provider: notesImageAnalysis?.provider || null,
      summary: latestAnalysis?.summary || notesImageAnalysis?.summary || null,
      confidence: normalizedConfidence,
      modelName: latestAnalysis?.model_name || null,
      modelVersion: latestAnalysis?.model_version || null,
      status: latestAnalysis?.analysis_status || null,
    },
    conditions: conditionRows.map((row) => ({
      name: row.condition_name,
      severity: String(row.severity_level || "mild").toLowerCase(),
      confidence:
        row.confidence_score === null || row.confidence_score === undefined ? null : Number(row.confidence_score),
      area: row.detected_area || null,
      notes: row.notes || "",
    })),
    recommendations: recommendationResult.rows.map((row) => ({
      id: row.recommendation_id,
      type: String(row.recommendation_type || "").toLowerCase(),
      title: row.title || "",
      details: row.details || "",
      priority: row.priority_level ? String(row.priority_level).toLowerCase() : null,
      createdAt: row.created_at,
    })),
  };
}

function buildChatResponse(message, assessmentContext = null) {
  const lowerMessage = String(message || "").toLowerCase();
  const hasAssessment = Boolean(assessmentContext);

  if (!hasAssessment) {
    if (lowerMessage.includes("routine") || lowerMessage.includes("recommend")) {
      return "I can build a better routine once you complete your skin assessment. Please run an analysis first, then I will tailor recommendations to your results.";
    }
    return "I can help with skincare questions. For personalized guidance, complete your skin assessment so I can use your skin type, detected conditions, and recommendations.";
  }

  const skinType = assessmentContext.skinType || "Unknown";
  const conditionSummary = formatConditionSummary(assessmentContext.conditions);
  const recommendationSummary = formatRecommendationSummary(assessmentContext.recommendations);
  const predictionSummary = assessmentContext?.imageAnalysis?.summary || "No image prediction summary available.";
  const scoreText =
    assessmentContext.score === null || assessmentContext.score === undefined
      ? "N/A"
      : String(assessmentContext.score);

  if (
    lowerMessage.includes("result") ||
    lowerMessage.includes("assessment") ||
    lowerMessage.includes("prediction") ||
    lowerMessage.includes("analysis")
  ) {
    return [
      `Latest assessment summary: Skin type is ${skinType}, score is ${scoreText}.`,
      `Predicted from image: ${predictionSummary}`,
      `Detected conditions: ${conditionSummary}.`,
    ].join("\n");
  }

  if (
    lowerMessage.includes("recommend") ||
    lowerMessage.includes("routine") ||
    lowerMessage.includes("steps") ||
    lowerMessage.includes("product")
  ) {
    return [
      `Based on your latest ${skinType} assessment and detected conditions (${conditionSummary}), follow this plan:`,
      recommendationSummary,
      "If you want, I can turn this into a morning vs night routine.",
    ].join("\n");
  }

  if (lowerMessage.includes("acne") || lowerMessage.includes("breakout")) {
    return [
      `Your latest context shows: ${conditionSummary}.`,
      "For breakout control, use a gentle cleanser and add salicylic acid slowly (2-3 nights per week), then moisturize consistently.",
    ].join("\n");
  }

  if (lowerMessage.includes("dry") || lowerMessage.includes("hydr")) {
    return [
      `Your latest context shows: ${conditionSummary}.`,
      "For hydration, apply a humectant serum on damp skin and seal with a barrier-support moisturizer.",
    ].join("\n");
  }

  if (lowerMessage.includes("sunscreen") || lowerMessage.includes("spf")) {
    return "Use broad-spectrum SPF 30+ every morning and reapply every 2 hours when outdoors.";
  }

  return [
    `I am using your latest assessment context: ${skinType} skin, conditions: ${conditionSummary}.`,
    `Image prediction summary: ${predictionSummary}`,
    "Tell me your goal (acne control, hydration, texture, or anti-aging), and I will tailor the plan.",
  ].join("\n");
}

app.get("/api/health", (_, res) => {
  res.json({
    ok: true,
    service: "backend",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health/db", async (_, res) => {
  try {
    const db = await checkDbConnection();
    res.json({
      ok: true,
      db,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Database connection failed",
      details: error.message,
    });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, gender, dateOfBirth, phoneNumber } = req.body || {};
    if (!name || !email || !password || !gender || !dateOfBirth || !phoneNumber) {
      return res.status(400).json({
        error: "Name, email, password, gender, dateOfBirth, and phoneNumber are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!/^\+?\d{7,15}$/.test(normalizedPhone)) {
      return res.status(400).json({ error: "Phone number must be valid (7-15 digits)" });
    }

    if (Number.isNaN(Date.parse(dateOfBirth))) {
      return res.status(400).json({ error: "dateOfBirth must be a valid date" });
    }

    const emailLower = String(email).trim().toLowerCase();
    const exists = await query("SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)", [emailLower]);
    if (exists.rowCount > 0) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const userRoleId = await ensureRoleId("user");
    const hashedPassword = await bcrypt.hash(password, 10);
    const inserted = await query(
      `INSERT INTO users (role_id, full_name, email, password_hash, gender, date_of_birth, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING user_id, full_name, email, gender, date_of_birth, phone, is_active, is_banned, created_at`,
      [userRoleId, name.trim(), emailLower, hashedPassword, gender.trim(), dateOfBirth, normalizedPhone],
    );

    const user = inserted.rows[0];
    user.role_name = "user";
    const authSession = await createAuthSession({
      userId: user.user_id,
      ipAddress: getClientIp(req),
      userAgent: normalizeUserAgent(req.headers["user-agent"]),
    });
    setRefreshTokenCookie(res, authSession.refreshToken, authSession.refreshExpiresAt);
    const token = createToken({
      id: user.user_id,
      email: user.email,
      role: user.role_name,
    }, authSession.sessionId);

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: toApiUser(user),
    });
  } catch (error) {
    return res.status(500).json({ error: "Registration failed", details: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const emailLower = String(email).trim().toLowerCase();
    const result = await query(
      `SELECT u.user_id, u.full_name, u.email, u.password_hash, u.gender, u.date_of_birth, u.phone, u.is_active, u.is_banned, u.created_at,
              COALESCE(LOWER(r.role_name), 'user') AS role_name
       FROM users u
       LEFT JOIN roles r ON r.role_id = u.role_id
       WHERE LOWER(u.email) = LOWER($1)`,
      [emailLower],
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    if (user.is_banned) {
      return res.status(403).json({ error: "Account is banned" });
    }
    if (user.is_active === false) {
      return res.status(403).json({ error: "Account is inactive" });
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    await query("UPDATE users SET updated_at = NOW() WHERE user_id = $1", [user.user_id]);
    const authSession = await createAuthSession({
      userId: user.user_id,
      ipAddress: getClientIp(req),
      userAgent: normalizeUserAgent(req.headers["user-agent"]),
    });
    setRefreshTokenCookie(res, authSession.refreshToken, authSession.refreshExpiresAt);

    const token = createToken({
      id: user.user_id,
      email: user.email,
      role: user.role_name,
    }, authSession.sessionId);
    return res.json({
      message: "Login successful",
      token,
      user: toApiUser(user),
    });
  } catch (error) {
    return res.status(500).json({ error: "Login failed", details: error.message });
  }
});

app.post("/api/auth/refresh", async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  if (!refreshToken) {
    clearRefreshTokenCookie(res);
    return res.status(401).json({ error: "Refresh token required" });
  }

  let decodedRefresh;
  try {
    decodedRefresh = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
  } catch (_error) {
    clearRefreshTokenCookie(res);
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  if (!decodedRefresh?.sub || !decodedRefresh?.sid || decodedRefresh.type !== "refresh") {
    clearRefreshTokenCookie(res);
    return res.status(401).json({ error: "Invalid refresh token payload" });
  }

  await ensureAuthSessionsTable();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sessionResult = await client.query(
      `SELECT session_id, user_id, refresh_token_hash, expires_at, revoked_at
       FROM user_session
       WHERE session_id = $1
       FOR UPDATE`,
      [decodedRefresh.sid],
    );

    if (sessionResult.rowCount === 0) {
      await client.query("ROLLBACK");
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: "Session not found" });
    }

    const session = sessionResult.rows[0];
    const refreshTokenHash = hashToken(refreshToken);
    const isExpired = new Date(session.expires_at).getTime() <= Date.now();

    if (
      session.user_id !== decodedRefresh.sub ||
      session.revoked_at ||
      isExpired ||
      session.refresh_token_hash !== refreshTokenHash
    ) {
      await revokeSessionById(session.session_id, client);
      await client.query("COMMIT");
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: "Session is no longer valid" });
    }

    const userResult = await client.query(
      `SELECT u.user_id, u.full_name, u.email, u.gender, u.date_of_birth, u.phone, u.is_active, u.is_banned, u.created_at,
              COALESCE(LOWER(r.role_name), 'user') AS role_name
       FROM users u
       LEFT JOIN roles r ON r.role_id = u.role_id
       WHERE u.user_id = $1`,
      [decodedRefresh.sub],
    );

    if (userResult.rowCount === 0) {
      await revokeSessionById(session.session_id, client);
      await client.query("COMMIT");
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: "Session user not found" });
    }

    const user = userResult.rows[0];
    if (user.is_banned || user.is_active === false) {
      await revokeSessionById(session.session_id, client);
      await client.query("COMMIT");
      clearRefreshTokenCookie(res);
      return res.status(403).json({ error: "Account is not allowed to sign in" });
    }

    const nextRefreshToken = createRefreshToken(user.user_id, session.session_id);
    const nextRefreshTokenHash = hashToken(nextRefreshToken);
    const nextRefreshExpiresAt = toRefreshExpiresAt();
    await client.query(
      `UPDATE user_session
       SET refresh_token_hash = $1,
           expires_at = $2,
           last_used_at = NOW(),
           user_agent = COALESCE($3, user_agent)
       WHERE session_id = $4`,
      [nextRefreshTokenHash, nextRefreshExpiresAt.toISOString(), normalizeUserAgent(req.headers["user-agent"]), session.session_id],
    );

    await client.query("COMMIT");

    setRefreshTokenCookie(res, nextRefreshToken, nextRefreshExpiresAt);
    const token = createToken(
      {
        id: user.user_id,
        email: user.email,
        role: user.role_name,
      },
      session.session_id,
    );

    return res.json({
      message: "Session refreshed",
      token,
      user: toApiUser(user),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Failed to refresh session", details: error.message });
  } finally {
    client.release();
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    await ensureAuthSessionsTable();
    const refreshToken = getRefreshTokenFromRequest(req);
    if (refreshToken) {
      let decoded = null;
      try {
        decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, { ignoreExpiration: true });
      } catch (_error) {
        decoded = jwt.decode(refreshToken);
      }
      await revokeSessionById(decoded?.sid || null);
    }
  } catch (error) {
    console.warn("Failed to revoke auth session on logout:", error.message);
  }

  clearRefreshTokenCookie(res);
  return res.json({ message: "Logout successful" });
});

app.post("/api/auth/logout-all", authenticateToken, async (req, res) => {
  try {
    await ensureAuthSessionsTable();
    await revokeUserSessions(req.authUser.id);
    clearRefreshTokenCookie(res);
    return res.json({ message: "Logged out from all sessions" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to logout from all sessions", details: error.message });
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    await ensurePasswordResetTokensTable();

    const emailLower = String(email).trim().toLowerCase();
    const userResult = await query("SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)", [emailLower]);
    if (userResult.rowCount === 0) {
      return res.json({
        message: "If the account exists, a reset link has been generated",
      });
    }

    const userId = userResult.rows[0].user_id;
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at, used)
       VALUES ($1, $2, $3, false)`,
      [userId, token, expiresAt.toISOString()],
    );

    return res.json({
      message: "Reset token created",
      token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create reset token", details: error.message });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  const hasResetTokensTable = await tableExists("password_reset_tokens");
  if (!hasResetTokensTable && !(await ensurePasswordResetTokensTable())) {
    return res.status(501).json({
      error: "Password reset is not configured for the current database schema",
    });
  }

  const client = await pool.connect();
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and newPassword are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const resetTokenPkColumn = await getPasswordResetPrimaryKeyColumn(client);
    if (!resetTokenPkColumn) {
      return res.status(501).json({
        error: "Password reset token primary key is not compatible with this schema",
      });
    }

    await client.query("BEGIN");
    const tokenResult = await client.query(
      `SELECT ${resetTokenPkColumn} AS token_pk, user_id, used, expires_at
       FROM password_reset_tokens
       WHERE token = $1
       FOR UPDATE`,
      [token],
    );

    if (tokenResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Invalid token" });
    }

    const tokenRow = tokenResult.rows[0];
    if (tokenRow.used) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Token already used" });
    }

    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Token expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await client.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2", [
      hashedPassword,
      tokenRow.user_id,
    ]);

    await client.query(`UPDATE password_reset_tokens SET used = true WHERE ${resetTokenPkColumn} = $1`, [
      tokenRow.token_pk,
    ]);

    if (await tableExistsInClient(client, "user_session")) {
      await revokeUserSessions(tokenRow.user_id, client);
    }
    await client.query("COMMIT");

    clearRefreshTokenCookie(res);
    return res.json({ message: "Password reset successful" });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Password reset failed", details: error.message });
  } finally {
    client.release();
  }
});

app.get("/api/users/me/profile-photo", authenticateToken, async (req, res) => {
  try {
    await ensureUserProfilePhotosTable();
    const result = await query(
      `SELECT image_data, updated_at
       FROM user_profile_photos
       WHERE user_id = $1`,
      [req.authUser.id],
    );

    if (result.rowCount === 0) {
      return res.json({ photoUrl: null, updatedAt: null });
    }

    return res.json({
      photoUrl: result.rows[0].image_data,
      updatedAt: result.rows[0].updated_at,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch profile photo", details: error.message });
  }
});

app.post("/api/users/me/profile-photo", authenticateToken, async (req, res) => {
  try {
    const { imageDataUrl } = req.body || {};
    const parsed = parseProfilePhotoDataUrl(imageDataUrl);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    await ensureUserProfilePhotosTable();
    const saved = await query(
      `INSERT INTO user_profile_photos (user_id, image_data, mime_type, file_size, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id)
       DO UPDATE
       SET image_data = EXCLUDED.image_data,
           mime_type = EXCLUDED.mime_type,
           file_size = EXCLUDED.file_size,
           updated_at = NOW()
       RETURNING updated_at`,
      [req.authUser.id, parsed.dataUrl, parsed.mimeType, parsed.bytes],
    );

    return res.status(201).json({
      message: "Profile photo updated",
      photoUrl: parsed.dataUrl,
      updatedAt: saved.rows[0]?.updated_at || new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update profile photo", details: error.message });
  }
});

app.post("/api/contact/submit", optionalAuth, async (req, res) => {
  try {
    // Accept contact submissions from guests or logged-in users.
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "name, email, subject, and message are required" });
    }

    const inserted = await query(
      `INSERT INTO support_messages (user_id, name, email, subject, message, status)
       VALUES ($1, $2, $3, $4, $5, 'OPEN')
       RETURNING support_id, status, created_at`,
      // If logged in, link message to the authenticated user id.
      [req.authUser?.id || null, name, email, subject, message],
    );

    const forwardResult = await forwardSupportMessageToWeb3Forms({
      name,
      email,
      subject,
      message,
    });
    if (!forwardResult.forwarded && !forwardResult.skipped) {
      console.warn("Web3Forms forwarding failed:", forwardResult.reason);
    }

    return res.status(201).json({
      message: "Support message submitted",
      support: inserted.rows[0],
      delivery: {
        web3formsForwarded: forwardResult.forwarded,
        warning: forwardResult.forwarded ? null : forwardResult.reason,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to submit support message", details: error.message });
  }
});

app.post("/api/assessments/analyze", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    // User identity comes from JWT, never from client-provided payload.
    const { questionnaireData = {}, imageBase64 = null, weather = null } = req.body || {};
    const userId = req.authUser.id;
    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required" });
    }

    const requestedQuestionnaireData = isNonEmptyPlainObject(questionnaireData) ? questionnaireData : {};
    let resolvedQuestionnaireData = requestedQuestionnaireData;
    let questionnaireSource = "request";

    if (!isNonEmptyPlainObject(resolvedQuestionnaireData)) {
      const previousQuestionnaireData = await getLatestQuestionnaireDataForUser(userId, client);
      if (isNonEmptyPlainObject(previousQuestionnaireData)) {
        resolvedQuestionnaireData = previousQuestionnaireData;
        questionnaireSource = "previous_assessment";
      } else {
        resolvedQuestionnaireData = {};
        questionnaireSource = "none";
      }
    }

    // Start from questionnaire-based insights, then enrich with AI image analysis if available.
    const questionnaireSkinType = determineSkinType(resolvedQuestionnaireData);
    const questionnaireConditions = buildDetectedConditions(resolvedQuestionnaireData, questionnaireSkinType);
    const imageInsights = await analyzeImageWithAI(imageBase64, resolvedQuestionnaireData);

    const skinType = resolveFinalSkinType(
      questionnaireSkinType,
      imageInsights?.skinType || null,
      imageInsights?.confidence ?? null,
    );
    const conditions = mergeConditions(questionnaireConditions, imageInsights?.conditions || []);
    const recommendations = buildRecommendations(skinType, conditions);
    const overallScore = calculateOverallScore(conditions);
    const analysisConfidence = computeAnalysisConfidence(conditions, imageInsights?.confidence ?? null);
    const imageAnalysisUsed = Boolean(
      imageInsights && (imageInsights.skinType || imageInsights.summary || imageInsights.conditions.length > 0),
    );

    await client.query("BEGIN");
    const assessmentNotes = JSON.stringify({
      skinType,
      questionnaireData: resolvedQuestionnaireData,
      questionnaireSource,
      hasImage: Boolean(imageBase64),
      imageAnalysis: {
        used: imageAnalysisUsed,
        provider: imageInsights?.provider || null,
        summary: imageInsights?.summary || null,
        confidence: imageInsights?.confidence ?? null,
      },
    });

    const assessmentResult = await client.query(
      `INSERT INTO skin_assessments (user_id, status, notes, overall_score)
       VALUES ($1, 'COMPLETED', $2, $3)
       RETURNING assessment_id, assessment_date, overall_score`,
      [userId, assessmentNotes, overallScore],
    );
    const assessment = assessmentResult.rows[0];
    await persistQuestionnaireAnswers(client, assessment.assessment_id, resolvedQuestionnaireData);
    await persistSkinImage(client, assessment.assessment_id, userId, imageBase64);

    const summaryParts = [`Detected ${conditions.length} condition(s) for ${skinType} skin.`];
    if (imageAnalysisUsed && imageInsights?.summary) {
      summaryParts.push(`Image insight: ${imageInsights.summary}`);
    } else if (imageBase64 && !imageAnalysisUsed) {
      summaryParts.push("Image provided but AI image analysis was unavailable.");
    }
    const summary = summaryParts.join(" ");

    let modelName = "rule-based-skin-analyzer";
    let modelVersion = "1.0.0";
    if (imageAnalysisUsed && imageInsights?.provider === "openai") {
      modelName = "openai-vision";
      modelVersion = OPENAI_VISION_MODEL;
    } else if (imageAnalysisUsed && imageInsights?.provider === "endpoint") {
      modelName = "external-image-analyzer";
      modelVersion = "endpoint";
    }

    const analysisResult = await client.query(
      `INSERT INTO ai_analyses (assessment_id, model_name, model_version, summary, confidence_score, analysis_status)
       VALUES ($1, $2, $3, $4, $5, 'SUCCESS')
       RETURNING analysis_id`,
      [assessment.assessment_id, modelName, modelVersion, summary, analysisConfidence],
    );
    const analysisId = analysisResult.rows[0].analysis_id;

    for (const condition of conditions) {
      const conditionIdResult = await client.query(
        `INSERT INTO skin_conditions (condition_name, description)
         VALUES ($1, $2)
         ON CONFLICT (condition_name) DO UPDATE SET description = COALESCE(skin_conditions.description, EXCLUDED.description)
         RETURNING condition_id`,
        [condition.name, condition.description],
      );
      const conditionId = conditionIdResult.rows[0].condition_id;

      await client.query(
        `INSERT INTO ai_detected_conditions (analysis_id, condition_id, severity_level, confidence_score, detected_area, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [analysisId, conditionId, condition.severity, condition.confidence, condition.area, condition.description],
      );
    }

    for (const recommendation of recommendations) {
      await client.query(
        `INSERT INTO recommendations (assessment_id, analysis_id, recommendation_type, title, details, priority_level)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          assessment.assessment_id,
          analysisId,
          String(recommendation.type || "").toLowerCase(),
          recommendation.title,
          recommendation.details,
          recommendation.priority ? String(recommendation.priority).toLowerCase() : null,
        ],
      );
    }

    if (weather && typeof weather === "object") {
      await client.query(
        `INSERT INTO weather_logs (assessment_id, city, country, temperature, humidity, uv_index, weather_condition)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          assessment.assessment_id,
          weather.city || null,
          weather.country || null,
          weather.temperature ?? null,
          weather.humidity ?? null,
          weather.uvIndex ?? null,
          weather.condition || null,
        ],
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Analysis completed",
      assessmentId: assessment.assessment_id,
      result: {
        skinType,
        score: Number(assessment.overall_score),
        conditions: conditions.map((condition) => ({
          name: condition.name,
          severity: condition.severity,
          description: condition.description,
        })),
        recommendations: recommendations.map((recommendation) => recommendation.details),
        analysisMeta: {
          imageProvided: Boolean(imageBase64),
          imageAnalysisUsed,
          imageProvider: imageInsights?.provider || null,
          confidence: analysisConfidence,
          questionnaireSource,
        },
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Failed to run analysis", details: error.message });
  } finally {
    client.release();
  }
});

app.get("/api/assessments/history", authenticateToken, async (req, res) => {
  try {
    // Load only the authenticated user's own assessment history.
    const userId = req.authUser.id;

    const assessmentsResult = await query(
      `SELECT assessment_id, assessment_date, overall_score, notes
       FROM skin_assessments
       WHERE user_id = $1
       ORDER BY assessment_date DESC`,
      [userId],
    );

    const history = [];
    for (const assessment of assessmentsResult.rows) {
      const conditionsResult = await query(
        `SELECT sc.condition_name, dc.severity_level, COALESCE(dc.notes, '') AS notes
         FROM ai_analyses aa
         JOIN ai_detected_conditions dc ON dc.analysis_id = aa.analysis_id
         JOIN skin_conditions sc ON sc.condition_id = dc.condition_id
         WHERE aa.assessment_id = $1
         ORDER BY sc.condition_name`,
        [assessment.assessment_id],
      );

      const recommendationsResult = await query(
        `SELECT details
         FROM recommendations
         WHERE assessment_id = $1
         ORDER BY created_at`,
        [assessment.assessment_id],
      );

      const skinType = parseSkinTypeFromAssessmentNotes(assessment.notes);

      history.push({
        id: assessment.assessment_id,
        date: assessment.assessment_date,
        score: Number(assessment.overall_score || 0),
        skinType,
        conditions: conditionsResult.rows.map((row) => ({
          name: row.condition_name,
          severity: (row.severity_level || "mild").toLowerCase(),
          description: row.notes || "",
        })),
        recommendations: recommendationsResult.rows.map((row) => row.details),
      });
    }

    return res.json({ history });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch assessment history", details: error.message });
  }
});

app.get("/api/assessments/weekly-progress", authenticateToken, async (req, res) => {
  try {
    // Build weekly progress strictly from authenticated user's own assessments.
    const userId = req.authUser.id;
    let assessmentsResult;
    try {
      assessmentsResult = await query(
        `SELECT sa.assessment_id,
                sa.assessment_date,
                sa.overall_score,
                sa.notes,
                COALESCE(condition_rollup.condition_count, 0)::int AS condition_count,
                COALESCE(condition_rollup.condition_burden, 0)::int AS condition_burden
         FROM skin_assessments sa
         LEFT JOIN LATERAL (
           SELECT COUNT(*)::int AS condition_count,
                  COALESCE(
                    SUM(
                      CASE LOWER(dc.severity_level)
                        WHEN 'severe' THEN 3
                        WHEN 'moderate' THEN 2
                        ELSE 1
                      END
                    ),
                    0
                  )::int AS condition_burden
           FROM ai_analyses aa
           JOIN ai_detected_conditions dc ON dc.analysis_id = aa.analysis_id
           WHERE aa.assessment_id = sa.assessment_id
         ) condition_rollup ON TRUE
         WHERE sa.user_id = $1
         ORDER BY sa.assessment_date DESC`,
        [userId],
      );
    } catch (rollupError) {
      // Keep weekly tracking available even if some analysis tables/columns differ in legacy DBs.
      console.warn("[weekly-progress] condition rollup unavailable, using fallback:", rollupError.message);
      assessmentsResult = await query(
        `SELECT sa.assessment_id,
                sa.assessment_date,
                sa.overall_score,
                sa.notes,
                0::int AS condition_count,
                0::int AS condition_burden
         FROM skin_assessments sa
         WHERE sa.user_id = $1
         ORDER BY sa.assessment_date DESC`,
        [userId],
      );
    }

    const assessments = assessmentsResult.rows.map((row) => ({
      id: row.assessment_id,
      date: row.assessment_date,
      score: Number(row.overall_score || 0),
      skinType: parseSkinTypeFromAssessmentNotes(row.notes),
      conditionCount: Number(row.condition_count || 0),
      conditionBurden: Number(row.condition_burden || 0),
    }));

    const weeklyProgress = buildWeeklyProgressPayload(assessments);
    return res.json(weeklyProgress);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch weekly progress", details: error.message });
  }
});

app.post("/api/chat/message", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    // Persist user message and generated AI reply in one transaction.
    const { message, conversationId = null } = req.body || {};
    const userId = req.authUser.id;
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    await client.query("BEGIN");

    let activeConversationId = conversationId;
    if (activeConversationId) {
      const existing = await client.query(
        `SELECT conversation_id
         FROM ai_chat_conversations
         WHERE conversation_id = $1 AND user_id = $2`,
        [activeConversationId, userId],
      );
      if (existing.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Conversation not found" });
      }
    } else {
      const conversation = await client.query(
        `INSERT INTO ai_chat_conversations (user_id, title)
         VALUES ($1, $2)
         RETURNING conversation_id`,
        [userId, String(message).slice(0, 60)],
      );
      activeConversationId = conversation.rows[0].conversation_id;
    }

    const userMessageInsert = await client.query(
      `INSERT INTO ai_chat_messages (conversation_id, sender_type, message_text)
       VALUES ($1, 'USER', $2)
       RETURNING message_id, sender_type, message_text, created_at`,
      [activeConversationId, message],
    );

    const assessmentContext = await getLatestAssessmentContextForUser(userId, client);
    const aiReply = buildChatResponse(message, assessmentContext);
    const aiMessageInsert = await client.query(
      `INSERT INTO ai_chat_messages (conversation_id, sender_type, message_text)
       VALUES ($1, 'AI', $2)
       RETURNING message_id, sender_type, message_text, created_at`,
      [activeConversationId, aiReply],
    );

    await client.query(
      `UPDATE ai_chat_conversations
       SET updated_at = NOW()
       WHERE conversation_id = $1`,
      [activeConversationId],
    );

    await client.query("COMMIT");

    return res.status(201).json({
      conversationId: activeConversationId,
      userMessage: userMessageInsert.rows[0],
      aiMessage: aiMessageInsert.rows[0],
      assessmentContext,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Failed to send chat message", details: error.message });
  } finally {
    client.release();
  }
});

app.get("/api/chat/context", authenticateToken, async (req, res) => {
  try {
    const userId = req.authUser.id;
    const assessmentContext = await getLatestAssessmentContextForUser(userId);
    return res.json({ assessmentContext });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load chat assessment context", details: error.message });
  }
});

app.get("/api/chat/messages", authenticateToken, async (req, res) => {
  try {
    // Return chat history scoped to the authenticated user.
    const { conversationId = null } = req.query;
    const userId = req.authUser.id;

    let activeConversationId = conversationId;
    if (!activeConversationId) {
      // If conversation is not specified, return the latest conversation for this user.
      const latest = await query(
        `SELECT conversation_id
         FROM ai_chat_conversations
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT 1`,
        [userId],
      );
      if (latest.rowCount === 0) {
        return res.json({ conversationId: null, messages: [] });
      }
      activeConversationId = latest.rows[0].conversation_id;
    } else {
      // Prevent reading another user's conversation by enforcing ownership check.
      const existing = await query(
        `SELECT conversation_id
         FROM ai_chat_conversations
         WHERE conversation_id = $1 AND user_id = $2`,
        [activeConversationId, userId],
      );
      if (existing.rowCount === 0) {
        return res.status(404).json({ error: "Conversation not found" });
      }
    }

    const messagesResult = await query(
      `SELECT message_id, sender_type, message_text, created_at
       FROM ai_chat_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [activeConversationId],
    );

    return res.json({
      conversationId: activeConversationId,
      messages: messagesResult.rows,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch chat messages", details: error.message });
  }
});

app.use("/api/admin", authenticateToken, requireAdmin);

app.get("/api/admin/overview", async (_req, res) => {
  try {
    const [totalUsers, activeUsers, assessmentsToday, openSupport] = await Promise.all([
      query(`SELECT COUNT(*)::int AS count FROM users`),
      query(`SELECT COUNT(*)::int AS count FROM users WHERE COALESCE(is_active, true) = true AND COALESCE(is_banned, false) = false`),
      query(`SELECT COUNT(*)::int AS count FROM skin_assessments WHERE assessment_date::date = CURRENT_DATE`),
      query(`SELECT COUNT(*)::int AS count FROM support_messages WHERE COALESCE(status, 'OPEN') = 'OPEN'`),
    ]);

    const recentUsers = await query(
      `SELECT u.user_id, u.full_name, u.email, u.created_at, u.updated_at, u.is_active, u.is_banned,
              COALESCE(COUNT(sa.assessment_id), 0)::int AS assessments
       FROM users u
       LEFT JOIN skin_assessments sa ON sa.user_id = u.user_id
       GROUP BY u.user_id
       ORDER BY u.created_at DESC
       LIMIT 5`,
    );

    return res.json({
      stats: {
        totalUsers: totalUsers.rows[0].count,
        activeUsers: activeUsers.rows[0].count,
        assessmentsToday: assessmentsToday.rows[0].count,
        openSupportMessages: openSupport.rows[0].count,
      },
      recentUsers: recentUsers.rows.map((row) => ({
        id: row.user_id,
        name: row.full_name,
        email: row.email,
        status: row.is_banned ? "banned" : row.is_active === false ? "inactive" : "active",
        joinedAt: row.created_at,
        assessments: row.assessments,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch admin overview", details: error.message });
  }
});

app.get("/api/admin/users", async (_req, res) => {
  try {
    const result = await query(
      `SELECT u.user_id, u.full_name, u.email, u.created_at, u.updated_at, u.is_active, u.is_banned,
              COALESCE(LOWER(r.role_name), 'user') AS role_name,
              COALESCE(COUNT(sa.assessment_id), 0)::int AS assessments
       FROM users u
       LEFT JOIN roles r ON r.role_id = u.role_id
       LEFT JOIN skin_assessments sa ON sa.user_id = u.user_id
       GROUP BY u.user_id, r.role_name
       ORDER BY u.created_at DESC`,
    );

    return res.json({
      users: result.rows.map((row) => ({
        id: row.user_id,
        name: row.full_name,
        email: row.email,
        role: row.role_name,
        status: row.is_banned ? "banned" : row.is_active === false ? "inactive" : "active",
        joinedAt: row.created_at,
        lastLogin: row.updated_at,
        assessments: row.assessments,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch admin users", details: error.message });
  }
});

app.put("/api/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, status } = req.body || {};
    if (!name || !email || !role || !status) {
      return res.status(400).json({ error: "name, email, role, and status are required" });
    }

    const roleId = await ensureRoleId(role);
    const statusFlags = normalizeUserStatus(status);
    const updated = await query(
      `UPDATE users
       SET full_name = $1, email = $2, role_id = $3, is_active = $4, is_banned = $5, updated_at = NOW()
       WHERE user_id = $6
       RETURNING user_id`,
      [name, String(email).toLowerCase(), roleId, statusFlags.is_active, statusFlags.is_banned, id],
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ message: "User updated successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update user", details: error.message });
  }
});

app.put("/api/admin/users/:id/ban", async (req, res) => {
  try {
    const { id } = req.params;
    const { banned } = req.body || {};
    const updated = await query(
      `UPDATE users
       SET is_banned = $1, is_active = $2, updated_at = NOW()
       WHERE user_id = $3
       RETURNING user_id`,
      [Boolean(banned), !Boolean(banned), id],
    );
    if (updated.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ message: banned ? "User banned" : "User unbanned" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update user ban status", details: error.message });
  }
});

app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await query(`DELETE FROM users WHERE user_id = $1 RETURNING user_id`, [id]);
    if (deleted.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete user", details: error.message });
  }
});

app.get("/api/admin/support-messages", async (req, res) => {
  try {
    const normalizedStatus = req.query.status ? normalizeSupportStatus(req.query.status) : null;
    const messageType = normalizeSupportMessageType(req.query.type);
    const parsedLimit = Number.parseInt(String(req.query.limit || "100"), 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : 100;

    const result = await query(
      `SELECT support_id, user_id, name, email, subject, message, status, created_at
       FROM support_messages
       WHERE ($1::text IS NULL OR COALESCE(status, 'OPEN') = $1)
         AND (
           $2::text = 'all'
           OR ($2::text = 'feedback' AND COALESCE(subject, '') ILIKE 'Client Feedback (%')
           OR ($2::text = 'contact' AND COALESCE(subject, '') NOT ILIKE 'Client Feedback (%')
         )
       ORDER BY created_at DESC
       LIMIT $3`,
      [normalizedStatus, messageType, limit],
    );

    return res.json({
      messages: result.rows.map((row) => {
        const isFeedback = /^client feedback \(/i.test(String(row.subject || "").trim());
        return {
          id: row.support_id,
          userId: row.user_id,
          name: row.name,
          email: row.email,
          subject: row.subject,
          message: row.message,
          status: String(row.status || "OPEN").toLowerCase(),
          type: isFeedback ? "feedback" : "contact",
          createdAt: row.created_at,
        };
      }),
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch support messages", details: error.message });
  }
});

app.put("/api/admin/support-messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    const nextStatus = normalizeSupportStatus(status);
    const updated = await query(
      `UPDATE support_messages
       SET status = $1
       WHERE support_id = $2
       RETURNING support_id, status`,
      [nextStatus, id],
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ error: "Support message not found" });
    }

    return res.json({
      message: "Support message updated",
      support: {
        id: updated.rows[0].support_id,
        status: String(updated.rows[0].status || "OPEN").toLowerCase(),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update support message", details: error.message });
  }
});

app.get("/api/admin/analytics", async (_req, res) => {
  try {
    const [hasUsersTable, hasAssessmentsTable, hasDetectedConditionsTable, hasSkinConditionsTable] = await Promise.all([
      tableExists("users"),
      tableExists("skin_assessments"),
      tableExists("ai_detected_conditions"),
      tableExists("skin_conditions"),
    ]);

    const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });
    const monthStarts = [];
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);
    currentMonthStart.setMonth(currentMonthStart.getMonth() - 5);
    for (let i = 0; i < 6; i += 1) {
      const monthStart = new Date(currentMonthStart);
      monthStart.setMonth(currentMonthStart.getMonth() + i);
      monthStarts.push(monthStart);
    }

    let userGrowthData = monthStarts.map((monthStart) => ({
      month: monthFormatter.format(monthStart),
      users: 0,
    }));
    if (hasUsersTable) {
      const userGrowth = await query(
        `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month_key,
                COUNT(*)::int AS users
         FROM users
         WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
         GROUP BY 1`,
      );
      const growthMap = new Map(userGrowth.rows.map((row) => [row.month_key, Number(row.users || 0)]));
      userGrowthData = monthStarts.map((monthStart) => {
        const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
        return {
          month: monthFormatter.format(monthStart),
          users: growthMap.get(monthKey) || 0,
        };
      });
    }

    const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
    const days = [];
    const startDay = new Date();
    startDay.setHours(0, 0, 0, 0);
    startDay.setDate(startDay.getDate() - 6);
    for (let i = 0; i < 7; i += 1) {
      const nextDay = new Date(startDay);
      nextDay.setDate(startDay.getDate() + i);
      days.push(nextDay);
    }

    let assessmentData = days.map((dayDate) => ({
      day: weekdayFormatter.format(dayDate),
      assessments: 0,
    }));
    if (hasAssessmentsTable) {
      const dailyAssessments = await query(
        `SELECT to_char(assessment_date::date, 'YYYY-MM-DD') AS day_key,
                COUNT(*)::int AS assessments
         FROM skin_assessments
         WHERE assessment_date::date >= CURRENT_DATE - INTERVAL '6 days'
         GROUP BY 1`,
      );
      const assessmentMap = new Map(dailyAssessments.rows.map((row) => [row.day_key, Number(row.assessments || 0)]));
      assessmentData = days.map((dayDate) => {
        const dayKey = [
          dayDate.getFullYear(),
          String(dayDate.getMonth() + 1).padStart(2, "0"),
          String(dayDate.getDate()).padStart(2, "0"),
        ].join("-");
        return {
          day: weekdayFormatter.format(dayDate),
          assessments: assessmentMap.get(dayKey) || 0,
        };
      });
    }

    let conditionData = [];
    if (hasDetectedConditionsTable && hasSkinConditionsTable) {
      const conditionDistribution = await query(
        `SELECT sc.condition_name AS name, COUNT(*)::int AS value
         FROM ai_detected_conditions dc
         JOIN skin_conditions sc ON sc.condition_id = dc.condition_id
         GROUP BY sc.condition_name
         ORDER BY COUNT(*) DESC
         LIMIT 6`,
      );
      conditionData = conditionDistribution.rows;
    }

    const skinTypeRows =
      hasAssessmentsTable && (await columnExists("skin_assessments", "notes"))
        ? await query(`SELECT notes FROM skin_assessments WHERE notes IS NOT NULL`)
        : { rows: [] };
    const skinTypeMap = new Map();
    for (const row of skinTypeRows.rows) {
      try {
        const parsed = typeof row.notes === "string" ? JSON.parse(row.notes) : row.notes;
        const skinType = parsed?.skinType || parsed?.skin_type || "Unknown";
        skinTypeMap.set(skinType, (skinTypeMap.get(skinType) || 0) + 1);
      } catch (_error) {
        // ignore malformed notes
      }
    }
    const skinTypeData = [...skinTypeMap.entries()].map(([name, value]) => ({ name, value }));

    const [totalAssessments, activeUsers7d, totalUsers] = await Promise.all([
      hasAssessmentsTable ? query(`SELECT COUNT(*)::int AS count FROM skin_assessments`) : Promise.resolve({ rows: [{ count: 0 }] }),
      hasUsersTable
        ? query(
            `SELECT COUNT(*)::int AS count
             FROM users
             WHERE updated_at >= NOW() - INTERVAL '7 days'`,
          )
        : Promise.resolve({ rows: [{ count: 0 }] }),
      hasUsersTable ? query(`SELECT COUNT(*)::int AS count FROM users`) : Promise.resolve({ rows: [{ count: 0 }] }),
    ]);

    return res.json({
      stats: {
        totalAssessments: totalAssessments.rows[0].count,
        activeUsers7d: activeUsers7d.rows[0].count,
        totalUsers: totalUsers.rows[0].count,
      },
      userGrowthData,
      assessmentData,
      skinTypeData,
      conditionData,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch analytics", details: error.message });
  }
});

const ADMIN_REPORT_DEFINITIONS = {
  "user-activity": {
    name: "User Activity Report",
    type: "Activity",
    description: "Comprehensive user engagement and activity metrics",
  },
  "assessment-summary": {
    name: "Assessment Summary",
    type: "Analytics",
    description: "Detailed analysis of skin assessments and results",
  },
  "skin-conditions": {
    name: "Skin Conditions Analysis",
    type: "Medical",
    description: "Distribution and trends of detected skin conditions",
  },
  engagement: {
    name: "Engagement Metrics",
    type: "Engagement",
    description: "Session and conversation interaction trends",
  },
};

function normalizeReportType(reportType) {
  const normalized = String(reportType || "").trim().toLowerCase();
  return ADMIN_REPORT_DEFINITIONS[normalized] ? normalized : null;
}

function normalizeReportFormat(format) {
  const normalized = String(format || "json").trim().toLowerCase();
  if (normalized === "json" || normalized === "csv" || normalized === "excel" || normalized === "pdf") {
    return normalized;
  }
  return null;
}

function parseReportDateRange(dateFrom, dateTo) {
  const normalizedFrom = dateFrom ? String(dateFrom).trim() : null;
  const normalizedTo = dateTo ? String(dateTo).trim() : null;

  if (normalizedFrom && Number.isNaN(Date.parse(normalizedFrom))) {
    return { error: "dateFrom must be a valid date" };
  }
  if (normalizedTo && Number.isNaN(Date.parse(normalizedTo))) {
    return { error: "dateTo must be a valid date" };
  }
  if (normalizedFrom && normalizedTo && new Date(normalizedFrom) > new Date(normalizedTo)) {
    return { error: "dateFrom cannot be later than dateTo" };
  }

  return {
    error: null,
    dateFrom: normalizedFrom,
    dateTo: normalizedTo,
  };
}

function normalizeBoolean(value, fallback = true) {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  return fallback;
}

function parseSkinTypeFromAssessmentNotes(notes) {
  if (!notes) return "Unknown";
  try {
    const parsed = JSON.parse(notes);
    return parsed?.skinType || "Unknown";
  } catch (_error) {
    return "Unknown";
  }
}

function formatDateValue(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function rowsToCsv(rows) {
  if (!rows.length) {
    return "message\nNo records found\n";
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.map(escapeCsvValue).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsvValue(row[header])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function escapePdfText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildSimplePdfBuffer(lines) {
  const printableLines = [...(lines || [])];
  if (printableLines.length === 0) printableLines.push("No records found.");
  const limited = printableLines.slice(0, 45).map((line) => String(line).slice(0, 110));
  if (printableLines.length > 45) {
    limited.push(`... truncated ${printableLines.length - 45} line(s)`);
  }

  const commands = ["BT", "/F1 11 Tf", "50 760 Td"];
  limited.forEach((line, index) => {
    if (index > 0) commands.push("0 -14 Td");
    commands.push(`(${escapePdfText(line)}) Tj`);
  });
  commands.push("ET");
  const contentStream = commands.join("\n");
  const streamLength = Buffer.byteLength(contentStream, "utf8");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((objectText, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, "utf8");
    pdf += `${index + 1} 0 obj\n${objectText}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function toReportFileName(reportType, format) {
  const safeType = String(reportType || "report").replace(/[^a-z0-9-]+/gi, "_");
  const dateStamp = new Date().toISOString().slice(0, 10);
  const extension =
    format === "json" ? "json" : format === "csv" ? "csv" : format === "excel" ? "xls" : "pdf";
  return `${safeType}_${dateStamp}.${extension}`;
}

function toSizeLabel(bytes) {
  const safeBytes = Number.isFinite(bytes) ? Math.max(0, bytes) : 0;
  if (safeBytes === 0) return "1 KB";
  return `${Math.max(1, Math.ceil(safeBytes / 1024))} KB`;
}

async function buildAdminReportRows(reportType, dateFrom, dateTo) {
  const filterParams = [dateFrom, dateTo];

  if (reportType === "user-activity") {
    const result = await query(
      `SELECT u.user_id, u.full_name, u.email, u.created_at, u.is_active, u.is_banned,
              COALESCE(COUNT(DISTINCT sa.assessment_id), 0)::int AS assessments,
              COALESCE(COUNT(DISTINCT m.message_id), 0)::int AS messages
       FROM users u
       LEFT JOIN skin_assessments sa
              ON sa.user_id = u.user_id
             AND ($1::date IS NULL OR sa.assessment_date::date >= $1::date)
             AND ($2::date IS NULL OR sa.assessment_date::date <= $2::date)
       LEFT JOIN ai_chat_conversations c ON c.user_id = u.user_id
       LEFT JOIN ai_chat_messages m
              ON m.conversation_id = c.conversation_id
             AND ($1::date IS NULL OR m.created_at::date >= $1::date)
             AND ($2::date IS NULL OR m.created_at::date <= $2::date)
       GROUP BY u.user_id, u.full_name, u.email, u.created_at, u.is_active, u.is_banned
       ORDER BY u.created_at DESC
       LIMIT 1000`,
      filterParams,
    );

    return result.rows.map((row) => ({
      userId: row.user_id,
      name: row.full_name,
      email: row.email,
      joinedAt: formatDateValue(row.created_at),
      status: row.is_banned ? "banned" : row.is_active === false ? "inactive" : "active",
      assessments: Number(row.assessments || 0),
      chatMessages: Number(row.messages || 0),
    }));
  }

  if (reportType === "assessment-summary") {
    const result = await query(
      `SELECT sa.assessment_id, sa.assessment_date, sa.status, sa.overall_score, sa.notes,
              u.user_id, u.full_name, u.email
       FROM skin_assessments sa
       JOIN users u ON u.user_id = sa.user_id
       WHERE ($1::date IS NULL OR sa.assessment_date::date >= $1::date)
         AND ($2::date IS NULL OR sa.assessment_date::date <= $2::date)
       ORDER BY sa.assessment_date DESC
       LIMIT 2000`,
      filterParams,
    );

    return result.rows.map((row) => ({
      assessmentId: row.assessment_id,
      userId: row.user_id,
      userName: row.full_name,
      email: row.email,
      assessmentDate: formatDateValue(row.assessment_date),
      status: row.status || "unknown",
      overallScore: Number(row.overall_score || 0),
      skinType: parseSkinTypeFromAssessmentNotes(row.notes),
    }));
  }

  if (reportType === "skin-conditions") {
    const result = await query(
      `SELECT sc.condition_name,
              COUNT(*)::int AS detections,
              ROUND(AVG(COALESCE(dc.confidence_score, 0))::numeric, 4) AS avg_confidence,
              MAX(sa.assessment_date) AS last_detected_at
       FROM ai_detected_conditions dc
       JOIN skin_conditions sc ON sc.condition_id = dc.condition_id
       JOIN ai_analyses aa ON aa.analysis_id = dc.analysis_id
       JOIN skin_assessments sa ON sa.assessment_id = aa.assessment_id
       WHERE ($1::date IS NULL OR sa.assessment_date::date >= $1::date)
         AND ($2::date IS NULL OR sa.assessment_date::date <= $2::date)
       GROUP BY sc.condition_name
       ORDER BY detections DESC, sc.condition_name
       LIMIT 1000`,
      filterParams,
    );

    return result.rows.map((row) => ({
      condition: row.condition_name,
      detections: Number(row.detections || 0),
      avgConfidence: Number(row.avg_confidence || 0),
      lastDetectedAt: formatDateValue(row.last_detected_at),
    }));
  }

  const result = await query(
    `SELECT c.conversation_id, u.user_id, u.full_name, u.email,
            COALESCE(COUNT(m.message_id), 0)::int AS messages,
            MIN(m.created_at) AS started_at,
            MAX(m.created_at) AS last_message_at
     FROM ai_chat_conversations c
     JOIN users u ON u.user_id = c.user_id
     LEFT JOIN ai_chat_messages m
            ON m.conversation_id = c.conversation_id
           AND ($1::date IS NULL OR m.created_at::date >= $1::date)
           AND ($2::date IS NULL OR m.created_at::date <= $2::date)
     WHERE ($1::date IS NULL OR c.created_at::date >= $1::date)
       AND ($2::date IS NULL OR c.created_at::date <= $2::date)
     GROUP BY c.conversation_id, u.user_id, u.full_name, u.email
     ORDER BY COALESCE(MAX(m.created_at), c.created_at) DESC
     LIMIT 2000`,
    filterParams,
  );

  return result.rows.map((row) => ({
    conversationId: row.conversation_id,
    userId: row.user_id,
    userName: row.full_name,
    email: row.email,
    messages: Number(row.messages || 0),
    startedAt: formatDateValue(row.started_at),
    lastMessageAt: formatDateValue(row.last_message_at),
  }));
}

function buildReportExportFile(reportType, format, rows, dateFrom, dateTo) {
  const definition = ADMIN_REPORT_DEFINITIONS[reportType] || { name: reportType };
  const generatedAt = new Date().toISOString();

  if (format === "json") {
    const payload = {
      reportType,
      reportName: definition.name,
      generatedAt,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      records: rows.length,
      data: rows,
    };
    const buffer = Buffer.from(JSON.stringify(payload, null, 2), "utf8");
    return {
      mimeType: "application/json; charset=utf-8",
      fileName: toReportFileName(reportType, format),
      buffer,
    };
  }

  if (format === "csv" || format === "excel") {
    const csv = rowsToCsv(rows);
    return {
      mimeType:
        format === "excel"
          ? "application/vnd.ms-excel; charset=utf-8"
          : "text/csv; charset=utf-8",
      fileName: toReportFileName(reportType, format),
      buffer: Buffer.from(csv, "utf8"),
    };
  }

  const lines = [
    `${definition.name || reportType}`,
    `Generated At: ${generatedAt}`,
    `Date Range: ${dateFrom || "all"} to ${dateTo || "all"}`,
    `Records: ${rows.length}`,
    "",
  ];
  const previewRows = rows.slice(0, 30);
  previewRows.forEach((row, index) => {
    lines.push(`${index + 1}. ${JSON.stringify(row)}`);
  });

  return {
    mimeType: "application/pdf",
    fileName: toReportFileName(reportType, format),
    buffer: buildSimplePdfBuffer(lines),
  };
}

app.get("/api/admin/reports/list", async (_req, res) => {
  try {
    const [usersCount, assessmentsCount, conditionsCount, messagesCount] = await Promise.all([
      query(`SELECT COUNT(*)::int AS count FROM users`),
      query(`SELECT COUNT(*)::int AS count FROM skin_assessments`),
      query(`SELECT COUNT(*)::int AS count FROM ai_detected_conditions`),
      query(`SELECT COUNT(*)::int AS count FROM ai_chat_messages`),
    ]);

    return res.json({
      reports: [
        {
          id: "user-activity",
          name: ADMIN_REPORT_DEFINITIONS["user-activity"].name,
          type: ADMIN_REPORT_DEFINITIONS["user-activity"].type,
          description: ADMIN_REPORT_DEFINITIONS["user-activity"].description,
          records: usersCount.rows[0].count,
        },
        {
          id: "assessment-summary",
          name: ADMIN_REPORT_DEFINITIONS["assessment-summary"].name,
          type: ADMIN_REPORT_DEFINITIONS["assessment-summary"].type,
          description: ADMIN_REPORT_DEFINITIONS["assessment-summary"].description,
          records: assessmentsCount.rows[0].count,
        },
        {
          id: "skin-conditions",
          name: ADMIN_REPORT_DEFINITIONS["skin-conditions"].name,
          type: ADMIN_REPORT_DEFINITIONS["skin-conditions"].type,
          description: ADMIN_REPORT_DEFINITIONS["skin-conditions"].description,
          records: conditionsCount.rows[0].count,
        },
        {
          id: "engagement",
          name: ADMIN_REPORT_DEFINITIONS.engagement.name,
          type: ADMIN_REPORT_DEFINITIONS.engagement.type,
          description: ADMIN_REPORT_DEFINITIONS.engagement.description,
          records: messagesCount.rows[0].count,
        },
      ],
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch reports list", details: error.message });
  }
});

app.get("/api/admin/reports/recent", async (_req, res) => {
  try {
    const result = await query(
      `SELECT report_id, report_type, created_at, notes
       FROM admin_reports
       ORDER BY created_at DESC
       LIMIT 10`,
    );

    return res.json({
      recent: result.rows.map((row) => {
        let notes = {};
        try {
          notes = row.notes ? JSON.parse(row.notes) : {};
        } catch (_error) {
          notes = {};
        }
        return {
          id: row.report_id,
          name: ADMIN_REPORT_DEFINITIONS[row.report_type]?.name || row.report_type,
          date: row.created_at,
          format: notes.format || "json",
          size: notes.size || "-",
        };
      }),
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch recent reports", details: error.message });
  }
});

app.post("/api/admin/reports/generate", async (req, res) => {
  try {
    // Attribute generated reports to the authenticated admin.
    const { reportType, dateFrom, dateTo, format = "json" } = req.body || {};
    const userId = req.authUser.id;
    const normalizedType = normalizeReportType(reportType);
    if (!normalizedType) {
      return res.status(400).json({ error: "reportType is invalid" });
    }
    const normalizedFormat = normalizeReportFormat(format);
    if (!normalizedFormat) {
      return res.status(400).json({ error: "format must be one of: json, csv, excel, pdf" });
    }

    const parsedDateRange = parseReportDateRange(dateFrom, dateTo);
    if (parsedDateRange.error) {
      return res.status(400).json({ error: parsedDateRange.error });
    }

    const rows = await buildAdminReportRows(normalizedType, parsedDateRange.dateFrom, parsedDateRange.dateTo);
    const file = buildReportExportFile(
      normalizedType,
      normalizedFormat,
      rows,
      parsedDateRange.dateFrom,
      parsedDateRange.dateTo,
    );
    const records = rows.length;

    const notes = JSON.stringify({
      dateFrom: parsedDateRange.dateFrom || null,
      dateTo: parsedDateRange.dateTo || null,
      format: normalizedFormat,
      records,
      size: toSizeLabel(file.buffer.length),
    });

    const inserted = await query(
      `INSERT INTO admin_reports (generated_by, report_type, notes)
       VALUES ($1, $2, $3)
       RETURNING report_id, report_type, created_at`,
      [userId, normalizedType, notes],
    );

    return res.status(201).json({
      message: "Report generated successfully",
      report: {
        id: inserted.rows[0].report_id,
        type: inserted.rows[0].report_type,
        createdAt: inserted.rows[0].created_at,
        records,
        format: normalizedFormat,
        size: toSizeLabel(file.buffer.length),
        preview: rows.slice(0, 5),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to generate report", details: error.message });
  }
});

app.post("/api/admin/reports/export", async (req, res) => {
  try {
    const { reportType, dateFrom, dateTo, format = "csv", audit = true } = req.body || {};
    const userId = req.authUser.id;
    const normalizedType = normalizeReportType(reportType);
    if (!normalizedType) {
      return res.status(400).json({ error: "reportType is invalid" });
    }
    const normalizedFormat = normalizeReportFormat(format);
    if (!normalizedFormat) {
      return res.status(400).json({ error: "format must be one of: json, csv, excel, pdf" });
    }

    const parsedDateRange = parseReportDateRange(dateFrom, dateTo);
    if (parsedDateRange.error) {
      return res.status(400).json({ error: parsedDateRange.error });
    }

    const rows = await buildAdminReportRows(normalizedType, parsedDateRange.dateFrom, parsedDateRange.dateTo);
    const file = buildReportExportFile(
      normalizedType,
      normalizedFormat,
      rows,
      parsedDateRange.dateFrom,
      parsedDateRange.dateTo,
    );

    if (normalizeBoolean(audit, true)) {
      const notes = JSON.stringify({
        dateFrom: parsedDateRange.dateFrom || null,
        dateTo: parsedDateRange.dateTo || null,
        format: normalizedFormat,
        records: rows.length,
        size: toSizeLabel(file.buffer.length),
        exported: true,
      });

      await query(
        `INSERT INTO admin_reports (generated_by, report_type, notes)
         VALUES ($1, $2, $3)`,
        [userId, normalizedType, notes],
      );
    }

    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
    res.setHeader("Content-Length", String(file.buffer.length));
    return res.status(200).send(file.buffer);
  } catch (error) {
    return res.status(500).json({ error: "Failed to export report", details: error.message });
  }
});

app.use((error, _req, res, _next) => {
  if (error?.type === "entity.too.large") {
    return res.status(413).json({
      error: "Request payload too large",
      details: `Payload exceeds server limit (${JSON_BODY_LIMIT}).`,
    });
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      error: "Malformed JSON payload",
      details: error.message,
    });
  }

  res.status(500).json({
    error: "Unexpected server error",
    details: error.message,
  });
});

const server = app.listen(PORT, async () => {
  try {
    await ensureAuthSessionsTable();
    const db = await checkDbConnection();
    console.log(`Backend listening on http://localhost:${PORT}`);
    console.log(`Connected to database "${db.database_name}" at ${db.connected_at}`);
  } catch (error) {
    console.error("Backend started, but database connection failed:", error.message);
  }
});

async function shutdown() {
  console.log("Shutting down backend...");
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
