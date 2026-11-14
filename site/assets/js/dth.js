/* Đèn Tín Hiệu Sẵn Sàng Tự Động Hóa (DTH-Q-1.0): tính kết quả ngay trên trình duyệt, không gửi dữ liệu đi đâu */
(function () {
  "use strict";
  var form = document.getElementById("dth-form");
  if (!form) return;
  var cfg = window.AFB_CONFIG || {};
  var VI = !window.AIF_LANG || window.AIF_LANG === "vi";
  var T = window.T || function (x, v) { if (v) for (var k in v) x = x.split("{" + k + "}").join(v[k]); return x; };
  var PRE = window.AIF_PREFIX || "";
  var PHONE = cfg.phoneDisplay || "0833 28 68 13";
  var PHONE_SHOW = VI ? PHONE : "+84 " + PHONE.replace(/^0/, "");
  var box = document.getElementById("dth-result");
  var qs = Array.prototype.slice.call(form.querySelectorAll(".dth-q"));
  var progress = document.getElementById("dth-progress");
  var status = document.getElementById("dth-status");

  var RESULT = {
    red: { cls: "red", label: T("Đèn Đỏ"), title: T("Quy trình này chưa đủ rõ để giao cho AI."),
      text: T("Tự động hóa lúc này là tự động hóa sự lộn xộn. Việc đầu tiên: chuẩn hóa quy trình, dữ liệu hoặc trách nhiệm ở nhóm có điểm thấp nhất. Sửa xong, làm lại bài kiểm tra."),
      actions: [[PRE + "/danh-gia/ear-index/khao-sat/", T("Đánh giá cả doanh nghiệp với EAR Index™"), "btn btn-gold"]] },
    yellow: { cls: "yellow", label: T("Đèn Vàng"), title: T("Làm được, nhưng còn nhiều ngoại lệ."),
      text: T("Thí điểm trong phạm vi hẹp, có người duyệt ngoại lệ, đo trước và đo sau. Đừng mở rộng khi chưa có số đo."),
      actions: [[PRE + "/lien-he/?nhu-cau=trien-khai#form", T("Đặt lịch trao đổi với chuyên gia GoAI (miễn phí)"), "btn btn-gold"]] },
    green: { cls: "green", label: T("Đèn Xanh"), title: T("Quy trình đã sẵn sàng. Đừng để nó chờ thêm."),
      text: T("Thiết kế giải pháp và tiêu chí nghiệm thu ngay. Mỗi tháng chờ là một tháng tiếp tục trả chi phí làm tay."),
      actions: [[PRE + "/lien-he/?nhu-cau=trien-khai#form", T("Đặt lịch trao đổi với chuyên gia GoAI (miễn phí)"), "btn btn-gold"]] }
  };

  function answered(q) { return q.querySelector("input:checked"); }
  function updateProgress() {
    var n = qs.filter(answered).length;
    progress.textContent = T("{n}/16 câu", { n: n });
  }
  form.addEventListener("change", function (e) {
    var q = e.target.closest(".dth-q");
    if (q && answered(q)) { q.classList.remove("invalid"); document.getElementById(q.id + "-err").textContent = ""; }
    updateProgress();
  });

  function compute() {
    var total = 0, keyNo = 0, groups = {}, order = [];
    qs.forEach(function (q) {
      var v = parseInt(answered(q).value, 10);
      var g = q.getAttribute("data-group");
      total += v;
      if (q.getAttribute("data-key") && v === 0) keyNo++;
      if (!groups[g]) { groups[g] = { got: 0, max: 0 }; order.push(g); }
      groups[g].got += v; groups[g].max += 2;
    });
    var light;
    if (total < 16 || keyNo >= 2) light = "red";
    else if (total >= 26 && keyNo === 0) light = "green";
    else light = "yellow";
    var weak = order.slice().sort(function (a, b) { return groups[a].got / groups[a].max - groups[b].got / groups[b].max || order.indexOf(a) - order.indexOf(b); })[0];
    return { total: total, keyNo: keyNo, light: light, weak: weak, weakGot: groups[weak].got, weakMax: groups[weak].max };
  }

  function el(tag, attrs, text) {
    var x = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { x.setAttribute(k, attrs[k]); });
    if (text) x.textContent = text;
    return x;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var missing = qs.filter(function (q) { return !answered(q); });
    qs.forEach(function (q) {
      var bad = missing.indexOf(q) !== -1;
      q.classList.toggle("invalid", bad);
      document.getElementById(q.id + "-err").textContent = bad ? T("Chọn một mức cho câu này.") : "";
    });
    if (missing.length) {
      status.className = "status err";
      status.textContent = T("Còn {n} câu chưa trả lời.", { n: missing.length });
      var first = missing[0].querySelector("input");
      missing[0].scrollIntoView({ block: "center" });
      first.focus();
      return;
    }
    status.className = "status"; status.textContent = "";
    var r = compute(), R = RESULT[r.light];
    var proc = document.getElementById("dth-name").value.trim();
    box.className = "dth-result " + R.cls;
    document.getElementById("dth-r-proc").textContent = R.label + (proc ? " · " + proc : "");
    document.getElementById("dth-r-title").textContent = R.title;
    document.getElementById("dth-r-text").textContent = R.text;
    document.getElementById("dth-r-score").textContent = T("Điểm: {n}/32", { n: r.total }) + " · " + (r.keyNo ? T("{n} câu chặn (★) trả lời “Chưa”", { n: r.keyNo }) : T("Không có câu chặn nào trả lời “Chưa”"));
    document.getElementById("dth-r-weak").textContent = T("Nhóm cần sửa trước: {g} ({a}/{b} điểm).", { g: T(r.weak), a: r.weakGot, b: r.weakMax });
    var act = document.getElementById("dth-r-actions");
    act.textContent = "";
    R.actions.forEach(function (a) {
      var link = el("a", { href: a[0], "class": a[2] }, a[1]);
      if (a[3]) link.setAttribute("rel", "noopener");
      act.appendChild(link);
    });
    act.appendChild(el("a", { href: "tel:" + PHONE.replace(/\s/g, "").replace(/^0/, "+84"), "class": "btn btn-line" }, T("Gọi hoặc Zalo {p}", { p: PHONE_SHOW })));
    box.hidden = false;
    box.scrollIntoView({ block: "start" });
    box.focus();
    try { if (window.gtag) window.gtag("event", "dth_result", { light: r.light, score: r.total }); } catch (err) { /* bỏ qua */ }
  });

  document.getElementById("dth-reset").addEventListener("click", function () {
    form.reset();
    box.hidden = true;
    qs.forEach(function (q) { q.classList.remove("invalid"); });
    updateProgress();
    document.getElementById("dth-name").focus();
  });
  updateProgress();
})();
