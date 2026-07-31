/**
 * @module signal-stack/i18n-messages
 * Signal Stack 的中英文案字典。
 * 静态文案由 data-i18n 属性驱动（见 index.html）；
 * 动态文案由 app.js 调用 t("key") 生成。
 * 游戏名 "Signal Stack" 不翻译。
 */
export const messages = {
  en: {
    "nav.brand": "Leslie·Play",
    "nav.transmission": "Transmission 03 · Endless",
    "nav.leaderboard": "Leaderboard",
    "nav.leaderboardAria": "Open global leaderboard",

    "hero.eyebrow": "A pocket logic transmission",
    "hero.body": "Place the two-tone pieces. Complete rows and columns. Match the numbered signal for a clean transmission—and keep the channel alive.",

    "console.score": "score",
    "console.best": "best",
    "console.chain": "chain",
    "console.ruleLine": "Fill any row or column to clear it. Edge number = green-cell bonus.",
    "console.light": "light",
    "console.dark": "dark",
    "console.newRun": "New run",

    "tray.incoming": "incoming pieces",
    "tray.rotate": "Rotate ↻",

    "aside.eyebrow": "How the receiver works",
    "aside.title": "Clear space.<br />Tune the signal.",
    "aside.step1": "<strong>Select</strong> one of three pieces.",
    "aside.step2": "<strong>Tap it again</strong> to rotate 90°.",
    "aside.step3": "<strong>Tap the board</strong> to place it.",
    "aside.step4": "Any full line clears. Match its edge number with the number of green cells for a <strong>Clean Signal</strong>.",
    "aside.privacy": "Runs stay on this device. Shared results contain only the public game address, score, and clean-signal count—never a seed, identity, board state, or diagnostic.",

    "footer.note": "<strong>Signal Stack</strong> is an endless Leslie·Play experiment. No account, tracking, advertisement, or hidden purchase.",

    "gameover.eyebrow": "TRANSMISSION ENDED",
    "gameover.title": "Channel closed.",
    "gameover.shareCaption": "Screenshot or tap Share to send this card.",
    "gameover.restart": "Tune again",
    "gameover.shareCard": "Share card",
    "gameover.submitLeaderboard": "Send to leaderboard",

    "leaderboard.title": "Transmission Log",
    "leaderboard.close": "Close leaderboard",

    "message.intro": "1 Pick a piece · 2 tap it again to rotate · 3 tap its center.",
    "message.noFit": "No piece fits. The receiver is resting.",
    "message.rotated": "Rotated 90°. Tap the board to place.",
    "message.selected": "Selected. Tap again to rotate, or tap the board to place.",
    "message.selectFirst": "Select one of the incoming pieces first.",
    "message.blocked": "Red outline = blocked. Your piece is still selected—tap another spot.",
    "message.cleanMatched": "Exact frequency matched. The chain is growing.",
    "message.spaceCleared": "Space cleared. Match the edge numbers for a clean signal.",
    "message.pieceLocked": "Piece locked. Keep a path open for the next three.",

    "flash.cleanSignal": "CLEAN SIGNAL · ×{0}",
    "flash.cleanSignals": "{0} CLEAN SIGNALS · ×{1}",
    "flash.lineCleared": "{0} LINE CLEARED",
    "flash.linesCleared": "{0} LINES CLEARED",

    "clue.column": "{0} green cells for a clean column signal",
    "clue.row": "{0} green cells for a clean row signal",

    "prompt.callsign": "Pick a callsign for the global leaderboard ({0}-{1} chars). Skip to stay anonymous.",

    "share.sent": "Signal sent.",
    "share.copiedLink": "Link copied. Send it to someone sharp.",
    "share.unavailable": "Sharing is unavailable here.",
    "share.sentCard": "Card sent.",
    "share.copied": "Card copied to clipboard. Paste it anywhere.",
    "share.downloaded": "Card saved to your device. Link copied too.",
    "share.points": "points",
    "share.cleanSignal": "clean signal",
    "share.cleanSignals": "clean signals",

    "leaderboard.scanning": "SCANNING CHANNELS…",
    "leaderboard.received": "RECEIVED · RANK {0}/{1} · BEST {2}",
    "leaderboard.awaiting": "AWAITING TRANSMISSION · {0} OPERATORS ON AIR",
    "leaderboard.operators": "{0} OPERATORS ON AIR",
    "leaderboard.lost": "SIGNAL LOST: {0}",
    "leaderboard.transmitting": "TRANSMITTING…",
    "leaderboard.transmitted": "TRANSMITTED · RANK {0}/{1} · TOP {2}%",
    "leaderboard.failed": "TRANSMISSION FAILED: {0}",
    "leaderboard.bestOnFile": "BEST ON FILE: {0} · UNBROKEN",

    "achievement.firstTransmission": "First Transmission",
    "achievement.clearChannel": "Clear Channel",
    "achievement.frequencyFinder": "Frequency Finder",
    "achievement.signalKeeper": "Signal Keeper",
    "achievement.masterReceiver": "Master Receiver",
  },
  zh: {
    "nav.brand": "Leslie·Play",
    "nav.transmission": "传输 03 · 无尽",
    "nav.leaderboard": "排行榜",
    "nav.leaderboardAria": "打开全球排行榜",

    "hero.eyebrow": "口袋里的逻辑电波",
    "hero.body": "放置双色方块，凑满整行整列。匹配数字信号完成纯净传输——让频道保持畅通。",

    "console.score": "得分",
    "console.best": "最佳",
    "console.chain": "连击",
    "console.ruleLine": "填满任意一行或一列即可清除。边缘数字 = 绿格奖励。",
    "console.light": "亮",
    "console.dark": "暗",
    "console.newRun": "新一局",

    "tray.incoming": "待选方块",
    "tray.rotate": "旋转 ↻",

    "aside.eyebrow": "接收机如何运作",
    "aside.title": "腾出空间。<br />调准信号。",
    "aside.step1": "<strong>选择</strong>三块方块之一。",
    "aside.step2": "<strong>再点一次</strong>旋转 90°。",
    "aside.step3": "<strong>点棋盘</strong>放置方块。",
    "aside.step4": "任意满行满列都会清除。让绿格数与边缘数字一致即可获得<strong>纯净信号</strong>。",
    "aside.privacy": "对局记录只保存在本设备。分享结果仅含公开游戏地址、得分和纯净信号数——绝不含种子、身份、棋盘状态或诊断信息。",

    "footer.note": "<strong>Signal Stack</strong> 是 Leslie·Play 的无尽实验。无账号、无追踪、无广告、无隐藏付费。",

    "gameover.eyebrow": "传输终止",
    "gameover.title": "频道关闭。",
    "gameover.shareCaption": "截图或点分享发送这张卡片。",
    "gameover.restart": "再调一次",
    "gameover.shareCard": "分享卡片",
    "gameover.submitLeaderboard": "提交到排行榜",

    "leaderboard.title": "传输日志",
    "leaderboard.close": "关闭排行榜",

    "message.intro": "1 选择方块 · 2 再点一次旋转 · 3 点棋盘中心放置。",
    "message.noFit": "没有方块能放下，接收机正在休整。",
    "message.rotated": "已旋转 90°。点棋盘放置。",
    "message.selected": "已选择。再点一次旋转，或点棋盘放置。",
    "message.selectFirst": "请先选择一块待选方块。",
    "message.blocked": "红框表示被挡。方块仍处于选中——换个位置再点。",
    "message.cleanMatched": "频率完全匹配，连击正在增长。",
    "message.spaceCleared": "空间已清除。让绿格数匹配边缘数字以获得纯净信号。",
    "message.pieceLocked": "方块已锁定。为接下来的三块留好通道。",

    "flash.cleanSignal": "纯净信号 · ×{0}",
    "flash.cleanSignals": "{0} 次纯净信号 · ×{1}",
    "flash.lineCleared": "{0} 行已清除",
    "flash.linesCleared": "{0} 行已清除",

    "clue.column": "{0} 个绿格可获得列纯净信号",
    "clue.row": "{0} 个绿格可获得行纯净信号",

    "prompt.callsign": "为全球排行榜起个呼号（{0}-{1} 字符）。跳过则保持匿名。",

    "share.sent": "信号已发送。",
    "share.copiedLink": "链接已复制，发给那个聪明人吧。",
    "share.unavailable": "此环境不支持分享。",
    "share.sentCard": "卡片已发送。",
    "share.copied": "卡片已复制到剪贴板，可粘贴到任意位置。",
    "share.downloaded": "卡片已保存到设备，链接也已复制。",
    "share.points": "分",
    "share.cleanSignal": "次纯净信号",
    "share.cleanSignals": "次纯净信号",

    "leaderboard.scanning": "扫描频道中…",
    "leaderboard.received": "已接收 · 排名 {0}/{1} · 最佳 {2}",
    "leaderboard.awaiting": "等待传输 · {0} 位操作员在线",
    "leaderboard.operators": "{0} 位操作员在线",
    "leaderboard.lost": "信号丢失：{0}",
    "leaderboard.transmitting": "传输中…",
    "leaderboard.transmitted": "已传输 · 排名 {0}/{1} · 前 {2}%",
    "leaderboard.failed": "传输失败：{0}",
    "leaderboard.bestOnFile": "档案最佳：{0} · 未被打破",

    "achievement.firstTransmission": "首次传输",
    "achievement.clearChannel": "清晰频道",
    "achievement.frequencyFinder": "频率探寻者",
    "achievement.signalKeeper": "信号守门人",
    "achievement.masterReceiver": "接收大师",
  },
};
