/* =========================================================
   麻績勝広 ポートフォリオ — 軽量JS
   ・スクロールで静かにフェードイン（IntersectionObserver）
   ・モバイルナビの開閉
   ・prefers-reduced-motion を尊重
   ライブラリ不使用。
   ========================================================= */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- カスタムカーソル（ファッション風ブロブ） ---- */
  (function () {
    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!finePointer || prefersReduced) return; // タッチ端末・動き低減では出さない

    var blob = document.createElement("div");
    blob.className = "cursor-blob";
    var label = document.createElement("div");
    label.className = "cursor-label";
    label.textContent = "View";
    document.body.appendChild(blob);
    document.body.appendChild(label);
    document.body.classList.add("has-blob");

    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    var bx = tx, by = ty, lx = tx, ly = ty;
    var started = false;

    window.addEventListener("mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!started) { started = true; blob.classList.add("is-active"); }
    });
    document.addEventListener("mouseleave", function () { blob.classList.remove("is-active"); });
    document.addEventListener("mouseenter", function () { if (started) blob.classList.add("is-active"); });
    window.addEventListener("mousedown", function () { blob.classList.add("is-down"); });
    window.addEventListener("mouseup", function () { blob.classList.remove("is-down"); });

    function loop() {
      bx += (tx - bx) * 0.18;  // ブロブはゆっくり追従
      by += (ty - by) * 0.18;
      lx += (tx - lx) * 0.30;  // ラベルは少し速く
      ly += (ty - ly) * 0.30;
      blob.style.transform = "translate(" + bx + "px," + by + "px) translate(-50%,-50%)";
      label.style.transform = "translate(" + lx + "px," + ly + "px) translate(-50%,-50%)";
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    var hoverSel = "a, button, .artwork__frame, .exh-flyers a, .series-card, .nav-toggle";
    var artSel = ".artwork__frame, .exh-flyers a";

    document.addEventListener("mouseover", function (e) {
      if (e.target.closest(hoverSel)) {
        blob.classList.add("is-hover");
        if (e.target.closest(artSel)) label.classList.add("is-show");
      }
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest(hoverSel)) {
        blob.classList.remove("is-hover");
        label.classList.remove("is-show");
      }
    });
  })();

  /* ---- フェードイン ---- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  if (prefersReduced || !("IntersectionObserver" in window)) {
    // 動きを減らす設定 or 非対応環境では即表示
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    revealEls.forEach(function (el) { observer.observe(el); });
  }

  /* ---- ライトボックス（拡大・ズーム・前後送り・キーボード） ---- */
  (function () {
    var triggers = Array.prototype.slice.call(
      document.querySelectorAll(".artwork__frame, .exh-flyers a")
    );
    if (!triggers.length) return;

    // 対象画像とキャプションを収集
    var items = triggers.map(function (t) {
      var img = t.querySelector("img");
      var caption = "";
      var fig = t.closest("figure");
      if (fig) {
        var title = fig.querySelector(".artwork__title");
        var data = fig.querySelector(".artwork__data");
        if (title) caption += "<strong>" + title.innerHTML + "</strong>";
        if (data) caption += "<br>" + data.innerHTML;
      }
      if (!caption && img) caption = img.getAttribute("alt") || "";
      return { src: (img && (img.currentSrc || img.src)) || "", caption: caption, alt: (img && img.alt) || "" };
    });

    // オーバーレイDOMを生成
    var box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "作品の拡大表示");
    box.innerHTML =
      '<span class="lightbox__count" aria-hidden="true"></span>' +
      '<button class="lightbox__close" aria-label="閉じる">×</button>' +
      '<button class="lightbox__btn lightbox__prev" aria-label="前の作品">‹</button>' +
      '<div class="lightbox__stage"><img class="lightbox__img" alt=""></div>' +
      '<button class="lightbox__btn lightbox__next" aria-label="次の作品">›</button>' +
      '<div class="lightbox__caption"></div>';
    document.body.appendChild(box);

    var imgEl = box.querySelector(".lightbox__img");
    var capEl = box.querySelector(".lightbox__caption");
    var countEl = box.querySelector(".lightbox__count");
    var current = 0;
    var zoomed = false;
    var lastFocus = null;

    function render(i) {
      current = (i + items.length) % items.length;
      var it = items[current];
      setZoom(false);
      imgEl.src = it.src;
      imgEl.alt = it.alt;
      capEl.innerHTML = it.caption;
      countEl.textContent = (current + 1) + " / " + items.length;
      // 1点のみのときは前後ボタンを隠す
      var single = items.length < 2;
      box.querySelector(".lightbox__prev").style.display = single ? "none" : "";
      box.querySelector(".lightbox__next").style.display = single ? "none" : "";
    }

    function open(i) {
      lastFocus = document.activeElement;
      render(i);
      box.classList.add("is-open");
      document.body.classList.add("lightbox-open");
      requestAnimationFrame(function () { box.classList.add("is-visible"); });
      box.querySelector(".lightbox__close").focus();
    }

    function close() {
      box.classList.remove("is-visible");
      document.body.classList.remove("lightbox-open");
      setZoom(false);
      window.setTimeout(function () { box.classList.remove("is-open"); }, 350);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function setZoom(on) {
      zoomed = on;
      box.classList.toggle("is-zoomed", on);
      imgEl.style.transform = on ? "scale(2)" : "";
    }

    triggers.forEach(function (t, i) {
      t.addEventListener("click", function (e) {
        e.preventDefault();
        open(i);
      });
    });

    box.querySelector(".lightbox__close").addEventListener("click", close);
    box.querySelector(".lightbox__prev").addEventListener("click", function () { render(current - 1); });
    box.querySelector(".lightbox__next").addEventListener("click", function () { render(current + 1); });

    // 画像クリックでズームのオン/オフ
    imgEl.addEventListener("click", function (e) {
      e.stopPropagation();
      setZoom(!zoomed);
    });
    // 背景クリックで閉じる
    box.addEventListener("click", function (e) {
      if (e.target === box || e.target.classList.contains("lightbox__stage")) close();
    });

    // キーボード操作
    document.addEventListener("keydown", function (e) {
      if (!box.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") render(current - 1);
      else if (e.key === "ArrowRight") render(current + 1);
    });
  })();

  /* ---- モバイルナビ ---- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "閉じる" : "メニュー";
    });

    // ナビ内リンクを押したら閉じる
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "メニュー";
      }
    });
  }
})();
