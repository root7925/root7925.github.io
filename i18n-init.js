/**
 * @module i18n-init
 * 首页 i18n 初始化：应用静态翻译 + 挂载语言切换器。
 * 首页无独立 app.js，本模块是首页唯一的 i18n 入口。
 */
import { createI18n, mountLangSwitcher } from "./shared/i18n.js";
import { messages } from "./i18n-messages.js";

const { apply } = createI18n(messages);

// 先应用一次当前语言的翻译（默认 en，localStorage 持久化）。
apply();

// 挂载语言切换器到 nav 内的 #lang-switcher 容器；切换时重新 apply()。
const switcherContainer = document.querySelector("#lang-switcher");
if (switcherContainer) {
  mountLangSwitcher(switcherContainer, () => {
    apply();
  });
}
