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
    const clientId = String(body.clientId || "").trim().slice(0, 120);
    const liked = Boolean(body.liked);

    if (!videoId || !clientId) {
      sendJson(res, 400, { error: "videoId and clientId are required." });
      return;
    }

    await ensureTables();
    const db = getSql();

    if (liked) {
      await db`
        INSERT INTO reel_likes (video_id, client_id)
        VALUES (${videoId}, ${clientId})
        ON CONFLICT (video_id, client_id) DO NOTHING
      `;
    } else {
      await db`
        DELETE FROM reel_likes
        WHERE video_id = ${videoId}
          AND client_id = ${clientId}
      `;
    }

    const likeRows = await db`
      SELECT COUNT(*)::int AS count
      FROM reel_likes
      WHERE video_id = ${videoId}
    `;

    sendJson(res, 200, {
      liked,
      likeCount: likeRows[0]?.count || 0,
    });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: error.message || "Server error." });
  }
};
