/**
 * @module lantern-grove/i18n-messages
 * Lantern Grove 的中英文案字典。
 * 静态文案由 data-i18n 属性驱动（见 index.html）；
 * 动态文案由 app.js 调用 t("key") 生成。
 */
export const messages = {
  en: {
    "nav.brand": "LESLIE·PLAY",
    "nav.soundOn": "Sound on",
    "nav.soundOff": "Sound off",
    "nav.howToPlay": "How to play",

    "intro.eyebrow": "A quiet logic collection",
    "intro.title": "Lantern Grove",
    "intro.body": "Place one light in every row, column, and garden. Lights may not touch.",

    "meta.groveLabel": "Grove {0}",
    "meta.progress": "Lights {0}/{1} · Rows {2}/{1} · Columns {3}/{1} · Gardens {4}/{1}",

    "rule.goal": "Goal: one light in every row, column, and colored garden.",
    "rule.noTouch": "Lights cannot touch—not even diagonally.",
    "rule.status.first": "Tap any square to place your first light. Red lights break a rule.",
    "rule.status.good": "Good. Keep every row, column, and colored garden to one light.",
    "rule.status.marked": "Marked empty. Use marks to eliminate impossible squares.",
    "rule.status.cleared": "Square cleared. Tap another square when you are ready.",
    "rule.status.conflict": "Red lights conflict: they share a row, column, garden, or touch.",

    "controls.light": "Light",
    "controls.mark": "Mark",
    "controls.undo": "Undo",
    "controls.restart": "Restart",

    "collection.eyebrow": "Collection 01",
    "collection.title": "Twenty groves",

    "footer.madeBy": "Designed and built by Leslie. No ads, no account, no tracking.",
    "footer.next": "Play Pattern Atlas →",

    "help.title": "Light every garden.",
    "help.rule1": "Place exactly one lantern in each row.",
    "help.rule2": "Place exactly one lantern in each column.",
    "help.rule3": "Place exactly one lantern in each colored garden.",
    "help.rule4": "Lanterns cannot touch, even diagonally.",
    "help.mark": "Use <strong>Mark</strong> to cross out cells you know are empty.",
    "help.gestures": "Tap a square to place a lantern; tap again to remove. Switch to Mark mode to cross out cells. Tap a numbered chip to jump between groves.",
    "help.begin": "Begin",

    "win.eyebrow": "Pattern restored",
    "win.title": "Every garden is glowing.",
    "win.copy": "Grove {0} restored in {1} moves and {2}s.",
    "win.shareCard": "Share card",
    "win.shareCaption": "Screenshot or tap Share to send this card.",
    "win.next": "Next grove →",
    "win.stay": "Stay here",

    "share.sent": "Card sent.",
    "share.copied": "Card copied to clipboard. Paste it anywhere.",
    "share.downloaded": "Card saved to your device. Link copied too.",
    "share.unavailable": "Sharing is unavailable in this browser.",

    "difficulty.Dawn": "Dawn",
    "difficulty.Mist": "Mist",
    "difficulty.Dusk": "Dusk",
    "difficulty.Glow": "Glow",
  },
  zh: {
    "nav.brand": "LESLIE·PLAY",
    "nav.soundOn": "音效开",
    "nav.soundOff": "音效关",
    "nav.howToPlay": "玩法",

    "intro.eyebrow": "静谧逻辑系列",
    "intro.title": "灯笼林",
    "intro.body": "在每行、每列、每座花园各放一盏灯。灯与灯不能相邻。",

    "meta.groveLabel": "林 {0}",
    "meta.progress": "灯 {0}/{1} · 行 {2}/{1} · 列 {3}/{1} · 园 {4}/{1}",

    "rule.goal": "目标：每行、每列、每座有色花园各一盏灯。",
    "rule.noTouch": "灯不能相邻——斜对角也不行。",
    "rule.status.first": "点任意格子放下第一盏灯。红色表示违反规则。",
    "rule.status.good": "不错。保持每行、每列、每座花园只有一盏灯。",
    "rule.status.marked": "已标记为空。用标记排除不可能的格子。",
    "rule.status.cleared": "格子已清空。准备好就点下一个格子。",
    "rule.status.conflict": "红灯冲突：它们共用了行、列、花园或相邻。",

    "controls.light": "放灯",
    "controls.mark": "标记",
    "controls.undo": "撤销",
    "controls.restart": "重开",

    "collection.eyebrow": "第一集",
    "collection.title": "二十片林",

    "footer.madeBy": "由 Leslie 设计开发。无广告、无账号、无追踪。",
    "footer.next": "玩 Pattern Atlas →",

    "help.title": "点亮每座花园。",
    "help.rule1": "每行恰好放一盏灯。",
    "help.rule2": "每列恰好放一盏灯。",
    "help.rule3": "每座有色花园恰好放一盏灯。",
    "help.rule4": "灯不能相邻，斜对角也不行。",
    "help.mark": "用<strong>标记</strong>划掉你确定是空的格子。",
    "help.gestures": "点格子放灯，再点一次移除。切换到标记模式可划掉格子。点底部编号可跳转关卡。",
    "help.begin": "开始",

    "win.eyebrow": "图案已复原",
    "win.title": "每座花园都亮了。",
    "win.copy": "林 {0} 用 {1} 步、{2} 秒完成。",
    "win.shareCard": "分享卡片",
    "win.shareCaption": "截图或点分享发送这张卡片。",
    "win.next": "下一片林 →",
    "win.stay": "留在这里",

    "share.sent": "卡片已发送。",
    "share.copied": "卡片已复制到剪贴板，可粘贴到任意位置。",
    "share.downloaded": "卡片已保存到设备，链接也已复制。",
    "share.unavailable": "此浏览器不支持分享。",

    "difficulty.Dawn": "晨光",
    "difficulty.Mist": "薄雾",
    "difficulty.Dusk": "暮色",
    "difficulty.Glow": "辉光",
  },
};
