const postgres = require("postgres");
const crypto = require("crypto");

let sql;
let ready;

const JWT_SECRET = process.env.JWT_SECRET || "default_local_secret_key_987654321";

// Crytography and JWT Helpers
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, hash] = storedHash.split(":");
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha256").toString("hex");
  return hash === testHash;
}

function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  if (signature !== expectedSignature) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Seed admin hash
const defaultSalt = "8c6976e5b5410415bde908bd4dee15df";
const defaultHash = crypto.pbkdf2Sync("adminpassword", defaultSalt, 1000, 64, "sha256").toString("hex");
const defaultPasswordHash = `${defaultSalt}:${defaultHash}`;

// In-Memory Database for local development (persisted across dev-server cache clears)
if (!global.inMemoryUsers) {
  global.inMemoryUsers = [
    {
      id: 1,
      name: "System Admin",
      email: "admin@gmail.com",
      phone: "0123456789",
      password_hash: defaultPasswordHash,
      role: "admin",
      status: "active",
      created_at: new Date(),
      updated_at: new Date()
    }
  ];
}
if (!global.inMemorySales) global.inMemorySales = [];
if (!global.inMemoryTrackingLinks) global.inMemoryTrackingLinks = [];
if (!global.inMemoryClicks) global.inMemoryClicks = [];
if (!global.inMemoryLeads) global.inMemoryLeads = [];
if (!global.inMemoryComments) global.inMemoryComments = [];
if (!global.inMemoryLikes) global.inMemoryLikes = [];
if (!global.inMemoryInteractions) global.inMemoryInteractions = [];

const inMemoryUsers = global.inMemoryUsers;
const inMemorySales = global.inMemorySales;
const inMemoryTrackingLinks = global.inMemoryTrackingLinks;
const inMemoryClicks = global.inMemoryClicks;
const inMemoryLeads = global.inMemoryLeads;
const inMemoryComments = global.inMemoryComments;
const inMemoryLikes = global.inMemoryLikes;
const inMemoryInteractions = global.inMemoryInteractions;
let mockDb;

