const { sendJson, parseCookies, verifyToken } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies.session_token;

  const payload = verifyToken(token);
  if (!payload) {
    sendJson(res, 401, { error: "Unauthorized. Please log in." });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    user: {
      id: payload.userId,
      name: payload.name,
      email: payload.email,
      role: payload.role
    }
  });
};
