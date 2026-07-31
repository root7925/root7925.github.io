/**
 * @module pebble-choir/i18n-messages
 * Pebble Choir 的中英文案字典。
 * 静态文案由 data-i18n 属性驱动（见 index.html）；
 * 动态文案由 app.js 调用 t("key") 生成。
 */
export const messages = {
  en: {
    "nav.brand": "LESLIE·PLAY",
    "nav.soundOn": "Sound on",
    "nav.soundOff": "Sound off",
    "nav.leaderboard": "Leaderboard",
    "nav.newRun": "New run",

    "intro.eyebrow": "A pocket physics toy",
    "intro.title": "Pebble<br />Choir",
    "intro.body": "Drop a note. Match two. Grow a choir.",
    "intro.gestures": "Tap inside the vessel to drop a pebble. Match two equal voices to merge. Keep the rim clear.",

    "score.label": "Score",
    "score.next": "Next note",
    "score.best": "Best",

    "vessel.aria": "Tap to drop a pebble into the choir vessel",

    "status.dropFirst": "Tap anywhere in the vessel to drop the first note.",
    "status.settle": "Let that note settle for a moment.",
    "status.matchVoices": "Match equal voices. Keep the rim clear.",
    "status.harmony": "{0}-note harmony. The vessel is singing.",
    "status.joined": "{0} joined the choir.",

    "ladder.eyebrow": "Eight voices",
    "ladder.title": "Every merge adds a note.",

    "footer.madeBy": "Physics by Matter.js · no ads, account, or tracking.",
    "footer.next": "Play Lantern Grove →",

    "gameover.eyebrow": "The vessel is full",
    "gameover.titlePrefix": "Your choir reached ",
    "gameover.titleSuffix": ".",
    "gameover.pointsLabel": " points",
    "gameover.bestLabel": "best ",
    "gameover.singAgain": "Sing again →",
    "gameover.shareCard": "Share card",
    "gameover.submit": "Send to leaderboard",

    "share.caption": "Screenshot or tap Share to send this card.",
    "share.scoreSent": "Score sent.",
    "share.scoreCopied": "Score copied. Invite someone into the choir.",
    "share.cardSent": "Card sent.",
    "share.cardCopied": "Card copied to clipboard. Paste it anywhere.",
    "share.cardDownloaded": "Card saved to your device. Link copied too.",
    "share.unavailable": "Sharing is unavailable in this browser.",
    "share.detail": "largest voice: {0}",

    "leaderboard.title": "Choir Ranking",
    "leaderboard.close": "Close leaderboard",
    "leaderboard.tuning": "TUNING CHOIRS…",
    "leaderboard.received": "RECEIVED · RANK {0}/{1} · BEST {2}",
    "leaderboard.awaiting": "AWAITING VOICE · {0} CHOIRS ON AIR",
    "leaderboard.onAir": "{0} CHOIRS ON AIR",
    "leaderboard.signalLost": "SIGNAL LOST: {0}",
    "leaderboard.transmitting": "TRANSMITTING…",
    "leaderboard.transmitted": "TRANSMITTED · RANK {0}/{1} · TOP {2}%",
    "leaderboard.transmissionFailed": "TRANSMISSION FAILED: {0}",
    "leaderboard.bestOnFile": "BEST ON FILE: {0} · UNBROKEN",

    "identity.prompt": "Pick a callsign for the global leaderboard ({0}-{1} chars). Skip to stay anonymous.",

    "tier.Hush": "Hush",
    "tier.Hum": "Hum",
    "tier.Chime": "Chime",
    "tier.Bell": "Bell",
    "tier.Chord": "Chord",
    "tier.Chorus": "Chorus",
    "tier.Anthem": "Anthem",
    "tier.Choir": "Choir",

    "achievement.firstNote": "First Note",
    "achievement.bellMaker": "Bell Maker",
    "achievement.harmonyFinder": "Harmony Finder",
    "achievement.resonanceKeeper": "Resonance Keeper",
    "achievement.fullChoir": "Full Choir",
  },
  zh: {
    "nav.brand": "LESLIE·PLAY",
    "nav.soundOn": "音效开",
    "nav.soundOff": "音效关",
    "nav.leaderboard": "排行榜",
    "nav.newRun": "新一局",

    "intro.eyebrow": "口袋物理小玩具",
    "intro.title": "Pebble<br />Choir",
    "intro.body": "落一音。配两个。养一个合唱团。",
    "intro.gestures": "在容器内点击落下一颗石子。让两个相同的声音相撞合并。保持瓶口清爽。",

    "score.label": "分数",
    "score.next": "下一个",
    "score.best": "最佳",

    "vessel.aria": "点击向合唱容器中投入石子",

    "status.dropFirst": "在容器任意位置点击，落下第一个音符。",
    "status.settle": "让那个音符先落定一会儿。",
    "status.matchVoices": "匹配相同的声音，保持瓶口清爽。",
    "status.harmony": "{0} 音和声，容器正在歌唱。",
    "status.joined": "{0} 加入了合唱。",

    "ladder.eyebrow": "八种声音",
    "ladder.title": "每次合并添加一个音符。",

    "footer.madeBy": "物理由 Matter.js 驱动 · 无广告、无账号、无追踪。",
    "footer.next": "玩 Lantern Grove →",

    "gameover.eyebrow": "容器已满",
    "gameover.titlePrefix": "你的合唱团唱到了 ",
    "gameover.titleSuffix": "。",
    "gameover.pointsLabel": " 分",
    "gameover.bestLabel": "最佳 ",
    "gameover.singAgain": "再唱 →",
    "gameover.shareCard": "分享卡片",
    "gameover.submit": "提交到排行榜",

    "share.caption": "截图或点分享发送这张卡片。",
    "share.scoreSent": "成绩已发送。",
    "share.scoreCopied": "成绩已复制。邀请朋友加入合唱。",
    "share.cardSent": "卡片已发送。",
    "share.cardCopied": "卡片已复制到剪贴板，可粘贴到任意位置。",
    "share.cardDownloaded": "卡片已保存到设备，链接也已复制。",
    "share.unavailable": "此浏览器不支持分享。",
    "share.detail": "最大声部：{0}",

    "leaderboard.title": "合唱排行榜",
    "leaderboard.close": "关闭排行榜",
    "leaderboard.tuning": "合唱调音中…",
    "leaderboard.received": "已收录 · 排名 {0}/{1} · 最佳 {2}",
    "leaderboard.awaiting": "等待发声 · {0} 个合唱在播",
    "leaderboard.onAir": "{0} 个合唱在播",
    "leaderboard.signalLost": "信号丢失：{0}",
    "leaderboard.transmitting": "发送中…",
    "leaderboard.transmitted": "已发送 · 排名 {0}/{1} · 前 {2}%",
    "leaderboard.transmissionFailed": "发送失败：{0}",
    "leaderboard.bestOnFile": "档案最佳：{0} · 未被打破",

    "identity.prompt": "为全球排行榜起个呼号（{0}-{1} 字符）。跳过则保持匿名。",

    "tier.Hush": "嘘",
    "tier.Hum": "嗡",
    "tier.Chime": "鸣",
    "tier.Bell": "铃",
    "tier.Chord": "弦",
    "tier.Chorus": "咏",
    "tier.Anthem": "颂",
    "tier.Choir": "合唱",

    "achievement.firstNote": "初音",
    "achievement.bellMaker": "铸铃师",
    "achievement.harmonyFinder": "寻和者",
    "achievement.resonanceKeeper": "守振者",
    "achievement.fullChoir": "满团合唱",
  },
};