function getSql() {
  if (!process.env.DATABASE_URL) {
    if (!mockDb) {
      console.warn("WARNING: DATABASE_URL is not configured. Using in-memory mock database.");
      mockDb = async (strings, ...values) => {
        const query = strings.join("?").toLowerCase().replace(/\s+/g, " ").trim();
        
        // Mock resolveTracking
        if (query.includes("select tl.id, tl.sale_id, tl.ref_code") && query.includes("join users u")) {
          const ref = values[0];
          if (ref && ref !== "organic") {
            const tl = inMemoryTrackingLinks.find(t => t.ref_code === ref);
            if (tl) {
              if (tl.status === "active") {
                const s = inMemorySales.find(sale => sale.id === tl.sale_id && sale.status === "active");
                if (s) {
                  const u = inMemoryUsers.find(user => user.id === s.user_id && user.status === "active");
                  if (u) {
                    return [{
                      id: tl.id,
                      sale_id: tl.sale_id,
                      ref_code: tl.ref_code,
                      status: tl.status,
                      sale_name: s.sale_name,
                      sale_code: s.sale_code,
                      user_status: u.status
                    }];
                  }
                }
              }
              return [];
            } else {
              // Return a default mock agent for testing convenience if it doesn't exist in DB
              return [{
                id: 999,
                sale_id: 999,
                ref_code: ref,
                status: "active",
                sale_name: "Mock Agent (" + ref + ")",
                sale_code: ref,
                user_status: "active"
              }];
            }
          }
          return [];
        }

        // Mock users lookup (login)
        if (query.includes("from users") && (query.includes("email = ?") || query.includes("phone = ?"))) {
          const emailOrPhone = values[0];
          const found = inMemoryUsers.find(u => u.email === emailOrPhone || u.phone === emailOrPhone);
          return found ? [found] : [];
        }

        // Mock sales lookup by user_id
        if (query.includes("from sales") && query.includes("user_id = ?")) {
          const userId = Number(values[0]);
          const found = inMemorySales.find(s => s.user_id === userId);
          return found ? [found] : [];
        }

        // Mock sales lookup by id or s.id
        if (query.includes("from sales") && (query.includes("id = ?") || query.includes("s.id = ?"))) {
          const id = Number(values[0]);
          const found = inMemorySales.find(s => s.id === id);
          if (found) {
            if ((query.includes("status <>") || query.includes("status !=")) && found.status === "deleted") {
              return [];
            }
            return [found];
          }
          return [];
        }

        // Mock insert users
        if (query.includes("insert into users")) {
          const name = values[0];
          const email = values[1];
          const phone = values[2];
          const passwordHash = values[3];
          const role = values[4] || "sale";
          const status = values[5] || "active";
          const newUser = {
            id: inMemoryUsers.length + 1,
            name, email, phone, password_hash: passwordHash, role, status,
            created_at: new Date(),
            updated_at: new Date()
          };
          inMemoryUsers.push(newUser);
          return [newUser];
        }

        // Mock insert sales
        if (query.includes("insert into sales")) {
          const userId = Number(values[0]);
          const saleName = values[1];
          const saleCode = values[2];
          const phone = values[3];
          const email = values[4];
          const note = values[5];
          const status = values[6] || "active";
          const newSale = {
            id: inMemorySales.length + 1,
            user_id: userId,
            sale_name: saleName,
            sale_code: saleCode,
            phone, email, note, status,
            created_at: new Date(),
            updated_at: new Date()
          };
          inMemorySales.push(newSale);
          return [newSale];
        }

        // Mock select sales + users join (sales list with stats)
        if (query.includes("from sales s") && query.includes("click_tracking ct") && query.includes("leads l")) {
          return inMemorySales
            .filter(s => s.status !== "deleted")
            .map(s => {
              const u = inMemoryUsers.find(user => user.id === s.user_id);
              const clicks = inMemoryClicks.filter(c => c.sale_id === s.id);
              const uniqueVisitors = new Set(clicks.map(c => c.visitor_id)).size;
              const totalLeads = inMemoryLeads.filter(l => l.sale_id === s.id).length;
              return {
                id: s.id,
                user_id: s.user_id,
                sale_name: s.sale_name,
                sale_code: s.sale_code,
                phone: s.phone,
                email: s.email,
                note: s.note,
                status: s.status,
                created_at: s.created_at,
                user_status: u ? u.status : "active",
                total_clicks: clicks.length,
                unique_visitors: uniqueVisitors,
                total_leads: totalLeads
              };
            });
        }

        // Simple mock select sales list
        if (query.includes("from sales s") && query.includes("join users u") && !query.includes("click_tracking")) {
          return inMemorySales
            .filter(s => s.status !== "deleted")
            .map(s => {
              const u = inMemoryUsers.find(user => user.id === s.user_id);
              return {
                ...s,
                role: u ? u.role : "sale"
              };
            });
        }

        // Mock select tracking links
        if (query.includes("from tracking_links tl") && query.includes("join sales s")) {
          return inMemoryTrackingLinks
            .filter(tl => tl.status !== "deleted")
            .map(tl => {
              const s = inMemorySales.find(sale => sale.id === tl.sale_id);
              const clicks = inMemoryClicks.filter(c => c.tracking_link_id === tl.id);
              const totalLeads = inMemoryLeads.filter(l => l.tracking_link_id === tl.id).length;
              return {
                ...tl,
                sale_name: s ? s.sale_name : "Unknown",
                total_clicks: clicks.length,
                total_leads: totalLeads
              };
            });
        }

        // Mock insert tracking_links
        if (query.includes("insert into tracking_links")) {
          const saleId = Number(values[0]);
          const refCode = values[1];
          const trackingUrl = values[2];
          
          let status = "active";
          if (query.includes("'inactive'")) status = "inactive";
          
          let note = "Default tracking link";
          if (values.length === 4) {
            note = values[3];
          }

          const newLink = {
            id: inMemoryTrackingLinks.length + 1,
            sale_id: saleId,
            ref_code: refCode,
            tracking_url: trackingUrl,
            status: status,
            note: note,
            created_at: new Date(),
            updated_at: new Date()
          };
          inMemoryTrackingLinks.push(newLink);
          return [newLink];
        }

        // Mock update tracking_links
        if (query.includes("update tracking_links set")) {
          if (query.includes("where sale_id = ?")) {
            const saleId = Number(values[0]);
            const targets = inMemoryTrackingLinks.filter(tl => tl.sale_id === saleId);
            const parts = query.split("where");
            const setClause = parts[0];
            let targetStatus = null;
            if (setClause.includes("status = 'inactive'")) targetStatus = "inactive";
            else if (setClause.includes("status = 'active'")) targetStatus = "active";
            else if (setClause.includes("status = 'deleted'")) targetStatus = "deleted";

            targets.forEach(found => {
              if (targetStatus) {
                found.status = targetStatus;
                if (targetStatus === "deleted") {
                  found.deleted_at = new Date();
                }
              }
              found.updated_at = new Date();
            });
          } else {
            const id = Number(values[values.length - 1]);
            const found = inMemoryTrackingLinks.find(tl => tl.id === id);
            if (found) {
              if (query.includes("status = ?")) {
                found.status = values[0];
                if (values[0] === "deleted") {
                  found.deleted_at = new Date();
                }
              } else if (query.includes("status = 'deleted'")) {
                found.status = "deleted";
                found.deleted_at = new Date();
              }
              if (query.includes("note = ?")) found.note = values[1] || values[0];
              found.updated_at = new Date();
            }
          }
          return [];
        }

        // Mock update users
        if (query.includes("update users set")) {
          const id = Number(values[values.length - 1]);
          const found = inMemoryUsers.find(u => u.id === id);
          if (found) {
            if (query.includes("password_hash = ?")) found.password_hash = values[0];
            if (query.includes("status = ?")) {
              found.status = values[0];
            } else if (query.includes("status = 'deleted'")) {
              found.status = "deleted";
            }
            if (query.includes("name = ?")) found.name = values[0];
            found.updated_at = new Date();
          }
          return [];
        }

        // Mock update sales
        if (query.includes("update sales set")) {
          const id = Number(values[values.length - 1]);
          const found = inMemorySales.find(s => s.id === id);
          if (found) {
            if (query.includes("sale_name = ?")) found.sale_name = values[0];
            if (query.includes("note = ?")) {
              found.note = query.includes("sale_name = ?") ? values[1] : values[0];
            }
            if (query.includes("status = ?")) {
              found.status = values[0];
            } else if (query.includes("status = 'deleted'")) {
              found.status = "deleted";
            }
            found.updated_at = new Date();
          }
          return [];
        }

        // Mock delete users/sales
        if (query.includes("delete from users") || query.includes("delete from sales")) {
          const id = Number(values[0]);
          const uIdx = inMemoryUsers.findIndex(u => u.id === id);
          if (uIdx !== -1) inMemoryUsers.splice(uIdx, 1);
          const sIdx = inMemorySales.findIndex(s => s.id === id);
          if (sIdx !== -1) inMemorySales.splice(sIdx, 1);
          return [];
        }

        // Mock insert click_tracking
        if (query.includes("insert into click_tracking")) {
          const record = {
            id: inMemoryClicks.length + 1,
            sale_id: values[0],
            tracking_link_id: values[1],
            ref_code: values[2],
            visitor_id: values[3],
            ip_address: values[4],
            user_agent: values[5],
            device: values[6],
            browser: values[7],
            landing_page: values[8],
            clicked_at: new Date(),
            created_at: new Date()
          };
          inMemoryClicks.push(record);
          return [record];
        }

        // Mock insert leads
        if (query.includes("insert into leads")) {
          const record = {
            id: inMemoryLeads.length + 1,
            sale_id: values[0],
            tracking_link_id: values[1],
            ref_code: values[2],
            customer_name: values[3],
            customer_phone: values[4],
            customer_email: values[5],
            message: values[6],
            source_url: values[7],
            landing_page: values[8],
            visitor_id: values[9],
            created_at: new Date()
          };
          inMemoryLeads.push(record);
          return [record];
        }

        // Mock insert interaction_tracking
        if (query.includes("insert into interaction_tracking")) {
          const record = {
            id: inMemoryInteractions.length + 1,
            visitor_id: values[0],
            ref_code: values[1],
            event_type: values[2],
            landing_page: values[3],
            device: values[4],
            browser: values[5],
            created_at: new Date()
          };
          inMemoryInteractions.push(record);
          return [record];
        }

        // Mock select interaction_tracking aggregates
        if (query.includes("from interaction_tracking") && query.includes("group by event_type")) {
          const counts = {};
          inMemoryInteractions.forEach(item => {
            if (!counts[item.event_type]) counts[item.event_type] = { unique: new Set(), total: 0 };
            counts[item.event_type].unique.add(item.visitor_id);
            counts[item.event_type].total++;
          });
          return Object.entries(counts).map(([type, c]) => ({
            event_type: type,
            unique_count: c.unique.size,
            total_count: c.total
          }));
        }

        // Mock select leads with sales join (master list)
        if (query.includes("from leads l") && query.includes("left join sales s")) {
          return inMemoryLeads.map(l => {
            const s = inMemorySales.find(sale => sale.id === l.sale_id);
            return {
              ...l,
              sale_name: s ? s.sale_name : "Organic"
            };
          }).sort((a, b) => b.created_at - a.created_at);
        }

        // Mock insert reel_comments
        if (query.includes("insert into reel_comments")) {
          const videoId = values[0];
          const authorName = values[1];
          const body = values[2];
          const record = {
            id: inMemoryComments.length + 1,
            video_id: videoId,
            author_name: authorName,
            body: body,
            created_at: new Date()
          };
          inMemoryComments.push(record);
          return [record];
        }

        // Mock select reel_comments
        if (query.includes("select id, author_name, body, created_at from reel_comments")) {
          const videoId = values[0];
          return inMemoryComments
            .filter(c => c.video_id === videoId)
            .sort((a, b) => b.created_at - a.created_at);
        }

        // Mock select count(*) from reel_likes
        if (query.includes("select count(*)::int as count from reel_likes")) {
          const videoId = values[0];
          const count = inMemoryLikes.filter(l => l.video_id === videoId).length;
          return [{ count }];
        }

        // Mock insert reel_likes
        if (query.includes("insert into reel_likes")) {
          const videoId = values[0];
          const clientId = values[1];
          if (!inMemoryLikes.some(l => l.video_id === videoId && l.client_id === clientId)) {
            inMemoryLikes.push({ video_id: videoId, client_id: clientId });
          }
          return [];
        }

        // Mock delete reel_likes
        if (query.includes("delete from reel_likes")) {
          const videoId = values[0];
          const clientId = values[1];
          inMemoryLikes = inMemoryLikes.filter(l => !(l.video_id === videoId && l.client_id === clientId));
          return [];
        }

        // Mock select 1 from reel_likes limit 1
        if (query.includes("select 1 from reel_likes")) {
          const videoId = values[0];
          const clientId = values[1];
          const exists = inMemoryLikes.some(l => l.video_id === videoId && l.client_id === clientId);
          return exists ? [{ "1": 1 }] : [];
        }

        return [];
      };
    }
    return mockDb;
  }

  if (!sql) {
    sql = postgres(process.env.DATABASE_URL, {
      ssl: "require",
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }

  return sql;
}

async function ensureTables() {
  if (ready) return ready;

  ready = (async () => {
    const db = getSql();

    await db`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'sale' CHECK (role IN ('admin', 'sale')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await db`
      CREATE TABLE IF NOT EXISTS sales (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        sale_name TEXT NOT NULL,
        sale_code TEXT NOT NULL UNIQUE,
        phone TEXT,
        email TEXT,
        note TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await db`
      CREATE TABLE IF NOT EXISTS tracking_links (
        id BIGSERIAL PRIMARY KEY,
        sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        ref_code TEXT NOT NULL UNIQUE,
        tracking_url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `;

    await db`
      CREATE TABLE IF NOT EXISTS click_tracking (
        id BIGSERIAL PRIMARY KEY,
        sale_id BIGINT REFERENCES sales(id) ON DELETE SET NULL,
        tracking_link_id BIGINT REFERENCES tracking_links(id) ON DELETE SET NULL,
        ref_code TEXT NOT NULL,
        visitor_id TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        device TEXT,
        browser TEXT,
        landing_page TEXT,
        clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await db`
      CREATE TABLE IF NOT EXISTS leads (
        id BIGSERIAL PRIMARY KEY,
        sale_id BIGINT REFERENCES sales(id) ON DELETE SET NULL,
        tracking_link_id BIGINT REFERENCES tracking_links(id) ON DELETE SET NULL,
        ref_code TEXT NOT NULL DEFAULT 'organic',
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_email TEXT,
        message TEXT,
        source_url TEXT,
        landing_page TEXT,
        visitor_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await db`
      CREATE TABLE IF NOT EXISTS reel_comments (
        id BIGSERIAL PRIMARY KEY,
        video_id TEXT NOT NULL,
        author_name TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await db`
      CREATE INDEX IF NOT EXISTS reel_comments_video_created_idx
      ON reel_comments (video_id, created_at DESC)
    `;

    await db`
      CREATE TABLE IF NOT EXISTS reel_likes (
        video_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (video_id, client_id)
      )
    `;

    await db`
      CREATE TABLE IF NOT EXISTS interaction_tracking (
        id BIGSERIAL PRIMARY KEY,
        visitor_id TEXT NOT NULL,
        ref_code TEXT DEFAULT 'organic',
        event_type TEXT NOT NULL,
        landing_page TEXT,
        device TEXT,
        browser TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await db`
      CREATE INDEX IF NOT EXISTS interaction_tracking_visitor_idx
      ON interaction_tracking (visitor_id, event_type)
    `;

    await db`
      CREATE INDEX IF NOT EXISTS tracking_links_sale_idx
      ON tracking_links (sale_id, status)
    `;

    await db`
      CREATE INDEX IF NOT EXISTS click_tracking_sale_time_idx
      ON click_tracking (sale_id, clicked_at DESC)
    `;

    await db`
      CREATE INDEX IF NOT EXISTS leads_sale_time_idx
      ON leads (sale_id, created_at DESC)
    `;

    // Seed default admin if no users exist
    const usersCount = await db`SELECT COUNT(*)::int AS count FROM users`;
    if (usersCount[0]?.count === 0) {
      const passwordHash = hashPassword("adminpassword");
      await db`
        INSERT INTO users (name, email, password_hash, role, status)
        VALUES ('System Admin', 'admin@gmail.com', ${passwordHash}, 'admin', 'active')
      `;
      console.log("Seeded default admin account: admin@gmail.com / adminpassword");
    }
  })();

  return ready;
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 100_000) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const index = pair.indexOf("=");
        return index >= 0 ? [decodeURIComponent(pair.slice(0, index)), decodeURIComponent(pair.slice(index + 1))] : [pair, ""];
      })
  );
}

function setCookie(res, name, value, options = {}) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  if (options.maxAge != null) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.path) parts.push(`Path=${options.path}`);
  else parts.push("Path=/");
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push("Secure");
  if (options.domain) parts.push(`Domain=${options.domain}`);
  const existing = res.getHeader("Set-Cookie");
  const next = Array.isArray(existing) ? [...existing, parts.join("; ")] : existing ? [existing, parts.join("; ")] : [parts.join("; ")];
  res.setHeader("Set-Cookie", next);
}

function getVisitorId(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return cookies.visitor_id || "";
}

module.exports = {
  ensureTables,
  getSql,
  readBody,
  sendJson,
  parseCookies,
  setCookie,
  getVisitorId,
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  inMemoryUsers,
  inMemorySales,
  inMemoryTrackingLinks,
  inMemoryClicks,
  inMemoryLeads,
  inMemoryInteractions,
};