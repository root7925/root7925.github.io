/**
 * @module pattern-atlas/i18n-messages
 * Pattern Atlas 的中英文案字典。
 * 静态文案由 data-i18n 属性驱动（见 index.html）；
 * 动态文案由 app.js 调用 t("key") 生成。
 * 游戏名 "Pattern Atlas" 与关卡标题（level.title）为数据，不翻译。
 */
export const messages = {
  en: {
    "nav.brand": "Leslie·Play",
    "nav.subtitle": "The First Atlas · 20 studies",
    "nav.prevStudy": "Previous study",
    "nav.nextStudy": "Next study",

    "study.number": "Study {0}",

    "description.default": "Reassemble the loose color fragments so every square matches the field. Filling the frame alone is not enough.",
    "description.clues": "Only part of the field is visible. Use the fixed color clues and fragment shapes to reconstruct the concealed pattern.",

    "field.target": "target field",
    "field.partialClue": "partial clue field",
    "field.cluesOnBoard": "clues marked on board",
    "field.restoration": "restoration frame",

    "chapter.Trace": "Trace",
    "chapter.Turn": "Turn",
    "chapter.Veil": "Veil",
    "chapter.Deep field": "Deep field",
    "chapter.Echoes": "Echoes",

    "difficulty.Gentle": "Gentle",
    "difficulty.Focus": "Focus",
    "difficulty.Turn": "Turn",
    "difficulty.Inference": "Inference",
    "difficulty.Deep": "Deep",
    "difficulty.Daily": "Daily",

    "progress": "{0} / {1} fragments",
    "collection.progress": "{0} / {1} restored",

    "controls.restart": "Restart",
    "controls.rotate": "Rotate ↻",

    "tray.label": "loose pieces",

    "selection.default": "Select a fragment to rotate",
    "selection.selected": "Fragment {0} selected · tap again to rotate",
    "selection.fixed": "Fragment {0} selected · fixed orientation",
    "selection.dragging": "Fragment {0} selected",

    "status.dragFragment": "Drag a fragment into the frame. Tap a fragment, then a square if you prefer.",
    "status.readTarget": "Read the target field, then begin with any fragment.",
    "status.studyClues": "Study the visible clues, then test one fragment at a time.",
    "status.restored": "Pattern restored.",
    "status.fullButConflict": "The frame is full, but the pattern still contradicts itself. Rotate or move one fragment.",
    "status.belongs": "That fragment belongs. Keep going.",
    "status.fixedOrientation": "This fragment is already in its fixed orientation.",
    "status.rotated": "Rotated. Compare its color sequence with the target field.",
    "status.doesNotFit": "That position does not fit. Rotate it or choose another square.",
    "status.selected": "Selected. Tap it again to rotate, or choose a square to preview.",
    "status.conflictClues": "That conflicts with a visible clue, another fragment, or the frame edge.",
    "status.noEcho": "That fragment does not echo the target field. Try another position or rotate it.",

    "complete.title": "Pattern restored",
    "complete.copy.next": "The next study is ready when you are.",
    "complete.copy.last": "The First Atlas is complete.",
    "complete.next.next": "Next study →",
    "complete.next.last": "Return to 01 →",
    "complete.replay": "Play again",

    "share.card": "Share card",
    "share.caption": "Screenshot or tap Share to send this card.",
    "share.sent": "Card sent.",
    "share.copied": "Card copied to clipboard. Paste it anywhere.",
    "share.downloaded": "Card saved to your device. Link copied too.",
    "share.unavailable": "Sharing is unavailable in this browser.",
    "share.challengeSent": "Challenge sent.",
    "share.challengeCopied": "Challenge copied. Send it to someone sharp.",

    "hero.eyebrow": "A visual logic collection",
    "hero.title": "Make the pattern<br /><em>click</em> back into place.",
    "hero.body": "Read the color field. Rotate the fragments. Find the one exact arrangement—without a clock running beside you.",

    "footer.copy": "<strong>Pattern Atlas</strong> — Twenty quiet studies by Leslie. Progress stays on this device. No account, timer, or advertisement.",

    "stage.ariaLabel": "Pattern Atlas puzzle",
    "board.ariaLabel": "Restoration board",
    "target.ariaTarget": "Target color field",
    "target.ariaClue": "Partial color clue field",

    "cell.aria": "Place selected fragment at row {0}, column {1}",
    "cell.ariaClue": "{0} clue. Place selected fragment at row {1}, column {2}",

    "piece.aria": "Fragment {0}, {1}. {2}",
    "piece.placed": "placed",
    "piece.loose": "loose",
    "piece.selectedHint": "Selected. Tap again to rotate.",
    "piece.tapHint": "Tap to select.",

    "help.gestures": "Drag a fragment into the frame, or tap a fragment and then a square. Tap a selected fragment again to rotate it. Use the arrows above the board to move between studies.",
  },
  zh: {
    "nav.brand": "Leslie·Play",
    "nav.subtitle": "第一册图谱 · 20 项研究",
    "nav.prevStudy": "上一项研究",
    "nav.nextStudy": "下一项研究",

    "study.number": "研究 {0}",

    "description.default": "重新拼合散落的色块，让每一格都和上方色场一致。仅铺满整个框还不够。",
    "description.clues": "色场只显露一部分。根据固定色块和碎片形状，还原被遮住的图案。",

    "field.target": "目标色场",
    "field.partialClue": "部分线索色场",
    "field.cluesOnBoard": "线索标于棋盘",
    "field.restoration": "复原框",

    "chapter.Trace": "追迹",
    "chapter.Turn": "转向",
    "chapter.Veil": "帷纱",
    "chapter.Deep field": "深场",
    "chapter.Echoes": "回响",

    "difficulty.Gentle": "轻缓",
    "difficulty.Focus": "专注",
    "difficulty.Turn": "转向",
    "difficulty.Inference": "推理",
    "difficulty.Deep": "深邃",
    "difficulty.Daily": "每日",

    "progress": "{0} / {1} 个碎片",
    "collection.progress": "{0} / {1} 已复原",

    "controls.restart": "重开",
    "controls.rotate": "旋转 ↻",

    "tray.label": "散件",

    "selection.default": "选择一个碎片来旋转",
    "selection.selected": "碎片 {0} 已选中 · 再点一次旋转",
    "selection.fixed": "碎片 {0} 已选中 · 固定方向",
    "selection.dragging": "碎片 {0} 已选中",

    "status.dragFragment": "把碎片拖入框内，或先点碎片再点格子。",
    "status.readTarget": "先看目标色场，再从任意碎片开始。",
    "status.studyClues": "先观察可见线索，再逐个试用碎片。",
    "status.restored": "图案已复原。",
    "status.fullButConflict": "框已填满，但图案仍有冲突。旋转或移动某个碎片。",
    "status.belongs": "这块放对了，继续。",
    "status.fixedOrientation": "这块碎片已是固定方向。",
    "status.rotated": "已旋转。对比它的色序与目标色场。",
    "status.doesNotFit": "这个位置放不下。旋转它或另选一格。",
    "status.selected": "已选中。再点一次旋转，或点格子预览位置。",
    "status.conflictClues": "与可见线索、其他碎片或框边冲突。",
    "status.noEcho": "这块碎片与目标色场不符。换个位置或旋转试试。",

    "complete.title": "图案已复原",
    "complete.copy.next": "下一项研究已就绪。",
    "complete.copy.last": "第一册图谱已完成。",
    "complete.next.next": "下一项研究 →",
    "complete.next.last": "回到 01 →",
    "complete.replay": "再玩一次",

    "share.card": "分享卡片",
    "share.caption": "截图或点分享发送这张卡片。",
    "share.sent": "卡片已发送。",
    "share.copied": "卡片已复制到剪贴板，可粘贴到任意位置。",
    "share.downloaded": "卡片已保存到设备，链接也已复制。",
    "share.unavailable": "此浏览器不支持分享。",
    "share.challengeSent": "挑战已发送。",
    "share.challengeCopied": "挑战已复制，发给反应快的朋友。",

    "hero.eyebrow": "视觉逻辑合集",
    "hero.title": "让图案归位。",
    "hero.body": "读懂色场，旋转碎片，找到那唯一精确的排布——身边没有计时器在走。",

    "footer.copy": "<strong>Pattern Atlas</strong>——Leslie 的二十项静谧研究。进度仅留存于本设备，无账号、无计时、无广告。",

    "stage.ariaLabel": "Pattern Atlas 谜题",
    "board.ariaLabel": "复原棋盘",
    "target.ariaTarget": "目标色场",
    "target.ariaClue": "部分线索色场",

    "cell.aria": "将选中的碎片放在第 {0} 行、第 {1} 列",
    "cell.ariaClue": "{0} 线索。将选中的碎片放在第 {1} 行、第 {2} 列",

    "piece.aria": "碎片 {0}，{1}。{2}",
    "piece.placed": "已放置",
    "piece.loose": "散落",
    "piece.selectedHint": "已选中，再点一次旋转。",
    "piece.tapHint": "点一下选中。",

    "help.gestures": "把碎片拖入框内，或先点碎片再点格子。点已选中的碎片可旋转。用棋盘上方的箭头切换研究。",
  },
};
