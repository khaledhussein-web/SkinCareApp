import { apiFetch, API_BASE_URL, refreshAuthSession } from "./api";

export async function submitContactMessage(payload) {
  // Send support/contact form data to backend.
  return apiFetch("/api/contact/submit", {
    method: "POST",
    body: payload,
  });
}

export async function submitFeedback(payload) {
  const safeRating = Number(payload?.rating);
  const ratingLabel = Number.isFinite(safeRating) && safeRating > 0 ? `${safeRating}/5` : "No rating";
  const categoryLabel = String(payload?.category || "General").trim();
  const subject = `Client Feedback (${ratingLabel}) - ${categoryLabel}`;

  const details = [
    `What worked well:\n${String(payload?.highlights || "Not provided").trim() || "Not provided"}`,
    `Feedback and notes:\n${String(payload?.notes || "Not provided").trim() || "Not provided"}`,
    `Suggested improvements:\n${String(payload?.suggestions || "Not provided").trim() || "Not provided"}`,
  ];

  return submitContactMessage({
    name: payload?.name,
    email: payload?.email,
    subject,
    message: details.join("\n\n"),
  });
}

export async function fetchUserProfilePhoto() {
  // Load authenticated user's profile photo if one exists.
  return apiFetch("/api/users/me/profile-photo");
}

export async function uploadUserProfilePhoto(imageDataUrl) {
  // Save authenticated user's profile photo.
  return apiFetch("/api/users/me/profile-photo", {
    method: "POST",
    body: { imageDataUrl },
  });
}

export async function runSkinAnalysis(payload) {
  // Run questionnaire + image analysis for the authenticated user.
  return apiFetch("/api/assessments/analyze", {
    method: "POST",
    body: payload,
  });
}

export async function fetchAssessmentHistory() {
  // Get assessment history for the authenticated user.
  return apiFetch("/api/assessments/history");
}

export async function fetchWeeklyProgress() {
  // Get weekly progress rollups (improved / no change / worse) for the authenticated user.
  return apiFetch("/api/assessments/weekly-progress");
}

export async function sendChatMessage(payload) {
  // Send one chat message and receive the AI response.
  return apiFetch("/api/chat/message", {
    method: "POST",
    body: payload,
  });
}

export async function fetchChatContext() {
  // Get the latest assessment context used to ground chat responses.
  return apiFetch("/api/chat/context");
}

export async function fetchChatMessages(conversationId = null) {
  // Load chat history, optionally for a specific conversation.
  const query = new URLSearchParams();
  if (conversationId) {
    query.set("conversationId", conversationId);
  }
  const queryString = query.toString();
  return apiFetch(queryString ? `/api/chat/messages?${queryString}` : "/api/chat/messages");
}

export async function fetchAdminOverview() {
  // Admin dashboard summary stats.
  return apiFetch("/api/admin/overview");
}

export async function fetchAdminUsers() {
  // Admin users table data.
  return apiFetch("/api/admin/users");
}

export async function updateAdminUser(userId, payload) {
  // Admin updates user profile, role, and status.
  return apiFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: payload,
  });
}

export async function setAdminUserBan(userId, banned) {
  // Admin toggles ban/unban status.
  return apiFetch(`/api/admin/users/${encodeURIComponent(userId)}/ban`, {
    method: "PUT",
    body: { banned },
  });
}

export async function deleteAdminUser(userId) {
  // Admin deletes a user account.
  return apiFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

export async function fetchAdminAnalytics() {
  // Admin analytics charts and aggregate metrics.
  return apiFetch("/api/admin/analytics");
}

export async function fetchAdminSupportMessages(params = {}) {
  const query = new URLSearchParams();
  if (params.status && params.status !== "all") {
    query.set("status", params.status);
  }
  if (params.type && params.type !== "all") {
    query.set("type", params.type);
  }
  if (params.limit) {
    query.set("limit", String(params.limit));
  }
  const queryString = query.toString();
  return apiFetch(queryString ? `/api/admin/support-messages?${queryString}` : "/api/admin/support-messages");
}

export async function updateAdminSupportMessage(messageId, payload) {
  return apiFetch(`/api/admin/support-messages/${encodeURIComponent(messageId)}`, {
    method: "PUT",
    body: payload,
  });
}

export async function fetchReportsList() {
  // Available report definitions.
  return apiFetch("/api/admin/reports/list");
}

export async function fetchRecentReports() {
  // Recent generated reports list.
  return apiFetch("/api/admin/reports/recent");
}

export async function generateReport(payload) {
  // Generate a new admin report using current filter options.
  return apiFetch("/api/admin/reports/generate", {
    method: "POST",
    body: payload,
  });
}

export async function exportReport(payload) {
  const sendExportRequest = async () => {
    const token = localStorage.getItem("auth_token");
    return fetch(`${API_BASE_URL}/api/admin/reports/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload || {}),
      credentials: "include",
    });
  };

  let response = await sendExportRequest();
  if (response.status === 401) {
    await refreshAuthSession();
    response = await sendExportRequest();
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Export endpoint not found (404). Restart backend with `cd backend && npm run dev`.");
    }
    const contentType = response.headers.get("content-type") || "";
    const payloadError = contentType.includes("application/json")
      ? await response.json()
      : { error: await response.text() };
    throw new Error(payloadError.error || payloadError.message || "Failed to export report");
  }

  const contentDisposition = response.headers.get("content-disposition") || "";
  const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/i);
  const format = String(payload?.format || "csv").toLowerCase();
  const extension = format === "json" ? "json" : format === "pdf" ? "pdf" : format === "excel" ? "xls" : "csv";
  const fileName = fileNameMatch?.[1] || `report_export.${extension}`;
  const blob = await response.blob();
  return { blob, fileName };
}

// ============================================================================
// PROGRESS TRACKING: Compare two photo dates with AI analysis
// ============================================================================

export async function compareProgressPhotos(assessmentId1, assessmentId2) {
  // Compare two assessments with AI-powered analysis.
  // Input: two assessment IDs
  // Output: comparison metrics, progress analysis, and AI narrative
  return apiFetch("/api/assessments/compare-progress", {
    method: "POST",
    body: {
      assessmentId1,
      assessmentId2,
    },
  });
}

export async function fetchAssessmentsWithImages() {
  // Get list of assessments that have images (for date picker).
  return apiFetch("/api/assessments/with-images");
}
