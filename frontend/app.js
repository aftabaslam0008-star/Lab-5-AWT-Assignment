// Determine API endpoint dynamically based on current origin
const API = (window.location.hostname === "localhost" && window.location.port === "5000")
  ? "/api/v1"
  : "http://localhost:5000/api/v1";

let accessToken = localStorage.getItem("accessToken") || "";
let refreshToken = localStorage.getItem("refreshToken") || "";

function show(id, data) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function updateSessionInfo() {
  const badge = document.getElementById("sessionStatus");
  const details = document.getElementById("sessionDetails");
  const userEl = document.getElementById("sessUser");
  const roleEl = document.getElementById("sessRole");
  const tenantEl = document.getElementById("sessTenant");

  if (!accessToken) {
    badge.textContent = "Not Logged In";
    badge.className = "badge badge-neutral";
    details.style.display = "none";
    return;
  }

  const payload = parseJwt(accessToken);
  if (payload) {
    badge.textContent = "Active Session";
    badge.className = "badge badge-success";
    details.style.display = "block";
    userEl.textContent = payload.sub || "Authenticated User";
    roleEl.textContent = payload.role || "Unknown";
    tenantEl.textContent = payload.tenantId || "N/A";
  } else {
    badge.textContent = "Token Present";
    badge.className = "badge badge-warning";
    details.style.display = "none";
  }
}

function switchAuthTab(tab) {
  const loginTab = document.getElementById("tabLogin");
  const regTab = document.getElementById("tabRegister");
  const btnLogin = document.getElementById("tabLoginBtn");
  const btnReg = document.getElementById("tabRegisterBtn");

  if (tab === "login") {
    loginTab.style.display = "block";
    regTab.style.display = "none";
    btnLogin.classList.add("active");
    btnReg.classList.remove("active");
  } else {
    loginTab.style.display = "none";
    regTab.style.display = "block";
    btnLogin.classList.remove("active");
    btnReg.classList.add("active");
  }
}

const DEMO_CREDENTIALS = {
  employee: { email: "employee@example.com", password: "Employee@123" },
  manager: { email: "manager@example.com", password: "Manager@123" },
  superadmin: { email: "superadmin@example.com", password: "SuperAdmin@123" }
};

async function quickLogin(roleKey) {
  const creds = DEMO_CREDENTIALS[roleKey];
  if (!creds) return;
  document.getElementById("email").value = creds.email;
  document.getElementById("password").value = creds.password;
  switchAuthTab("login");
  await login();
}

async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  try {
    const r = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password })
    });
    const data = await r.json();
    if (data.accessToken) {
      accessToken = data.accessToken;
      localStorage.setItem("accessToken", accessToken);
    }
    if (data.refreshToken) {
      refreshToken = data.refreshToken;
      localStorage.setItem("refreshToken", refreshToken);
    }
    show("output", data);
    updateSessionInfo();
  } catch (err) {
    show("output", { error: err.message });
  }
}

async function registerUser() {
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const role = document.getElementById("regRole").value;
  const tenantId = document.getElementById("regTenant").value.trim();

  try {
    const r = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password, role, tenantId })
    });
    const data = await r.json();
    if (data.accessToken) {
      accessToken = data.accessToken;
      localStorage.setItem("accessToken", accessToken);
    }
    if (data.refreshToken) {
      refreshToken = data.refreshToken;
      localStorage.setItem("refreshToken", refreshToken);
    }
    show("output", data);
    updateSessionInfo();
  } catch (err) {
    show("output", { error: err.message });
  }
}

function googleLogin() {
  window.location.href = `${API}/auth/google`;
}

async function call(path, options = {}) {
  options.headers = {
    ...options.headers,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };
  options.credentials = "include";

  try {
    const r = await fetch(`${API}${path}`, options);
    const data = await r.json();
    show("apiOutput", {
      status: r.status,
      statusText: r.statusText,
      data
    });
    return data;
  } catch (err) {
    show("apiOutput", { error: err.message });
  }
}

function profile() {
  call("/employee/profile");
}

function payroll() {
  call("/payroll/approve", { method: "POST", body: "{}" });
}

async function listTenantUsers() {
  const res = await call("/users");
  if (res && res.users && res.users.length > 0) {
    // Auto-fill the delete user ID with another user in the tenant if available
    const otherUser = res.users.find(u => u.email !== "superadmin@example.com");
    if (otherUser) {
      document.getElementById("deleteUserId").value = otherUser._id;
    }
  }
}

function deleteUser() {
  const userId = document.getElementById("deleteUserId").value.trim();
  if (!userId) {
    show("apiOutput", { error: "Please enter or paste a valid User ObjectId to delete." });
    return;
  }
  call(`/users/${userId}`, { method: "DELETE" });
}

async function refresh() {
  try {
    const r = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Refresh-Token": refreshToken
      },
      credentials: "include",
      body: JSON.stringify({ refreshToken })
    });
    const data = await r.json();
    if (data.accessToken) {
      accessToken = data.accessToken;
      localStorage.setItem("accessToken", accessToken);
    }
    if (data.refreshToken) {
      refreshToken = data.refreshToken;
      localStorage.setItem("refreshToken", refreshToken);
    }
    show("apiOutput", { status: r.status, data });
    updateSessionInfo();
  } catch (err) {
    show("apiOutput", { error: err.message });
  }
}

async function logout() {
  try {
    const r = await fetch(`${API}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Refresh-Token": refreshToken
      },
      credentials: "include",
      body: JSON.stringify({ refreshToken })
    });
    const data = await r.json();
    accessToken = "";
    refreshToken = "";
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    show("apiOutput", { status: r.status, data });
    updateSessionInfo();
  } catch (err) {
    show("apiOutput", { error: err.message });
  }
}

// Check for OAuth callback URL query parameters
(function init() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("accessToken")) {
    accessToken = params.get("accessToken");
    localStorage.setItem("accessToken", accessToken);
    window.history.replaceState({}, document.title, window.location.pathname);
    show("output", { message: "Google OAuth login successful", accessToken });
  }
  updateSessionInfo();
})();