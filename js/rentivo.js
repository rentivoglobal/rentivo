(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const listings = (window.RENTIVO && RENTIVO.listings) || [];
  const gsapReady = typeof window.gsap !== "undefined";

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }
  function qsa(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function initNav() {
    const nav = qs(".nav");
    const btn = qs(".menu-btn");
    if (!nav || !btn) return;
    btn.addEventListener("click", function () {
      const open = nav.classList.toggle("is-open");
      btn.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("nav-open", open);
    });
    function closeNav() {
      nav.classList.remove("is-open");
      btn.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
    }
    qsa(".nav-links a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 880) closeNav();
    });
  }

  function initPageEnter() {
    document.body.classList.add("page-enter");
    requestAnimationFrame(function () {
      if (reduce || !gsapReady) {
        document.body.classList.remove("page-enter");
        return;
      }
      const items = qsa(".nav, .hero-copy, .search, .trust-inline, .map-wrap, .page-hero > *").filter(Boolean);
      gsap.fromTo(
        items,
        { y: 28, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: "power3.out", onComplete: function () {
            document.body.classList.remove("page-enter");
          }
        }
      );
    });
  }

  function initReveals() {
    const nodes = qsa(".reveal, .goal-card, .time-track");
    if (!nodes.length) return;
    if (reduce) {
      nodes.forEach(function (n) { n.classList.add("is-in"); });
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -40px 0px" });
    nodes.forEach(function (n) { io.observe(n); });
  }

  function initWhyTrack() {
    const track = qs(".why-track");
    if (!track) return;
    qsa("[data-scroll]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const dir = Number(btn.getAttribute("data-scroll") || 300);
        track.scrollBy({ left: dir, behavior: reduce ? "auto" : "smooth" });
      });
    });
  }

  function listingById(id) {
    return listings.find(function (item) { return item.id === id; }) || listings[1] || listings[0];
  }

  function cardHtml(item, compact) {
    const badge = item.verified
      ? '<span class="verified-tag">Verified</span>'
      : '<span class="verified-tag">In review</span>';
    const pin = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.2" fill="currentColor"/></svg>';
    const ruler = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 8h16v8H4z" stroke="currentColor" stroke-width="1.7"/><path d="M8 8v3M12 8v3M16 8v3" stroke="currentColor" stroke-width="1.7"/></svg>';
    const bed = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 18V9h16v9M4 13h16M7 9V7h4v2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
    const bath = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 13h14v3a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-3zM7 13V9a3 3 0 0 1 6 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
    return (
      '<div class="photo" style="background-image:url(\'' + item.photo + '\')">' +
      badge +
      "</div>" +
      '<div class="body">' +
      '<div class="title">' + item.title + "</div>" +
      '<div class="loc">' + pin + item.loc + "</div>" +
      '<div class="specs"><span>' + ruler + item.size + "</span><span>" + bed + item.beds + "</span><span>" + bath + item.baths + "</span></div>" +
      '<div class="foot"><div class="price">' + item.price + "<span>" + item.period + "</span></div>" +
      (compact ? "" : '<a class="view-btn" href="save.html?id=' + item.id + '">View listing</a>') +
      "</div>" +
      "</div>"
    );
  }

  function initLiveMap() {
    const pinsEl = qs("#hero-pins");
    const stage = qs("#featured-card");
    const scene = qs(".hero-scene");
    const connector = qs("#connector-line");
    if (!listings.length || !stage) return;

    const count = qs(".map-count");
    if (count) count.textContent = String(listings.length);

    let index = 1 % listings.length;
    let timer = null;
    const cycleMs = 5000;
    const pins = [];

    if (pinsEl) {
      listings.forEach(function (item, i) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "photo-pin" + (item.verified ? " is-verified" : "");
        btn.style.left = item.x + "%";
        btn.style.top = item.y + "%";
        btn.setAttribute("aria-label", item.title);
        btn.innerHTML =
          '<span class="pin-tip" aria-hidden="true"></span>' +
          '<span class="pin-head"><img src="' + item.photo + '" alt=""></span>' +
          (item.verified ? '<span class="pin-check" aria-hidden="true"></span>' : "");
        btn.addEventListener("click", function () {
          render(i, false);
          play();
        });
        pinsEl.appendChild(btn);
        pins.push(btn);
      });
    }

    function drawConnector() {
      if (!connector || !scene || !pins[index]) return;
      const sceneBox = scene.getBoundingClientRect();
      const pinBox = pins[index].getBoundingClientRect();
      const cardBox = stage.getBoundingClientRect();
      const x1 = pinBox.left + pinBox.width / 2 - sceneBox.left;
      const y1 = pinBox.bottom - sceneBox.top - 4;
      const x2 = cardBox.left + cardBox.width / 2 - sceneBox.left;
      const y2 = cardBox.top - sceneBox.top + 12;
      const lift = Math.max(28, Math.min(70, Math.abs(x2 - x1) * 0.14));
      const cx = (x1 + x2) / 2;
      const cy = Math.max(18, Math.min(y1, y2) - lift);
      connector.setAttribute("d", "M " + x1 + " " + y1 + " Q " + cx + " " + cy + " " + x2 + " " + y2);
    }

    function render(next, instant) {
      index = next;
      const item = listings[index];
      pins.forEach(function (pin, i) {
        pin.classList.toggle("is-active", i === index);
      });
      const apply = function () {
        stage.innerHTML = cardHtml(item, false);
      };
      if (instant || reduce || !gsapReady) {
        apply();
        window.requestAnimationFrame(drawConnector);
        return;
      }
      gsap.to(stage, {
        y: 14, opacity: 0, duration: 0.28, ease: "power2.in",
        onComplete: function () {
          apply();
          gsap.fromTo(stage, { y: -12, opacity: 0 }, {
            y: 0, opacity: 1, duration: 0.45, ease: "power3.out",
            onUpdate: drawConnector,
            onComplete: drawConnector
          });
        }
      });
    }

    function play() {
      stop();
      if (reduce) return;
      timer = window.setInterval(function () {
        render((index + 1) % listings.length, false);
      }, cycleMs);
    }
    function stop() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }

    if (scene) {
      scene.addEventListener("mouseenter", stop);
      scene.addEventListener("mouseleave", play);
    }
    window.addEventListener("resize", drawConnector);

    render(index, true);
    play();
  }

  function initChips() {
    qsa(".chip-pick").forEach(function (group) {
      group.addEventListener("click", function (e) {
        const btn = e.target.closest("button");
        if (!btn) return;
        if (group.hasAttribute("data-multi")) {
          btn.classList.toggle("is-on");
        } else {
          qsa("button", group).forEach(function (b) { b.classList.remove("is-on"); });
          btn.classList.add("is-on");
        }
      });
    });
  }

  function initForms() {
    qsa("[data-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        const body = qs(".form-body", form);
        const success = qs(".success", form);
        if (body) body.classList.add("is-off");
        if (success) success.classList.add("is-on");
        const mark = qs(".bookmark");
        if (mark) mark.classList.add("is-in");
        if (gsapReady && !reduce && success) {
          gsap.fromTo(success, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
        }
      });
    });
  }

  function initSavePage() {
    const preview = qs("[data-save-preview]");
    if (!preview || !listings.length) return;
    const params = new URLSearchParams(window.location.search);
    const item = listingById(params.get("id") || "bodija-duplex");
    preview.innerHTML =
      '<div class="home-card">' +
      '<div class="photo" style="background-image:url(\'' + item.photo + '\')">' +
      '<div class="tags">' +
      (item.verified ? '<span class="tag">Verified</span>' : '<span class="tag">In review</span>') +
      "</div>" +
      "</div>" +
      '<div class="body">' +
      "<h3>" + item.title + "</h3>" +
      '<div class="meta">' + item.loc + " · " + item.lister + "</div>" +
      '<p class="meta">' + item.scope + "</p>" +
      '<div class="row"><div class="price">' + item.price + "<span>" + item.period + "</span></div>" +
      '<a class="view-btn" href="save.html?id=' + item.id + '">Save listing</a></div>' +
      "</div>" +
      "</div>";
    const title = qs("[data-save-title]");
    if (title) title.textContent = "Save “" + item.title + "”";
  }

  function showEggToast(message) {
    let el = qs(".egg-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "egg-toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("is-on");
    window.clearTimeout(showEggToast._t);
    showEggToast._t = window.setTimeout(function () {
      el.classList.remove("is-on");
    }, 2800);
  }

  function initEggs() {
    const badge = qs(".badge");
    if (badge) {
      let taps = 0;
      badge.style.cursor = "pointer";
      badge.addEventListener("click", function () {
        taps += 1;
        if (taps === 5) {
          showEggToast("Still Ibadan. That’s the point.");
          document.body.classList.add("egg-wiggle");
          window.setTimeout(function () { document.body.classList.remove("egg-wiggle"); }, 600);
          taps = 0;
        }
      });
    }

    qsa(".footer-col h4").forEach(function (heading) {
      if (heading.textContent.trim() !== "Ibadan") return;
      let taps = 0;
      heading.style.cursor = "pointer";
      heading.addEventListener("click", function () {
        taps += 1;
        if (taps === 3) {
          showEggToast("Oyo State. Obviously.");
          taps = 0;
        }
      });
    });

    const keys = [];
    const konami = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    window.addEventListener("keydown", function (e) {
      keys.push(e.key);
      if (keys.length > konami.length) keys.shift();
      if (keys.join() === konami.join()) {
        showEggToast("You unlocked nothing. Browsing is already free.");
        keys.length = 0;
      }
    });
  }

  function initCoveragePulse() {
    const chips = qsa(".footer-places a, .coverage-chips span");
    if (!chips.length || reduce) return;
    let i = 0;
    window.setInterval(function () {
      chips.forEach(function (c) { c.style.transform = ""; });
      chips[i % chips.length].style.transform = "translateY(-3px)";
      i += 1;
    }, 1400);
  }

  function initEmailPrefill() {
    const input = qs("#email");
    if (!input) return;
    const email = new URLSearchParams(window.location.search).get("email");
    if (email) input.value = email;
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initPageEnter();
    initReveals();
    initWhyTrack();
    initLiveMap();
    initChips();
    initForms();
    initSavePage();
    initCoveragePulse();
    initEmailPrefill();
    initEggs();
  });
})();
