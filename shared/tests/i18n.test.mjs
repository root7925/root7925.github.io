import assert from "node:assert/strict";
import test from "node:test";

// i18n.js 依赖 document/localStorage/window，测试需 mock 这些全局对象。
// mock 策略：
//   - localStorage: 内存 Map
//   - document: 最小 DOM mock（支持 createElement、querySelectorAll、documentElement）
//   - window: 事件分发
// 注意：i18n.js 模块级有 `memLang` 状态，需在测试间重置（通过 setLang + 清 localStorage）。

const messages = {
  en: {
    "nav.brand": "LESLIE·PLAY",
    "hero.title": "Small games for<br /><em>slower attention.</em>",
    "hero.intro": "I make small games.",
    "greeting": "Hello, {0}!",
    "only.en": "English only",
  },
  zh: {
    "nav.brand": "LESLIE·PLAY",
    "hero.title": "慢下来，<br /><em>玩点小的。</em>",
    "hero.intro": "我做小游戏。",
    "greeting": "你好，{0}！",
  },
};

/** 创建最小 DOM mock，支持 i18n.apply() 和 mountLangSwitcher() */
function createDomMock() {
  const elements = [];
  const styleHead = [];

  const mkElement = (attrs = {}) => ({
    tagName: "DIV",
    attributes: { ...attrs },
    _children: [],
    _textContent: null,
    _innerHTML: null,
    set textContent(v) { this._textContent = v; this._innerHTML = null; },
    get textContent() { return this._textContent; },
    set innerHTML(v) { this._innerHTML = v; },
    get innerHTML() { return this._innerHTML; },
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k] ?? null; },
    appendChild(child) { this._children.push(child); return child; },
    addEventListener() {},
    dataset: {},
  });

  const documentMock = {
    documentElement: { lang: "" },
    head: { appendChild(el) { styleHead.push(el); } },
    createElement(tag) {
      const el = mkElement();
      el.tagName = tag.toUpperCase();
      return el;
    },
    querySelectorAll(selector) {
      // 只支持 [data-i18n]、[data-i18n-html]、[data-i18n-aria] 属性选择器
      return elements.filter((el) => {
        if (selector === "[data-i18n]") return el.hasAttribute?.("data-i18n") ?? el.attributes["data-i18n"] != null;
        if (selector === "[data-i18n-html]") return el.attributes["data-i18n-html"] != null;
        if (selector === "[data-i18n-aria]") return el.attributes["data-i18n-aria"] != null;
        return false;
      });
    },
    querySelector(selector) {
      if (selector === "#lang-switcher") return elements.find((e) => e.attributes.id === "lang-switcher") ?? null;
      return null;
    },
    _elements: elements,
    _styleHead: styleHead,
    _register(el) { elements.push(el); },
  };

  const windowMock = {
    _listeners: {},
    addEventListener(type, cb) {
      (this._listeners[type] ??= []).push(cb);
    },
    dispatchEvent(ev) {
      (this._listeners[ev.type] ?? []).forEach((cb) => cb(ev));
    },
    CustomEvent(type, detail) {
      return { type, detail };
    },
  };

  return { document: documentMock, window: windowMock };
}

/** 安装全局 mock */
function installGlobals() {
  const store = new Map();
  const localStorageMock = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    _store: store,
  };

  const { document: docMock, window: winMock } = createDomMock();

  const originals = {
    document: globalThis.document,
    window: globalThis.window,
    localStorage: globalThis.localStorage,
  };

  globalThis.document = docMock;
  globalThis.window = winMock;
  globalThis.localStorage = localStorageMock;

  return {
    ...originals,
    restore() {
      globalThis.document = originals.document;
      globalThis.window = originals.window;
      globalThis.localStorage = originals.localStorage;
    },
    localStorage: localStorageMock,
    document: docMock,
    window: winMock,
  };
}

test("getLang returns default 'en' when localStorage empty", async () => {
  const g = installGlobals();
  try {
    // 动态 import 确保拿到当前模块状态
    const i18n = await import("../i18n.js?v=" + Date.now());
    g.localStorage.removeItem("leslie-play:lang");
    // 清除 memLang 的影响：先 setLang 到 en
    i18n.setLang("en");
    assert.equal(i18n.getLang(), "en");
  } finally {
    g.restore();
  }
});

test("setLang persists to localStorage and sets document lang", async () => {
  const g = installGlobals();
  try {
    const i18n = await import("../i18n.js?v=" + Date.now());
    i18n.setLang("zh");
    assert.equal(g.localStorage.getItem("leslie-play:lang"), "zh");
    assert.equal(globalThis.document.documentElement.lang, "zh");
    assert.equal(i18n.getLang(), "zh");
  } finally {
    g.restore();
  }
});

test("setLang rejects unsupported languages", async () => {
  const g = installGlobals();
  try {
    const i18n = await import("../i18n.js?v=" + Date.now());
    i18n.setLang("en"); // 先设合法值
    i18n.setLang("fr"); // 非法语言
    assert.equal(i18n.getLang(), "en"); // 仍是 en
    assert.equal(g.localStorage.getItem("leslie-play:lang"), "en");
  } finally {
    g.restore();
  }
});

