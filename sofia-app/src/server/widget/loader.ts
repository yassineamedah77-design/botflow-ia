/*
 * widget.js, the one line an establishment adds to its website:
 *
 *   <script src="https://sofia.botflow-ia.fr/widget.js" data-sofia="sof_…" async></script>
 *
 * It asks SOFIA whether the widget may show on this domain, then draws a
 * launcher button in a shadow root (the site's CSS cannot reach it, and it
 * cannot reach the site's) and opens the conversation in a sandboxed iframe
 * served by SOFIA: the conversation itself is out of the page's reach. Nothing from the host page is read except its
 * address and the browser's languages. Plain ES2017, no dependencies.
 */
export const WIDGET_LOADER = String.raw`(function () {
  "use strict";
  var script = document.currentScript || document.querySelector("script[data-sofia]");
  if (!script) return;
  var id = script.getAttribute("data-sofia") || "";
  if (!/^sof_[A-Za-z0-9_-]{16,40}$/.test(id) || window["__sofia_" + id]) return;
  window["__sofia_" + id] = true;
  var base;
  try { base = new URL(script.src).origin; } catch (error) { return; }

  var LABELS = {
    fr: { open: "Discuter avec nous", close: "Fermer la conversation", frame: "Conversation" },
    pt: { open: "Fale connosco", close: "Fechar a conversa", frame: "Conversa" },
    en: { open: "Chat with us", close: "Close the chat", frame: "Chat" }
  };
  var SESSION_KEY = "sofia:" + id + ":session";

  function pickLanguage(languages, fallback) {
    var preferred = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
    for (var i = 0; i < preferred.length; i++) {
      var code = String(preferred[i]).toLowerCase().split("-")[0];
      if (LABELS[code] && languages.indexOf(code) !== -1) return code;
    }
    if (LABELS[fallback] && languages.indexOf(fallback) !== -1) return fallback;
    for (var j = 0; j < languages.length; j++) if (LABELS[languages[j]]) return languages[j];
    return "fr";
  }

  function remembered() {
    try { return window.localStorage.getItem(SESSION_KEY) === "1"; } catch (error) { return false; }
  }

  function remember() {
    try { window.localStorage.setItem(SESSION_KEY, "1"); } catch (error) { /* storage blocked: no preload */ }
  }

  var ICON_CHAT = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5v-8Z" fill="currentColor"/></svg>';
  var ICON_CLOSE = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  function mount(config) {
    var language = pickLanguage(config.languages || ["fr"], config.defaultLanguage || "fr");
    var labels = LABELS[language];
    var accent = /^#[0-9a-fA-F]{6}$/.test(config.accentColor || "") ? config.accentColor : "#d97757";
    var side = config.position === "left" ? "left" : "right";

    var host = document.createElement("div");
    host.setAttribute("data-sofia-widget", "");
    host.style.cssText = "position:fixed;bottom:0;" + side + ":0;width:0;height:0;z-index:2147483000;";
    var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

    var style = document.createElement("style");
    style.textContent =
      ":host{all:initial}" +
      ".launcher{position:fixed;bottom:20px;" + side + ":20px;width:60px;height:60px;border:0;border-radius:50%;background:" + accent + ";color:#fff;" +
      "display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 10px 30px rgba(22,21,20,.22),0 2px 6px rgba(22,21,20,.12);" +
      "transition:transform .18s ease,box-shadow .18s ease;-webkit-tap-highlight-color:transparent}" +
      ".launcher:hover{transform:translateY(-2px) scale(1.03);box-shadow:0 14px 34px rgba(22,21,20,.26),0 3px 8px rgba(22,21,20,.14)}" +
      ".launcher:focus-visible{outline:3px solid " + accent + ";outline-offset:3px}" +
      ".badge{position:absolute;top:-3px;right:-3px;min-width:20px;height:20px;padding:0 6px;box-sizing:border-box;border-radius:10px;" +
      "background:#e5484d;color:#fff;font:600 12px/20px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;border:2px solid #fff;display:none}" +
      ".panel{position:fixed;bottom:92px;" + side + ":20px;width:384px;height:min(640px,calc(100vh - 116px));border-radius:20px;overflow:hidden;background:#faf8f5;" +
      "box-shadow:0 24px 64px rgba(22,21,20,.2),0 4px 14px rgba(22,21,20,.1);opacity:0;transform:translateY(12px) scale(.98);transform-origin:bottom " + side + ";" +
      "pointer-events:none;visibility:hidden;transition:opacity .2s ease,transform .2s ease,visibility 0s linear .2s}" +
      ".panel.open{opacity:1;transform:none;pointer-events:auto;visibility:visible;transition:opacity .2s ease,transform .2s ease}" +
      "iframe{width:100%;height:100%;border:0;display:block;background:transparent}" +
      "@media (max-width:520px){.panel{inset:0;bottom:0;width:100%;height:100%;height:100dvh;border-radius:0}.launcher.open{display:none}}" +
      "@media (prefers-reduced-motion:reduce){.launcher,.panel,.panel.open{transition:none}}";
    root.appendChild(style);

    var launcher = document.createElement("button");
    launcher.type = "button";
    launcher.className = "launcher";
    launcher.setAttribute("aria-label", labels.open);
    launcher.setAttribute("aria-expanded", "false");
    launcher.innerHTML = ICON_CHAT;
    var badge = document.createElement("span");
    badge.className = "badge";
    badge.setAttribute("aria-hidden", "true");
    launcher.appendChild(badge);

    var panel = document.createElement("div");
    panel.className = "panel";
    var frame = null;
    var isOpen = false;

    function post(type) {
      if (frame && frame.contentWindow) frame.contentWindow.postMessage({ sofia: true, type: type }, base);
    }

    function ensureFrame() {
      if (frame) return frame;
      frame = document.createElement("iframe");
      frame.title = labels.frame;
      frame.setAttribute("referrerpolicy", "origin");
      frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox");
      frame.src = base + "/widget/" + encodeURIComponent(id) + "?lang=" + language + "&page=" + encodeURIComponent(String(location.href).slice(0, 500));
      panel.appendChild(frame);
      return frame;
    }

    function setBadge(count) {
      badge.textContent = count > 9 ? "9+" : String(count);
      badge.style.display = count > 0 && !isOpen ? "block" : "none";
    }

    function open() {
      ensureFrame();
      isOpen = true;
      panel.classList.add("open");
      launcher.classList.add("open");
      launcher.setAttribute("aria-expanded", "true");
      launcher.setAttribute("aria-label", labels.close);
      launcher.innerHTML = ICON_CLOSE;
      launcher.appendChild(badge);
      setBadge(0);
      post("open");
      setTimeout(function () { if (isOpen && frame) frame.focus(); }, 60);
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      panel.classList.remove("open");
      launcher.classList.remove("open");
      launcher.setAttribute("aria-expanded", "false");
      launcher.setAttribute("aria-label", labels.open);
      launcher.innerHTML = ICON_CHAT;
      launcher.appendChild(badge);
      post("close");
      launcher.focus();
    }

    launcher.addEventListener("click", function () { if (isOpen) close(); else open(); });
    document.addEventListener("keydown", function (event) { if (isOpen && event.key === "Escape") close(); });
    window.addEventListener("message", function (event) {
      if (event.origin !== base || !frame || event.source !== frame.contentWindow) return;
      var data = event.data;
      if (!data || data.sofia !== true) return;
      if (data.type === "close") close();
      else if (data.type === "ready") post(isOpen ? "open" : "close");
      else if (data.type === "session") remember();
      else if (data.type === "unread") setBadge(Number(data.count) || 0);
    });

    root.appendChild(panel);
    root.appendChild(launcher);
    (document.body || document.documentElement).appendChild(host);

    // A visitor who already wrote: load the conversation quietly so a reply from the team shows on the launcher.
    if (remembered()) setTimeout(ensureFrame, 1500);

    window.SofiaWidget = { open: open, close: close };
  }

  fetch(base + "/api/widget/" + encodeURIComponent(id) + "/config", { credentials: "omit" })
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(function (config) {
      if (config && config.enabled) mount(config);
      else if (window.console) console.info("[SOFIA] Le widget n'est pas autorisé sur " + location.hostname + " (domaines autorisés : réglages du canal Site web).");
    })
    .catch(function () { /* SOFIA unreachable: the site works as before */ });
})();
`;
