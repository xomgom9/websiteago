const { ensureTables, getSql, readBody, sendJson } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  try {
    const body = await readBody(req);
    const videoId = String(body.videoId || "").trim();
    const name = String(body.name || "Customer").trim().slice(0, 80);
    const comment = String(body.comment || "").trim().slice(0, 500);

    if (!videoId || !comment) {
      sendJson(res, 400, { error: "videoId and comment are required." });
      return;
    }

    await ensureTables();
    const db = getSql();
    const rows = await db`
      INSERT INTO reel_comments (video_id, author_name, body)
      VALUES (${videoId}, ${name || "Customer"}, ${comment})
      RETURNING id, author_name, body, created_at
    `;
    const saved = rows[0];

    sendJson(res, 201, {
      comment: {
        id: String(saved.id),
        name: saved.author_name,
        comment: saved.body,
        createdAt: saved.created_at,
      },
    });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: error.message || "Server error." });
  }
};
