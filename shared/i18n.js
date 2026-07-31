/**
 * @module shared/i18n
 * @contract
 *  输入: messages {en:{}, zh:{}} 字典；DOM 元素 data-i18n/data-i18n-html/data-i18n-aria 属性
 *  输出: createI18n → {t, apply, getLang, onLangChange}；mountLangSwitcher 注入切换器
 *  不变式: 默认 en；localStorage 'leslie-play:lang' 持久化；支持 en/zh
 *  边界: 无 localStorage 时降级内存；未知 key 回退到 key 本身
 *  公私: PUBLIC
 *  依赖: 无
 *  状态: stable
 */
const LANG_KEY = "leslie-play:lang";
const DEFAULT_LANG = "en";
export const SUPPORTED_LANGS = ["en", "zh"];

const memLang = { value: DEFAULT_LANG };

export function getLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (SUPPORTED_LANGS.includes(saved)) return saved;
  } catch {
    return memLang.value;
  }
  return DEFAULT_LANG;
}

export function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    memLang.value = lang;
  }
  document.documentElement.lang = lang;
}

/**
 * 创建 i18n 实例。
 * @param {object} messages - { en: {key: text}, zh: {key: text} }
 * @returns {{t, apply, getLang, onLangChange}}
 */
export function createI18n(messages) {
  function resolve(key, lang) {
    return messages[lang]?.[key] ?? messages[DEFAULT_LANG]?.[key] ?? key;
  }

  function t(key, ...args) {
    let str = resolve(key, getLang());
    args.forEach((arg, i) => {
      str = str.replaceAll(`{${i}}`, String(arg));
    });
    return str;
  }

  function apply(root = document) {
    const lang = getLang();
    document.documentElement.lang = lang;
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const text = resolve(key, lang);
      if (text != null) el.textContent = text;
    });
    root.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      const text = resolve(key, lang);
      if (text != null) el.innerHTML = text;
    });
    root.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria");
      const text = resolve(key, lang);
      if (text != null) el.setAttribute("aria-label", text);
    });
  }

  function onLangChange(cb) {
    window.addEventListener("leslie-play:lang-change", () => cb(getLang()));
  }

  return { t, apply, getLang, onLangChange };
}

let styleInjected = false;
function injectStyle() {
  if (styleInjected || typeof document === "undefined") return;
  styleInjected = true;
  const css = document.createElement("style");
  css.textContent = `
.lang-switcher{display:inline-flex;gap:2px;padding:2px;border-radius:10px;background:rgba(0,0,0,.06)}
.lang-button{min-width:30px;min-height:26px;padding:0 7px;border:0;border-radius:7px;background:transparent;cursor:pointer;font-size:.72rem;font-weight:700;letter-spacing:.04em;color:inherit;opacity:.55;transition:opacity .12s,background .12s}
.lang-button:hover{opacity:.85}
.lang-button[aria-pressed="true"]{background:rgba(0,0,0,.12);opacity:1}
`;
  document.head.appendChild(css);
}

/**
 * 挂载语言切换器到容器。
 * @param {HTMLElement} container
 * @param {function} [onToggle] - 切换后回调 (lang) => void
 */
export function mountLangSwitcher(container, onToggle) {
  if (typeof document !== "undefined") injectStyle();
  const switcher = document.createElement("div");
  switcher.className = "lang-switcher";
  switcher.setAttribute("role", "group");
  switcher.setAttribute("aria-label", "Language");
  const labels = { en: "EN", zh: "中" };
  for (const lang of SUPPORTED_LANGS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lang-button";
    btn.dataset.lang = lang;
    btn.textContent = labels[lang];
    btn.setAttribute("aria-pressed", String(getLang() === lang));
    btn.addEventListener("click", () => {
      setLang(lang);
      window.dispatchEvent(
        new CustomEvent("leslie-play:lang-change", { detail: lang }),
      );
      switcher.querySelectorAll(".lang-button").forEach((b) => {
        b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
      });
      if (onToggle) onToggle(lang);
    });
    switcher.appendChild(btn);
  }
  container.appendChild(switcher);
  return switcher;
}