test("createI18n.t resolves key for current lang with args", async () => {
  const g = installGlobals();
  try {
    const i18n = await import("../i18n.js?v=" + Date.now());
    const { t, getLang } = i18n.createI18n(messages);
    i18n.setLang("en");
    assert.equal(t("nav.brand"), "LESLIE·PLAY");
    assert.equal(t("greeting", "World"), "Hello, World!");
    i18n.setLang("zh");
    assert.equal(t("greeting", "世界"), "你好，世界！");
  } finally {
    g.restore();
  }
});

test("createI18n.t falls back to en when zh missing key, then to key itself", async () => {
  const g = installGlobals();
  try {
    const i18n = await import("../i18n.js?v=" + Date.now());
    const { t } = i18n.createI18n(messages);
    i18n.setLang("zh");
    // zh 缺 "only.en"，回退到 en
    assert.equal(t("only.en"), "English only");
    // 两边都缺，回退到 key 本身
    assert.equal(t("nonexistent.key"), "nonexistent.key");
  } finally {
    g.restore();
  }
});

test("apply() replaces textContent for [data-i18n] elements", async () => {
  const g = installGlobals();
  try {
    const i18n = await import("../i18n.js?v=" + Date.now());
    const { apply } = i18n.createI18n(messages);

    // 构造一个带 data-i18n 的元素并注册到 mock document
    const el = g.document.createElement("div");
    el.setAttribute("data-i18n", "nav.brand");
    g.document._elements.push(el);

    i18n.setLang("en");
    apply();
    assert.equal(el.textContent, "LESLIE·PLAY");

    i18n.setLang("zh");
    apply();
    assert.equal(el.textContent, "LESLIE·PLAY"); // zh 也是 LESLIE·PLAY
  } finally {
    g.restore();
  }
});

test("apply() replaces innerHTML for [data-i18n-html] elements", async () => {
  const g = installGlobals();
  try {
    const i18n = await import("../i18n.js?v=" + Date.now());
    const { apply } = i18n.createI18n(messages);

    const el = g.document.createElement("h1");
    el.setAttribute("data-i18n-html", "hero.title");
    g.document._elements.push(el);

    i18n.setLang("zh");
    apply();
    assert.equal(el.innerHTML, "慢下来，<br /><em>玩点小的。</em>");
  } finally {
    g.restore();
  }
});

test("apply() sets aria-label for [data-i18n-aria] elements", async () => {
  const g = installGlobals();
  try {
    const i18n = await import("../i18n.js?v=" + Date.now());
    const messages2 = {
      en: { "btn.close": "Close" },
      zh: { "btn.close": "关闭" },
    };
    const { apply } = i18n.createI18n(messages2);

    const el = g.document.createElement("button");
    el.setAttribute("data-i18n-aria", "btn.close");
    g.document._elements.push(el);

    i18n.setLang("zh");
    apply();
    assert.equal(el.getAttribute("aria-label"), "关闭");
  } finally {
    g.restore();
  }
});

test("mountLangSwitcher creates a button per supported language", async () => {
  const g = installGlobals();
  try {
    const i18n = await import("../i18n.js?v=" + Date.now());

    // 准备容器
    const container = g.document.createElement("div");
    container.setAttribute("id", "lang-switcher");
    g.document._elements.push(container);

    i18n.setLang("en");
    const switcher = i18n.mountLangSwitcher(container, () => {});
    assert.ok(switcher, "switcher should be returned");
    // 应该有 2 个按钮（en + zh）
    assert.equal(switcher._children.length, 2);
    // EN 按钮应标记为 pressed（当前 lang=en）
    const enBtn = switcher._children[0];
    assert.equal(enBtn.getAttribute("aria-pressed"), "true");
    const zhBtn = switcher._children[1];
    assert.equal(zhBtn.getAttribute("aria-pressed"), "false");
    // 按钮文案
    assert.equal(enBtn.textContent, "EN");
    assert.equal(zhBtn.textContent, "中");
  } finally {
    g.restore();
  }
});

test("onLangChange callback fires on language change event", async () => {
  const g = installGlobals();
  try {
    const i18n = await import("../i18n.js?v=" + Date.now());
    const { onLangChange } = i18n.createI18n(messages);

    let receivedLang = null;
    onLangChange((lang) => { receivedLang = lang; });

    i18n.setLang("zh");
    g.window.dispatchEvent({ type: "leslie-play:lang-change", detail: "zh" });
    assert.equal(receivedLang, "zh");
  } finally {
    g.restore();
  }
});

test("SUPPORTED_LANGS exports exactly en and zh", async () => {
  delete await import.meta.resolve;
  const i18n = await import("../i18n.js?v=" + Date.now());
  assert.deepEqual([...i18n.SUPPORTED_LANGS].sort(), ["en", "zh"]);
});
