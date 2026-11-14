/* Gửi form không tải lại trang; nếu tắt JavaScript, form vẫn gửi thường và chuyển tới trang cảm ơn */
(function () {
  "use strict";
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE = /^[0-9+().\s-]{8,20}$/;
  var VI = !window.AIF_LANG || window.AIF_LANG === "vi";
  var T = window.T || function (x, v) { if (v) for (var k in v) x = x.split("{" + k + "}").join(v[k]); return x; };
  var PHONE_TXT = (window.AFB_CONFIG && window.AFB_CONFIG.phoneDisplay) || "0833 28 68 13";
  if (!VI) PHONE_TXT = "+84 " + PHONE_TXT.replace(/^0/, "");

  function setErr(input, msg) {
    var box = document.getElementById(input.id + "-err");
    if (msg) {
      input.setAttribute("aria-invalid", "true");
      if (box) box.textContent = msg;
    } else {
      input.removeAttribute("aria-invalid");
      if (box) box.textContent = "";
    }
  }

  function check(input) {
    var v = (input.type === "checkbox") ? input.checked : input.value.trim();
    if (input.required && !v) {
      if (input.type === "checkbox") return T("Cần đánh dấu ô này để gửi.");
      return T("Cần điền mục này.");
    }
    if (input.minLength > 0 && typeof v === "string" && v && v.length < input.minLength) return T("Cần điền đầy đủ.");
    if (input.type === "email" && v && !EMAIL.test(v)) return T("Email chưa đúng dạng, ví dụ: ten@congty.vn.");
    if (input.type === "tel" && v && !PHONE.test(v)) return T("Số điện thoại hoặc Zalo chưa đúng dạng.");
    if (input.maxLength > 0 && typeof v === "string" && v.length > input.maxLength) return T("Nội dung quá dài.");
    return "";
  }

  function collect(form) {
    var data = {};
    var fd = new FormData(form);
    fd.forEach(function (val, key) {
      if (data[key] !== undefined) {
        if (!Array.isArray(data[key])) data[key] = [data[key]];
        data[key].push(val);
      } else {
        data[key] = val;
      }
    });
    return data;
  }

  // Gửi thẳng tới Google Apps Script (cấu hình ở assets/js/form-config.js), giống aisa.vn.
  // Dùng Content-Type text/plain để trình duyệt không phải hỏi trước (CORS), Apps Script vẫn đọc được JSON.
  function send(form, body) {
    var cfg = window.AIF_FORM || {};
    var url = cfg.url || form.getAttribute("action");
    body.type = body.type || form.getAttribute("data-type") || "";
    if (cfg.secret) body.secret = cfg.secret;
    body.ua = (navigator.userAgent || "").slice(0, 300);
    if (!url || url.indexOf("https://script.google.com/") !== 0) return Promise.reject(new Error("Chưa cấu hình địa chỉ nhận form"));
    return fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body), redirect: "follow" });
  }
  window.AIF_SEND = send;

  function init(form) {
    var status = form.querySelector(".status");
    var submit = form.querySelector('button[type="submit"]');
    var label = submit ? submit.textContent : "";
    var fields = form.querySelectorAll("input:not([type=hidden]), select, textarea");

    var sending = false;
    // Nút Gửi chỉ bấm được khi đã điền đủ và đúng các mục bắt buộc (họ tên, điện thoại, nhu cầu, ô đồng ý…)
    var hint = document.createElement("p");
    hint.className = "need-hint";
    hint.id = (form.id || ("f" + Math.random().toString(36).slice(2, 8))) + "-hint";
    hint.textContent = T("Điền đủ các mục bắt buộc và đánh dấu ô đồng ý để bật nút gửi.");
    if (submit) {
      submit.parentNode.insertBefore(hint, submit.nextSibling);
      submit.setAttribute("aria-describedby", hint.id);
    }
    function ready() {
      for (var k = 0; k < fields.length; k++) {
        if (fields[k].closest(".hp")) continue;
        if (check(fields[k])) return false;
      }
      return true;
    }
    function update() {
      if (!submit || sending) return;
      var ok = ready();
      submit.disabled = !ok;
      hint.hidden = ok;
    }
    fields.forEach(function (f) {
      // Xóa lỗi ngay khi người dùng sửa, để bố cục không nhảy lúc bấm sang ô khác
      f.addEventListener("input", function () { if (f.getAttribute("aria-invalid") && !check(f)) setErr(f, ""); update(); });
      f.addEventListener("change", function () { if (f.getAttribute("aria-invalid")) setErr(f, check(f)); update(); });
      // Báo lỗi khi rời khỏi ô bắt buộc mà chưa điền đúng
      f.addEventListener("blur", function () { if (f.value && f.type !== "checkbox") setErr(f, check(f)); });
    });
    form.addEventListener("reset", function () { setTimeout(update, 0); });
    update();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var first = null;
      fields.forEach(function (f) {
        if (f.closest(".hp")) return;
        var m = check(f);
        setErr(f, m);
        if (m && !first) first = f;
      });
      if (first) {
        status.className = "status err";
        status.textContent = T("Chưa gửi được. Kiểm tra lại các mục được đánh dấu.");
        first.focus();
        return;
      }
      sending = true;
      submit.disabled = true;
      submit.textContent = T("Đang gửi…");
      status.className = "status";
      status.textContent = "";
      var body = collect(form);
      body.page = window.location.pathname;
      send(form, body).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { return { r: r, j: j }; });
      }).then(function (res) {
        if (res.r.ok && res.j.ok) {
          status.className = "status ok";
          status.textContent = form.getAttribute("data-ok") || T("Đã nhận.");
          form.reset();
          status.setAttribute("tabindex", "-1");
          status.focus();
        } else {
          if (res.j.field) {
            var f = form.querySelector('[name="' + res.j.field + '"]');
            if (f) setErr(f, (VI && res.j.message) || check(f) || T("Mục này chưa hợp lệ."));
          }
          status.className = "status err";
          status.textContent = (VI && res.j.message) || T("Chưa gửi được. Thử lại sau ít phút hoặc gọi, Zalo {p}.", { p: PHONE_TXT });
        }
      }).catch(function () {
        status.className = "status err";
        status.textContent = T("Mất kết nối, chưa gửi được. Thử lại hoặc gọi, Zalo {p}.", { p: PHONE_TXT });
      }).then(function () {
        sending = false;
        submit.textContent = label;
        update();
      });
    });
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }
  ready(function () {
    document.querySelectorAll("form[data-ajax]").forEach(init);

    // Trang hủy nhận bản tin mở từ đường dẫn trong email: /huy-dang-ky/?t=<mã hủy>
    var t = new URLSearchParams(window.location.search).get("t");
    var uform = document.querySelector('form[data-type="huy"]');
    if (t && uform) {
      var done = document.getElementById("unsub-done"), bad = document.getElementById("unsub-bad"), wait = document.getElementById("unsub-wait");
      if (wait) wait.hidden = false;
      send(uform, { type: "huy", token: t.replace(/[^a-f0-9]/g, "").slice(0, 64), page: window.location.pathname })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (wait) wait.hidden = true; if (j && j.ok) { if (done) done.hidden = false; } else if (bad) bad.hidden = false; })
        .catch(function () { if (wait) wait.hidden = true; if (bad) bad.hidden = false; });
    }
  });
})();
