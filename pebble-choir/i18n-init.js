/**
 * @module pebble-choir/i18n-init
 * Pebble Choir i18n 初始化：应用翻译 + 挂载语言切换器。
 */
import { createI18n, mountLangSwitcher } from "../shared/i18n.js";
import { messages } from "./i18n-messages.js";

const { apply } = createI18n(messages);
apply();

const switcherContainer = document.querySelector("#lang-switcher");
if (switcherContainer) {
  mountLangSwitcher(switcherContainer, () => apply());
}
