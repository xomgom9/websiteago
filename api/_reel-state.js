const { ensureTables, getSql, sendJson } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  const videoId = String(req.query.videoId || "").trim();
  const clientId = String(req.query.clientId || "").trim();

  if (!videoId) {
    sendJson(res, 400, { error: "videoId is required." });
    return;
  }

  try {
    await ensureTables();
    const db = getSql();
    const comments = await db`
      SELECT id, author_name, body, created_at
      FROM reel_comments
      WHERE video_id = ${videoId}
      ORDER BY created_at DESC
      LIMIT 80
    `;
    const likeRows = await db`
      SELECT COUNT(*)::int AS count
      FROM reel_likes
      WHERE video_id = ${videoId}
    `;
    const likedRows = clientId
      ? await db`
          SELECT 1
          FROM reel_likes
          WHERE video_id = ${videoId}
            AND client_id = ${clientId}
          LIMIT 1
        `
      : [];

    sendJson(res, 200, {
      comments: comments.map((comment) => ({
        id: String(comment.id),
        name: comment.author_name,
        comment: comment.body,
        createdAt: comment.created_at,
      })),
      likeCount: likeRows[0]?.count || 0,
      liked: likedRows.length > 0,
    });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: error.message || "Server error." });
  }
};
