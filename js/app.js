(function () {
  "use strict";

  const data = window.ZODIAC;
  if (!data) return;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const ICONS = {
    maps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15 3h-2.2C10.1 3 9 4.5 9 7v2H7v3h2v9h3.5v-9H15l.5-3H12.5V7.3c0-.8.2-1.3 1.3-1.3H15V3z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.2 3c.3 2.4 1.6 4.1 4.3 4.4v2.7c-1.5 0-2.9-.5-4.1-1.3v6.6c0 3.5-2.6 6.1-6.2 6.1S2 18.9 2 15.4c0-3.3 2.5-5.9 5.8-6.1v2.8c-1.7.2-3 1.6-3 3.3 0 1.8 1.5 3.3 3.3 3.3s3.3-1.5 3.3-3.3V3h2.8z"/></svg>'
  };

  const PIN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/></svg>';
  const CHEVRON = '<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  const CAMERA = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.2-2h6.2l1.2 2h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8z"/><circle cx="12" cy="12.2" r="3.2"/></svg>';

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  function escapeAttr(s) { return escapeHtml(s); }

  function copyText(text) {
    return new Promise(function (resolve) {
      if (!text) return resolve(false);
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { resolve(true); }).catch(function () {
          resolve(fallbackCopy(text));
        });
        return;
      }
      resolve(fallbackCopy(text));
    });
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.setAttribute("aria-hidden", "true");
      ta.style.cssText = "position:fixed;top:0;left:-9999px;width:1px;height:1px;opacity:0;";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);
      var ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return !!ok;
    } catch (e) {
      return false;
    }
  }

  var toastTimer;
  function toast(msg) {
    var el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-show"); }, 1800);
  }

  function flashBtn(btn, doneLabel) {
    if (!btn) return;
    var prev = btn.textContent;
    btn.classList.add("is-done");
    btn.textContent = doneLabel || "Copied ✓";
    setTimeout(function () {
      btn.classList.remove("is-done");
      btn.textContent = prev;
    }, 1600);
  }

  $$("[data-brand]").forEach(function (el) { el.textContent = data.name; });
  $$("[data-tagline]").forEach(function (el) { el.textContent = data.tagline || "Menu & Official Links"; });
  var pageUrlEl = $("[data-page-url]");
  if (pageUrlEl) pageUrlEl.textContent = data.pageUrl;

  var branches = data.branches || [];
  var openBranchId = null;
  var currentBranch = null;
  var currentMenu = [];
  var currentLayer = "none";
  var currentIndex = 0;
  var galleryBuiltFor = null;

  function findBranch(id) {
    return branches.filter(function (b) { return b.id === id; })[0] || null;
  }

  function menuMeta(branch) {
    var n = (branch.menu && branch.menu.length) || 0;
    if (n) return n + " PAGE" + (n === 1 ? "" : "S");
    return "COMING SOON";
  }

  function renderLinks(branch) {
    return (branch.links || []).map(function (link, i) {
      var pending = !link.url || link.pending;
      var href = pending ? "#" : link.url;
      var icon = ICONS[link.icon] || ICONS.maps;
      return (
        '<article class="link-card reveal' + (pending ? " is-pending" : "") + '" data-branch="' + escapeAttr(branch.id) + '" data-link-index="' + i + '">' +
          '<a class="link-main" href="' + escapeAttr(href) + '"' +
            (pending ? ' role="button"' : ' target="_blank" rel="noopener noreferrer"') + ">" +
            '<span class="brand-icon">' + icon + "</span>" +
            '<span class="link-text">' +
              '<span class="link-title">' + escapeHtml(link.title) + "</span>" +
              '<span class="link-sub">' + escapeHtml(link.subtitle || "") + "</span>" +
            "</span>" +
          "</a>" +
          '<button type="button" class="copy-btn' + (pending ? " is-disabled" : "") + '"' +
            (pending ? " disabled" : "") + ">" + (pending ? (link.badge || "Coming Soon") : "Copy Link") + "</button>" +
        "</article>"
      );
    }).join("");
  }

  var branchesRoot = $("#branches");
  if (branchesRoot) {
    branchesRoot.innerHTML = branches.map(function (branch) {
      var mid = "panel-" + branch.id;
      return (
        '<article class="accordion-item" data-branch="' + escapeAttr(branch.id) + '">' +
          '<button type="button" class="accordion-trigger" aria-expanded="false" aria-controls="' + mid + '" id="trig-' + escapeAttr(branch.id) + '">' +
            '<span class="accordion-mark">' + PIN_ICON + "</span>" +
            '<span class="accordion-copy">' +
              '<span class="accordion-title">' + escapeHtml(branch.title) + "</span>" +
              '<span class="accordion-sub">' + escapeHtml(branch.shortLabel || "") + "</span>" +
            "</span>" +
            CHEVRON +
          "</button>" +
          '<div class="accordion-panel" id="' + mid + '">' +
            '<div class="accordion-panel-inner">' +
              '<button type="button" class="menu-btn reveal" data-menu-branch="' + escapeAttr(branch.id) + '">' +
                CAMERA +
                '<span class="label"><span class="ko">Menu</span><span class="en">' + escapeHtml(menuMeta(branch)) + "</span></span>" +
              "</button>" +
              '<div class="links">' + renderLinks(branch) + "</div>" +
            "</div>" +
          "</div>" +
        "</article>"
      );
    }).join("");
  }

  function setOpenBranch(id, push) {
    var next = (id && findBranch(id)) ? id : null;
    if (openBranchId === next) return;
    openBranchId = next;
    $$(".accordion-item").forEach(function (el) {
      var open = el.getAttribute("data-branch") === next;
      el.classList.toggle("is-open", open);
      var trig = el.querySelector(".accordion-trigger");
      if (trig) trig.setAttribute("aria-expanded", open ? "true" : "false");
    });
    if (push) {
      var hash = next ? ("#" + next) : (location.pathname + location.search);
      history.pushState({ layer: next ? "branch" : "none", branch: next || "" }, "", hash);
    }
  }

  function toggleBranch(id) {
    if (openBranchId === id) setOpenBranch(null, true);
    else setOpenBranch(id, true);
  }

  if (branchesRoot) {
    branchesRoot.addEventListener("click", function (e) {
      var trig = e.target.closest(".accordion-trigger");
      if (trig) {
        var item = trig.closest(".accordion-item");
        if (item) toggleBranch(item.getAttribute("data-branch"));
        return;
      }
      var menuBtn = e.target.closest("[data-menu-branch]");
      if (menuBtn) {
        requestOpenMenu(menuBtn.getAttribute("data-menu-branch"));
        return;
      }
      var copyBtn = e.target.closest(".copy-btn");
      if (copyBtn && copyBtn.closest(".link-card")) {
        var card = copyBtn.closest(".link-card");
        var branch = findBranch(card.getAttribute("data-branch"));
        var link = branch && branch.links[Number(card.getAttribute("data-link-index"))];
        if (!link) return;
        if (!link.url || link.pending) {
          toast(link.pendingToast || "This link will be added soon.");
          return;
        }
        copyText(link.url).then(function (ok) {
          if (ok) { flashBtn(copyBtn); toast("Link copied!"); }
          else toast("Couldn't copy. Please long-press the link to copy.");
        });
        return;
      }
      var main = e.target.closest(".link-main");
      if (main && main.closest(".link-card.is-pending")) {
        e.preventDefault();
        var card2 = main.closest(".link-card");
        var branch2 = findBranch(card2.getAttribute("data-branch"));
        var link2 = branch2 && branch2.links[Number(card2.getAttribute("data-link-index"))];
        toast((link2 && link2.pendingToast) || "This link will be added soon.");
      }
    });
  }

  var shareBtn = $("#share-copy");
  if (shareBtn) {
    shareBtn.addEventListener("click", function () {
      copyText(data.pageUrl).then(function (ok) {
        if (ok) { flashBtn(shareBtn, "Copied ✓"); toast("Page link copied!"); }
        else toast("Couldn't copy the link.");
      });
    });
  }

  /* ----- menu modal + lightbox ----- */
  var modal = $("#menu-modal");
  var lightbox = $("#lightbox");
  var gallery = $("#gallery");
  var chips = $("#chips");
  var lbImg = $("#lb-img");
  var lbCap = $("#lb-cap");
  var lbStage = $("#lb-stage");
  var menuTitle = $("#menu-title");

  function requestOpenMenu(branchId) {
    var branch = findBranch(branchId);
    if (!branch) return;
    var items = branch.menu || [];
    if (!items.length) {
      toast(branch.menuComingSoonToast || "Menu photos will be added soon.");
      return;
    }
    if (openBranchId !== branchId) setOpenBranch(branchId, false);
    applyLayer("lightbox" === currentLayer ? "menu" : "menu", 0, true, branchId);
  }

  function buildGallery(branch) {
    currentBranch = branch;
    currentMenu = branch.menu || [];
    galleryBuiltFor = branch.id;
    if (menuTitle) menuTitle.textContent = branch.title + " MENU";
    if (chips) chips.style.display = "none";
    if (!currentMenu.length) {
      gallery.innerHTML = '<div class="placeholder"><strong>Menu photos coming soon.</strong></div>';
      return;
    }
    gallery.innerHTML = currentMenu.map(function (it, abs) {
      return (
        '<figure class="gallery-item" data-index="' + abs + '">' +
          '<img alt="' + escapeAttr(it.title) + '" data-src="' + escapeAttr(it.src) + '" />' +
          '<figcaption class="gallery-cap"><span class="ttl">' + escapeHtml(it.title) + "</span>" +
          '<span class="idx">' + (abs + 1) + " / " + currentMenu.length + "</span></figcaption>" +
        "</figure>"
      );
    }).join("");
    $$(".gallery-item img", gallery).forEach(function (img) {
      img.src = img.getAttribute("data-src");
    });
  }

  function openMenuVisual(branchId) {
    var branch = findBranch(branchId);
    if (!branch) return;
    if (galleryBuiltFor !== branchId) buildGallery(branch);
    modal.classList.add("is-open");
    document.body.classList.add("no-scroll");
  }

  function closeMenuVisual() {
    modal.classList.remove("is-open");
    if (!lightbox.classList.contains("is-open")) document.body.classList.remove("no-scroll");
  }

  function showLightbox(index) {
    if (!currentMenu[index]) return;
    currentIndex = index;
    var it = currentMenu[index];
    if (lbImg.getAttribute("src") !== it.src) lbImg.src = it.src;
    lbImg.alt = it.title;
    lbCap.textContent = it.title + "  ·  " + (index + 1) + " / " + currentMenu.length;
    lbStage.classList.remove("is-zoomed");
    lightbox.classList.add("is-open");
    document.body.classList.add("no-scroll");
  }

  function hideLightbox() {
    lightbox.classList.remove("is-open");
    if (lbStage) lbStage.classList.remove("is-zoomed");
  }

  function applyLayer(layer, index, push, branchId) {
    var bid = branchId || (currentBranch && currentBranch.id) || openBranchId;
    if (layer === "lightbox") {
      if (bid) openMenuVisual(bid);
      showLightbox(index);
    } else if (layer === "menu") {
      hideLightbox();
      if (bid) openMenuVisual(bid);
    } else {
      hideLightbox();
      closeMenuVisual();
    }
    currentLayer = layer || "none";
    if (push) {
      var hash;
      if (layer === "lightbox") hash = "#" + bid + "-photo-" + (index + 1);
      else if (layer === "menu") hash = "#" + bid + "-menu";
      else if (openBranchId) hash = "#" + openBranchId;
      else hash = location.pathname + location.search;
      history.pushState({ layer: layer || "none", index: index || 0, branch: bid || openBranchId || "" }, "", hash);
    }
  }

  function requestClose() {
    if (currentLayer === "none") return;
    history.back();
  }

  if (gallery) {
    gallery.addEventListener("click", function (e) {
      var item = e.target.closest(".gallery-item");
      if (!item) return;
      var index = Number(item.getAttribute("data-index"));
      applyLayer("lightbox", index, true, currentBranch && currentBranch.id);
    });
  }

  $("#close-menu") && $("#close-menu").addEventListener("click", requestClose);
  $("#lb-close") && $("#lb-close").addEventListener("click", requestClose);
  $("#lb-prev") && $("#lb-prev").addEventListener("click", function (e) { e.stopPropagation(); step(-1); });
  $("#lb-next") && $("#lb-next").addEventListener("click", function (e) { e.stopPropagation(); step(1); });
  $("#lb-zoom") && $("#lb-zoom").addEventListener("click", function () {
    lbStage.classList.toggle("is-zoomed");
  });
  if (lbImg) {
    lbImg.addEventListener("click", function (e) {
      e.stopPropagation();
      lbStage.classList.toggle("is-zoomed");
    });
  }

  function step(dir) {
    if (!currentMenu.length) return;
    var next = (currentIndex + dir + currentMenu.length) % currentMenu.length;
    currentIndex = next;
    showLightbox(next);
    var bid = currentBranch && currentBranch.id;
    history.replaceState({ layer: "lightbox", index: next, branch: bid || "" }, "", "#" + bid + "-photo-" + (next + 1));
  }

  var startX = 0, startY = 0, tracking = false;
  if (lbStage) {
    lbStage.addEventListener("touchstart", function (e) {
      if (lbStage.classList.contains("is-zoomed")) return;
      var t = e.changedTouches[0];
      startX = t.clientX; startY = t.clientY; tracking = true;
    }, { passive: true });
    lbStage.addEventListener("touchend", function (e) {
      if (!tracking) return;
      tracking = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - startX;
      var dy = t.clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  document.addEventListener("keydown", function (e) {
    if (currentLayer === "none" && !openBranchId) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (currentLayer !== "none") requestClose();
      else if (openBranchId) setOpenBranch(null, true);
    }
    if (currentLayer === "lightbox") {
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    }
  });

  function applyState(state) {
    var layer = (state && state.layer) || "none";
    var bid = (state && state.branch) || "";
    if (bid && openBranchId !== bid) setOpenBranch(bid, false);
    if (!bid && layer === "none" && openBranchId) setOpenBranch(null, false);
    if (layer === "lightbox") {
      openMenuVisual(bid);
      showLightbox((state && state.index) || 0);
    } else if (layer === "menu") {
      hideLightbox();
      openMenuVisual(bid);
    } else if (layer === "branch") {
      hideLightbox();
      closeMenuVisual();
    } else {
      hideLightbox();
      closeMenuVisual();
    }
    currentLayer = (layer === "branch") ? "none" : layer;
    if (currentLayer === "none") document.body.classList.remove("no-scroll");
  }

  window.addEventListener("popstate", function (e) {
    applyState(e.state || parseHash());
  });

  function parseHash() {
    var hash = (location.hash || "").replace(/^#/, "");
    if (!hash) return { layer: "none", branch: "", index: 0 };
    var photo = hash.match(/^([a-z0-9-]+)-photo-(\d+)$/i);
    if (photo && findBranch(photo[1])) {
      return { layer: "lightbox", branch: photo[1], index: Math.max(0, parseInt(photo[2], 10) - 1) };
    }
    var menu = hash.match(/^([a-z0-9-]+)-menu$/i);
    if (menu && findBranch(menu[1])) {
      return { layer: "menu", branch: menu[1], index: 0 };
    }
    if (findBranch(hash)) return { layer: "branch", branch: hash, index: 0 };
    return { layer: "none", branch: "", index: 0 };
  }

  function bootFromHash() {
    var state = parseHash();
    if (state.layer === "none" && !state.branch) {
      history.replaceState({ layer: "none", branch: "", index: 0 }, "", location.pathname + location.search);
      currentLayer = "none";
      return;
    }
    var hash = location.hash;
    history.replaceState(state, "", hash || (location.pathname + location.search));
    applyState(state);
  }

  bootFromHash();
})();
