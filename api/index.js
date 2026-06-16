const url = require("url");

// Import all handlers (prefixed with underscore to prevent Vercel from deploying them separately)
const leadHandler = require("./_lead");
const loginHandler = require("./_login");
const logoutHandler = require("./_logout");
const meHandler = require("./_me");
const reelCommentsHandler = require("./_reel-comments");
const reelLikesHandler = require("./_reel-likes");
const reelStateHandler = require("./_reel-state");
const trackingClickHandler = require("./_tracking-click");
const trackingInteractionHandler = require("./_tracking-interaction");

// Admin handlers
const adminDashboardHandler = require("./admin/_dashboard");
const adminLeadsHandler = require("./admin/_leads");
const adminSalesHandler = require("./admin/_sales");
const adminTrackingLinksHandler = require("./admin/_tracking-links");

// Sale handlers
const saleDashboardHandler = require("./sale/_dashboard");

module.exports = async function handler(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname.replace(/\/$/, "");

  // Route request to the appropriate handler
  switch (pathname) {
    case "/api/lead":
      return leadHandler(req, res);
    case "/api/login":
      return loginHandler(req, res);
    case "/api/logout":
      return logoutHandler(req, res);
    case "/api/me":
      return meHandler(req, res);
    case "/api/reel-comments":
      return reelCommentsHandler(req, res);
    case "/api/reel-likes":
      return reelLikesHandler(req, res);
    case "/api/reel-state":
      return reelStateHandler(req, res);
    case "/api/tracking-click":
      return trackingClickHandler(req, res);
    case "/api/tracking-interaction":
      return trackingInteractionHandler(req, res);
    case "/api/admin/dashboard":
      return adminDashboardHandler(req, res);
    case "/api/admin/leads":
      return adminLeadsHandler(req, res);
    case "/api/admin/sales":
      return adminSalesHandler(req, res);
    case "/api/admin/tracking-links":
      return adminTrackingLinksHandler(req, res);
    case "/api/sale/dashboard":
      return saleDashboardHandler(req, res);
    default:
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `Not found: ${pathname}` }));
  }
};
