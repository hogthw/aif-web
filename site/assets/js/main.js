/* Điều hướng, lọc bài, chọn sẵn nhu cầu trong form liên hệ */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    // Menu trên di động
    var btn = document.querySelector(".menu-btn");
    var nav = document.getElementById("site-nav");
    if (btn && nav) {
      var close = function () {
        nav.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      };
      btn.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && nav.classList.contains("open")) {
          close();
          btn.focus();
        }
      });
      window.matchMedia("(min-width: 881px)").addEventListener("change", function (m) {
        if (m.matches) close();
      });
    }

    // Lọc bài trên trang Hoạt động
    var filters = document.querySelectorAll("[data-filter]");
    if (filters.length) {
      var cards = document.querySelectorAll("[data-group]");
      var count = document.getElementById("post-count");
      filters.forEach(function (f) {
        f.addEventListener("click", function () {
          var g = f.getAttribute("data-filter");
          filters.forEach(function (x) { x.setAttribute("aria-pressed", x === f ? "true" : "false"); });
          var shown = 0;
          cards.forEach(function (c) {
            var on = g === "all" || c.getAttribute("data-group") === g;
            c.hidden = !on;
            if (on) shown++;
          });
          if (count) count.textContent = window.T ? window.T("{n} bài", { n: shown }) : shown + " bài";
        });
      });
    }

    // Trang hủy nhận bản tin: kết quả từ đường dẫn trong email
    var kq = new URLSearchParams(window.location.search).get("kq");
    var done = document.getElementById("unsub-done");
    var bad = document.getElementById("unsub-bad");
    if (done && kq === "xong") done.hidden = false;
    if (bad && kq === "loi") bad.hidden = false;

    // Chọn sẵn nhu cầu: /lien-he/?nhu-cau=mua-sach
    var need = document.getElementById("c-need");
    if (need) {
      var v = new URLSearchParams(window.location.search).get("nhu-cau");
      if (v && need.querySelector('option[value="' + v.replace(/[^a-z0-9-]/g, "") + '"]')) need.value = v;
    }

    // Trang Đánh giá: khối công cụ thu gọn. Rê chuột vào khối (hoặc bấm "+") để mở thông tin,
    // bấm "−" để thu lại. Bấm tên công cụ là vào làm bài ngay.
    var hover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    document.querySelectorAll("[data-ht]").forEach(function (box) {
      var btn = box.querySelector(".ht-toggle"), body = box.querySelector(".ht-body");
      if (!btn || !body) return;
      var closedByUser = false;
      function set(open) {
        body.hidden = !open;
        box.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        btn.firstElementChild.textContent = open ? "−" : "+";
      }
      set(false);
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") !== "true";
        closedByUser = !open;
        set(open);
      });
      if (hover) {
        box.addEventListener("mouseenter", function () { if (!closedByUser) set(true); });
        box.addEventListener("mouseleave", function () { closedByUser = false; });
      }
    });
  });
})();
