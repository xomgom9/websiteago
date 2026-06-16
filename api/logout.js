const { sendJson, setCookie } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  // Clear session cookie
  setCookie(res, "session_token", "", {
    maxAge: 0,
    path: "/",
    sameSite: "Lax",
    httpOnly: true
  });

  sendJson(res, 200, { ok: true });
};
