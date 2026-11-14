// Trình chiếu ảnh hoạt động: nút lướt trái/phải, chấm chọn ảnh, tự chuyển sau 3 giây (v2.2.0).
// Dừng khi khách bấm vào ảnh, bấm lùi/tới, chọn chấm ảnh hoặc dùng phím mũi tên (bấm ▶ để chạy tiếp), hoặc khi người xem chọn giảm chuyển động.
// Nếu khung đang là ảnh chờ, đọc assets/img/hoat-dong/danh-sach.json để thay bằng ảnh thật (không cần dựng lại web).
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  function build(g, list) {
    var base = g.getAttribute("data-gallery-src").replace(/[^/]*$/, "");
    var slides = list.map(function (a, i) {
      var date = a.ngay ? ' · <time datetime="' + esc(a.ngay) + '">' + esc(String(a.ngay).split("-").reverse().join("/")) + "</time>" : "";
      return '<figure class="g-slide"><img src="' + base + encodeURIComponent(a.tep) + '" alt="' + esc(a.chu_thich || "Hoạt động của tác giả Trần Tấn Sỹ") + '" width="1600" height="900"' + (i ? ' loading="lazy"' : "") + ">" +
        (a.chu_thich ? "<figcaption>" + esc(a.chu_thich) + date + "</figcaption>" : "") + "</figure>";
    });
    g.querySelector(".g-track").innerHTML = slides.join("");
    var ctrl = g.querySelector(".g-ctrl");
    if (list.length < 2) { if (ctrl) ctrl.remove(); return; }
    var dots = list.map(function (_, i) { return '<button type="button" class="g-dot" data-g-i="' + i + '" aria-label="' + (window.T ? window.T("Ảnh {i} trên {n}", { i: i + 1, n: list.length }) : "Ảnh " + (i + 1) + " trên " + list.length) + '"' + (i ? "" : ' aria-current="true"') + "></button>"; }).join("");
    if (ctrl) ctrl.querySelector(".g-dots").innerHTML = dots;
  }

  function init(g) {
    var track = g.querySelector(".g-track"), slides = g.querySelectorAll(".g-slide"), dots = g.querySelectorAll(".g-dot");
    if (!track || slides.length < 2) return;
    var i = 0, timer = null, paused = reduce, hover = false, pauseBtn = g.querySelector("[data-g=pause]");
    var count = g.querySelector(".g-count");
    // Nhãn chấm ảnh theo ngôn ngữ trang (bản EN/繁中)
    if (window.T) dots.forEach(function (d, k) { d.setAttribute("aria-label", window.T("Ảnh {i} trên {n}", { i: k + 1, n: slides.length })); });
    // Tải trước ảnh kế tiếp để khi chuyển ảnh không bị trống
    function warm(k) { var im = slides[(k + slides.length) % slides.length].querySelector("img"); if (im && im.loading === "lazy") im.loading = "eager"; }
    function mark() { dots.forEach(function (d, k) { if (k === i) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current"); }); if (count) count.textContent = (i + 1) + " / " + slides.length; warm(i + 1); }
    function go(n) {
      i = (n + slides.length) % slides.length;
      track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: reduce ? "auto" : "smooth" });
      mark();
    }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    function play() { stop(); if (!paused && !hover) timer = setInterval(function () { go(i + 1); }, 3000); }
    function setPause(p) {
      paused = p;
      if (pauseBtn) { pauseBtn.setAttribute("aria-label", (window.T || String)(p ? "Tiếp tục trình chiếu" : "Tạm dừng trình chiếu")); pauseBtn.firstElementChild.textContent = p ? "▶" : "❚❚"; }
      play();
    }
    g.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.dataset.g === "pause") return setPause(!paused);
      if (b.dataset.g === "prev") go(i - 1);
      else if (b.dataset.g === "next") go(i + 1);
      else if (b.dataset.gI) go(+b.dataset.gI);
      setPause(true); // v2.1.0: khách tự lùi/tới hoặc chọn ảnh thì dừng trình chiếu; bấm ▶ để chạy tiếp
    });
    // Bấm (hoặc chạm, vuốt) vào ảnh bất kỳ cũng dừng trình chiếu
    track.addEventListener("pointerdown", function () { if (!paused) setPause(true); });
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1); setPause(true); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1); setPause(true); }
    });
    var t; track.addEventListener("scroll", function () { clearTimeout(t); t = setTimeout(function () {
      var x = track.scrollLeft, best = 0;
      slides.forEach(function (s, k) { if (Math.abs(s.offsetLeft - track.offsetLeft - x) < Math.abs(slides[best].offsetLeft - track.offsetLeft - x)) best = k; });
      i = best; mark();
    }, 120); });
    if (reduce) setPause(true); else play();
  }

  document.querySelectorAll("[data-gallery]").forEach(function (g) {
    var src = g.getAttribute("data-gallery-src");
    if (!src || !g.querySelector(".g-ph") || !window.fetch) return init(g);
    fetch(src, { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      var list = (j && j.anh || []).filter(function (a) { return a && a.tep; });
      if (list.length) build(g, list);
    }).catch(function () {}).then(function () { init(g); });
  });
})();
