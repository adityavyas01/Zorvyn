import logger from "./src/utils/logger.js";

const baseUrl = "http://localhost:3000";

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const rawBody = await response.text();

  let body = rawBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    // Keep plain text bodies as-is.
  }

  return {
    status: response.status,
    headers: {
      accessControlAllowOrigin: response.headers.get("access-control-allow-origin"),
    },
    body,
  };
};

const uniqueId = Date.now();
const email = `step12.${uniqueId}@example.com`;
const password = "Passw0rd!";

const report = {};

report.root = await request("/");

report.corsAllowed = await request("/", {
  headers: {
    Origin: "http://localhost:5173",
  },
});

report.corsBlocked = await request("/", {
  headers: {
    Origin: "http://attacker.example",
  },
});

report.register = await request("/auth/register", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "  Step Twelve User  ",
    email,
    password,
    "$where": "this.password && true",
    "profile.settings": "forbidden-key",
  }),
});

report.login = await request("/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email,
    password,
  }),
});

const token = report.login.body?.data?.token;
const authHeaders = token
  ? {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }
  : {
      "Content-Type": "application/json",
    };

report.createRecord = await request("/records", {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({
    amount: 56.75,
    type: "expense",
    category: "  Groceries  ",
    note: "  Milk and bread  ",
    "$set": { role: "Admin" },
  }),
});

report.listRecords = await request("/records?page=1&limit=20&$where=this.amount>0&createdBy.id=test", {
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});

report.statsSummary = await request("/stats/summary", {
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});

report.failedLoginStatuses = [];
for (let attempt = 1; attempt <= 6; attempt += 1) {
  const failedLogin = await request("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: `missing.${uniqueId}@example.com`,
      password: "wrong-password",
    }),
  });

  report.failedLoginStatuses.push(failedLogin.status);
}

const oversizedPassword = "x".repeat(1024 * 1024 + 1024);
report.payloadLimit = await request("/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "oversized@example.com",
    password: oversizedPassword,
  }),
});

const summary = {
  rootStatus: report.root.status,
  corsAllowedStatus: report.corsAllowed.status,
  corsAllowedHeader: report.corsAllowed.headers.accessControlAllowOrigin,
  corsBlockedStatus: report.corsBlocked.status,
  registerStatus: report.register.status,
  loginStatus: report.login.status,
  createRecordStatus: report.createRecord.status,
  listRecordsStatus: report.listRecords.status,
  statsSummaryStatus: report.statsSummary.status,
  failedLoginStatuses: report.failedLoginStatuses,
  payloadLimitStatus: report.payloadLimit.status,
  registeredName: report.register.body?.data?.user?.name,
  createdCategory: report.createRecord.body?.data?.record?.category,
  createdNote: report.createRecord.body?.data?.record?.note,
};

logger.info("Step 12 verification summary", {
  summary,
});
