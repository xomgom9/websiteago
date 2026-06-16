(function () {
  var params = new URLSearchParams(window.location.search || "");
  var ref = params.get("ref") || params.get("ref_code") || params.get("refCode") || params.get("affiliate") || "";

  function uuid() {
    try {
      if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    } catch (e) {}
    return Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  var visitorId = window.localStorage.getItem("visitor_id") || uuid();
  window.localStorage.setItem("visitor_id", visitorId);

  if (!ref) {
    ref = window.localStorage.getItem("affiliate_ref") || "";
  }

  if (!ref) return;

  window.localStorage.setItem("affiliate_ref", ref);

  var key = "ago-tracking-fired:" + window.location.pathname + window.location.search;
  if (window.sessionStorage.getItem(key)) return;
  window.sessionStorage.setItem(key, "1");

  fetch("/api/tracking-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ref: ref,
      refCode: ref,
      visitorId: visitorId,
      visitor_id: visitorId,
      landing_page: window.location.pathname + window.location.search,
      source_url: window.location.href,
      device: /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "mobile" : "desktop",
      browser: navigator.userAgent
    })
  }).catch(function () {});
})();
