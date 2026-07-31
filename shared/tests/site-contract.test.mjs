import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homeUrl = new URL("../../index.html", import.meta.url);

test("the studio home links and explains all four released games", async () => {
  const html = await readFile(homeUrl, "utf8");
  const games = [
    ["pattern-atlas/", "Rotate and fit colored fragments"],
    ["lantern-grove/", "Place lanterns by row, region, and spacing clues"],
    ["signal-stack/", "Place two-tone pieces, clear full lines"],
    ["pebble-choir/", "Drop matching pebbles, grow eight voices"],
  ];

  for (const [href, description] of games) {
    assert.match(html, new RegExp(`href="${href.replace("/", "\\/")}"`));
    assert.ok(html.includes(description));
  }
});

test("the public home does not expose the source repository", async () => {
  const html = await readFile(homeUrl, "utf8");
  assert.equal(html.includes("github.com/root7925"), false);
});

test("every page wires i18n-init.js so data-i18n attributes are actually applied", async () => {
  // 回归守门：防止"页面有 data-i18n 属性但没有脚本执行翻译"的故障复发。
  // 每个游戏页面必须引入 i18n-init.js，首页也必须引入。
  const pages = [
    "../../index.html",
    "../../lantern-grove/index.html",
    "../../pattern-atlas/index.html",
    "../../signal-stack/index.html",
    "../../pebble-choir/index.html",
  ];
  for (const rel of pages) {
    const url = new URL(rel, import.meta.url);
    const html = await readFile(url, "utf8");
    assert.match(
      html,
      /<script[^>]*src="[^"]*i18n-init\.js[^"]*"/,
      `${rel} must include i18n-init.js script`,
    );
  }
});

test("every page has a #lang-switcher container for the language switcher", async () => {
  // 回归守门：每个页面必须有 #lang-switcher 容器，否则 mountLangSwitcher 无处挂载。
  const pages = [
    "../../index.html",
    "../../lantern-grove/index.html",
    "../../pattern-atlas/index.html",
    "../../signal-stack/index.html",
    "../../pebble-choir/index.html",
  ];
  for (const rel of pages) {
    const url = new URL(rel, import.meta.url);
    const html = await readFile(url, "utf8");
    assert.ok(
      html.includes('id="lang-switcher"'),
      `${rel} must have #lang-switcher container`,
    );
  }
});

test("every i18n-init.js file can be imported without syntax errors", async () => {
  // 回归守门：确保每个 i18n-init.js 语法正确、import 路径有效。
  // 之前的故障：4 个游戏页面有 data-i18n 但没引入脚本 → 切换器不显示、翻译不生效。
  const files = [
    "../../i18n-init.js",
    "../../lantern-grove/i18n-init.js",
    "../../pattern-atlas/i18n-init.js",
    "../../signal-stack/i18n-init.js",
    "../../pebble-choir/i18n-init.js",
  ];
  for (const rel of files) {
    const url = new URL(rel, import.meta.url);
    // 动态 import 验证语法 + 依赖路径
    // 注意：i18n-init.js 顶层会调 apply()，依赖 document/localStorage。
    // 在 node 环境下会 throw，但 SyntaxError 会先于运行时错误暴露。
    try {
      await import(url);
    } catch (err) {
      // 运行时错误（document 未定义）是预期的，只拒绝语法/路径错误
      if (err instanceof SyntaxError || err.code === "ERR_MODULE_NOT_FOUND") {
        assert.fail(`${rel} failed to import: ${err.message}`);
      }
    }
  }
});
