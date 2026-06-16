const { ensureTables, getSql, readBody, sendJson, verifyPassword, signToken, setCookie } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  try {
    await ensureTables();
    const body = await readBody(req);
    const emailOrPhone = String(body.email || body.phone || "").trim();
    const password = String(body.password || "");

    if (!emailOrPhone || !password) {
      sendJson(res, 400, { error: "Email/phone and password are required." });
      return;
    }

    const sql = getSql();
    const [user] = await sql`
      SELECT id, name, email, phone, password_hash, role, status
      FROM users
      WHERE email = ${emailOrPhone} OR phone = ${emailOrPhone}
      LIMIT 1
    `;

    if (!user || user.status !== "active") {
      sendJson(res, 401, { error: "Invalid credentials or account is suspended." });
      return;
    }

    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      sendJson(res, 401, { error: "Invalid credentials." });
      return;
    }

    // Generate token and set in cookie
    const token = signToken({
      userId: Number(user.id),
      name: user.name,
      email: user.email,
      role: user.role
    });

    setCookie(res, "session_token", token, {
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
      sameSite: "Lax",
      httpOnly: true
    });

    sendJson(res, 200, {
      ok: true,
      user: {
        id: Number(user.id),
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login API Error:", error);
    sendJson(res, 500, { error: "Server error during login." });
  }
};
