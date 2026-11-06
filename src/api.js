export async function apiFetch(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Fetch a CSRF token for requests that modify data.
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrfResponse = await fetch("/api/csrf", {
      method: "GET",
      credentials: "same-origin",
    });

    if (!csrfResponse.ok) {
      throw new Error("Could not initialize secure request");
    }

    const { csrf_token } = await csrfResponse.json();
    headers.set("X-CSRFToken", csrf_token);
  }

  const response = await fetch(path, {
    ...options,
    method,
    headers,
    credentials: "same-origin",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("API error:", response.status, data);
    throw new Error(
      data.error || data.description || `Request failed (${response.status})`
    );
  }

  return data;
}