// Nhúng khảo sát Tally ngay trong trang (người xem không rời khỏi website).
// Dùng thư viện nhúng chính thức của Tally để khung tự giãn theo chiều cao khảo sát;
// nếu thư viện không tải được, vẫn nạp khảo sát vào khung với chiều cao cố định (cuộn bên trong khung).
(function () {
  var frames = document.querySelectorAll("iframe[data-tally-src]");
  if (!frames.length) return;
  function done(f) {
    var w = f.closest("[data-tally-wrap]"), l = w && w.querySelector("[data-tally-loading]");
    if (l) l.hidden = true;
    if (w) w.classList.add("is-ready");
  }
  frames.forEach(function (f) { f.addEventListener("load", function () { done(f); }); });
  function fallback() {
    frames.forEach(function (f) { if (!f.src) f.src = f.getAttribute("data-tally-src"); });
  }
  var timer = setTimeout(fallback, 4000);
  var s = document.createElement("script");
  s.src = "https://tally.so/widgets/embed.js";
  s.async = true;
  s.onload = function () {
    clearTimeout(timer);
    if (window.Tally && typeof window.Tally.loadEmbeds === "function") window.Tally.loadEmbeds();
    else fallback();
  };
  s.onerror = function () { clearTimeout(timer); fallback(); };
  document.head.appendChild(s);
})();
