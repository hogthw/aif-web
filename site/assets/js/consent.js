/*
  Đồng ý cookie. Mặc định không nạp công cụ đo lường nào.
  Chỉ khi người xem bấm "Chấp nhận" (hoặc bật mục Phân tích rồi Lưu) mới nạp Google Analytics / Cloudflare Web Analytics
  theo mã cấu hình trong /assets/js/config.js. Lựa chọn lưu 12 tháng trong trình duyệt, có thể đổi bất cứ lúc nào
  qua nút "Cài đặt cookie" ở chân trang.
*/
(function () {
  "use strict";
  var KEY = "afb-consent";
  var VERSION = 1;
  var MAX_AGE = 365 * 24 * 3600 * 1000;
  var cfg = window.AFB_CONFIG || {};
  var loaded = false;

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (!c || c.v !== VERSION || !c.ts || Date.now() - c.ts > MAX_AGE) return null;
      return c;
    } catch (e) { return null; }
  }
  function save(analytics) {
    var c = { v: VERSION, analytics: !!analytics, ts: Date.now() };
    try { window.localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* chế độ riêng tư */ }
    return c;
  }

  function loadScript(src, attrs) {
    var s = document.createElement("script");
    s.async = true;
    s.src = src;
    if (attrs) Object.keys(attrs).forEach(function (k) { s.setAttribute(k, attrs[k]); });
    document.head.appendChild(s);
  }

  function enableAnalytics() {
    if (loaded) return;
    loaded = true;
    if (cfg.ga4) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "granted" });
      window.gtag("js", new Date());
      window.gtag("config", cfg.ga4, { anonymize_ip: true });
      loadScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(cfg.ga4), { "data-consent": "analytics" });
    }
    if (cfg.cfBeacon) {
      loadScript("https://static.cloudflareinsights.com/beacon.min.js", { "data-cf-beacon": JSON.stringify({ token: cfg.cfBeacon }), "data-consent": "analytics" });
    }
  }

  function disableAnalytics() {
    if (window.gtag) window.gtag("consent", "update", { analytics_storage: "denied" });
    // Xóa cookie Google Analytics nếu đã có từ lần đồng ý trước
    var host = window.location.hostname;
    var domains = ["", host, "." + host, "." + host.split(".").slice(-2).join(".")];
    document.cookie.split(";").forEach(function (c) {
      var name = c.split("=")[0].trim();
      if (/^_ga|^_gid|^_gat/.test(name)) {
        domains.forEach(function (d) {
          document.cookie = name + "=; Max-Age=0; path=/" + (d ? "; domain=" + d : "");
        });
      }
    });
    if (loaded) window.location.reload();
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var box = document.getElementById("cookie");
    if (!box) return;
    var panel = document.getElementById("cookie-prefs");
    var toggle = document.getElementById("ck-analytics");
    var lastFocus = null;

    function open(showPrefs, focus) {
      lastFocus = document.activeElement;
      var c = read();
      toggle.checked = !!(c && c.analytics);
      panel.hidden = !showPrefs;
      box.querySelector("[data-ck=prefs]").hidden = !!showPrefs;
      box.querySelector("[data-ck=save]").hidden = !showPrefs;
      box.hidden = false;
      document.body.classList.add("consent-open");
      if (focus) {
        var h = box.querySelector("h2");
        h.setAttribute("tabindex", "-1");
        h.focus();
      }
    }
    function close() {
      box.hidden = true;
      document.body.classList.remove("consent-open");
      if (lastFocus && lastFocus.focus && lastFocus !== document.body) lastFocus.focus();
    }
    function decide(analytics) {
      var prev = read();
      save(analytics);
      close();
      if (analytics) enableAnalytics();
      else if (prev && prev.analytics) disableAnalytics();
    }

    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-ck]");
      if (!b) return;
      var a = b.getAttribute("data-ck");
      if (a === "accept") decide(true);
      else if (a === "reject") decide(false);
      else if (a === "prefs") { panel.hidden = false; b.hidden = true; box.querySelector("[data-ck=save]").hidden = false; toggle.focus(); }
      else if (a === "save") decide(toggle.checked);
    });

    document.querySelectorAll("[data-open-consent]").forEach(function (b) {
      b.addEventListener("click", function () { open(true, true); });
    });

    var c = read();
    if (!c) open(false, false);
    else if (c.analytics) enableAnalytics();
  });
})();
