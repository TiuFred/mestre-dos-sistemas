import { BUDGET_FONT, BUDGET_THEME } from "./budgetMinigameTheme.js";

const DEFAULT_STROKE = { color: "#000000", thickness: 0 };

function makeText(scene, container, x, y, text, style = {}) {
    const {
        origin = [0, 0],
        strokeColor = DEFAULT_STROKE.color,
        strokeThickness = DEFAULT_STROKE.thickness,
        ...rest
    } = style;

    const node = scene.add.text(x, y, text, {
        fontFamily: BUDGET_FONT,
        stroke: strokeColor,
        strokeThickness,
        ...rest,
    }).setOrigin(...origin);

    container?.add(node);
    return node;
}

function makeRoundedPanel(scene, container, x, y, width, height, options = {}) {
    const {
        fillColor = BUDGET_THEME.surface.main,
        fillAlpha = 0.96,
        borderColor = BUDGET_THEME.surface.outline,
        borderAlpha = 1,
        borderWidth = 2,
        radius = BUDGET_THEME.radius.panel,
    } = options;

    const panel = scene.add.rectangle(x, y, width, height, fillColor, fillAlpha)
        .setOrigin(0, 0)
        .setRounded(radius)
        .setStrokeStyle(borderWidth, borderColor, borderAlpha);
    container?.add(panel);
    return panel;
}

function makeProgressPill(scene, container, x, y, label, value, options = {}) {
    const width = options.width ?? 250;
    const height = options.height ?? 64;
    const color = options.color ?? BUDGET_THEME.status.info;
    const outline = options.outline ?? BUDGET_THEME.surface.outlineStrong;

    makeRoundedPanel(scene, container, x, y, width, height, {
        fillColor: color,
        borderColor: outline,
        radius: BUDGET_THEME.radius.card,
    });

    makeText(scene, container, x + 18, y + 14, label, {
        fontSize: "10px",
        color: BUDGET_THEME.text.muted,
    });

    return makeText(scene, container, x + 18, y + 34, value, {
        fontSize: "16px",
        color: BUDGET_THEME.text.primary,
    });
}

function makeTag(scene, container, x, y, label, options = {}) {
    const width = options.width ?? 150;
    const height = options.height ?? 34;
    const fillColor = options.fillColor ?? BUDGET_THEME.surface.raised;
    const borderColor = options.borderColor ?? BUDGET_THEME.surface.outlineStrong;
    const textColor = options.textColor ?? BUDGET_THEME.text.primary;

    makeRoundedPanel(scene, container, x, y, width, height, {
        fillColor,
        borderColor,
        radius: BUDGET_THEME.radius.pill,
    });

    return makeText(scene, container, x + width / 2, y + height / 2, label, {
        fontSize: "10px",
        color: textColor,
        origin: [0.5, 0.5],
    });
}

function makeButton(scene, container, x, y, width, label, onClick, options = {}) {
    const height = options.height ?? 58;
    const fill = options.fill ?? BUDGET_THEME.buttons.primary;
    const hoverFill = options.hoverFill ?? Phaser.Display.Color.IntegerToColor(fill).brighten(15).color;
    const borderColor = options.borderColor ?? BUDGET_THEME.surface.outlineStrong;
    const textColor = options.textColor ?? BUDGET_THEME.text.dark;
    const outline = !!options.outline;
    const outlineFill = options.outlineFill ?? BUDGET_THEME.buttons.tertiary;
    const fontSize = options.fontSize ?? "15px";

    const background = scene.add.rectangle(x, y, width, height, outline ? outlineFill : fill, 1)
        .setRounded(BUDGET_THEME.radius.button)
        .setStrokeStyle(3, outline ? borderColor : borderColor, outline ? 1 : 0.4);

    const draw = (hovered = false) => {
        if (outline) {
            background.setFillStyle(hovered ? Phaser.Display.Color.IntegerToColor(outlineFill).brighten(8).color : outlineFill, 1);
            background.setStrokeStyle(3, hovered ? hoverFill : borderColor, 1);
        } else {
            background.setFillStyle(hovered ? hoverFill : fill, 1);
            background.setStrokeStyle(3, borderColor, 0.4);
        }
        background.setScale(hovered ? 1.02 : 1);
        text.setScale(hovered ? 1.02 : 1);
    };

    const text = makeText(scene, null, x, y, label, {
        fontSize,
        color: textColor,
        origin: [0.5, 0.5],
    });

    draw(false);

    const hitArea = scene.add.zone(x, y, width, height)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => draw(true))
        .on("pointerout", () => draw(false))
        .on("pointerdown", () => onClick?.());

    container?.add([background, text, hitArea]);
    return { background, label: text, hitArea };
}

function makeMetricCard(scene, container, x, y, width, height, options = {}) {
    const fillColor = options.fillColor ?? BUDGET_THEME.surface.raised;
    const borderColor = options.borderColor ?? BUDGET_THEME.surface.outlineStrong;
    const titleColor = options.titleColor ?? BUDGET_THEME.text.secondary;
    const valueColor = options.valueColor ?? BUDGET_THEME.text.primary;
    const value = options.value ?? "";

    makeRoundedPanel(scene, container, x, y, width, height, {
        fillColor,
        borderColor,
        radius: BUDGET_THEME.radius.card,
    });

    makeText(scene, container, x + 18, y + 16, options.title ?? "", {
        fontSize: "10px",
        color: titleColor,
    });

    const valueNode = makeText(scene, container, x + 18, y + 34, value, {
        fontSize: "18px",
        color: valueColor,
    });

    if (options.caption) {
        makeText(scene, container, x + 18, y + height - 18, options.caption, {
            fontSize: "8px",
            color: BUDGET_THEME.text.muted,
            origin: [0, 1],
            wordWrap: { width: width - 36 },
        });
    }

    return valueNode;
}

function createBackdrop(scene) {
    const width = scene.scale.width;
    const height = scene.scale.height;
    if (scene.textures.exists("background_menu")) {
        scene.add.image(width / 2, height / 2, "background_menu")
            .setDisplaySize(width, height)
            .setDepth(0);
    } else {
        scene.add.rectangle(width / 2, height / 2, width, height, 0x8d1f1f).setDepth(0);
    }

    scene.add.rectangle(width / 2, height / 2, width, height, BUDGET_THEME.bg.overlay, 0.025).setDepth(1);
    return scene.add.rectangle(width / 2, height / 2, width - 120, height - 120, BUDGET_THEME.bg.paperShadow, 0.025).setDepth(1);
}

function createStageShell(scene, container, layout) {
    makeRoundedPanel(scene, container, layout.x, layout.y, layout.width, layout.height, {
        fillColor: BUDGET_THEME.surface.main,
        borderColor: BUDGET_THEME.surface.outlineStrong,
        radius: BUDGET_THEME.radius.panel,
    });

    makeRoundedPanel(scene, container, layout.x + 18, layout.y + 18, layout.width - 36, 92, {
        fillColor: BUDGET_THEME.surface.raised,
        borderColor: BUDGET_THEME.surface.outline,
        radius: BUDGET_THEME.radius.card,
    });

    const title = makeText(scene, container, layout.x + 28, layout.y + 32, layout.title, {
        fontSize: "18px",
        color: BUDGET_THEME.text.primary,
    });

    const subtitle = makeText(scene, container, layout.x + 28, layout.y + 62, layout.subtitle, {
        fontSize: "9px",
        color: BUDGET_THEME.text.secondary,
        wordWrap: { width: layout.width - 180 },
    });

    if (layout.badgeLabel) {
        makeTag(scene, container, layout.x + layout.width - 168, layout.y + 30, layout.badgeLabel, {
            width: 140,
            fillColor: BUDGET_THEME.status.info,
            borderColor: BUDGET_THEME.surface.outlineStrong,
            textColor: BUDGET_THEME.text.cyan,
        });
    }

    return { title, subtitle };
}

export {
    createBackdrop,
    createStageShell,
    makeButton,
    makeMetricCard,
    makeProgressPill,
    makeRoundedPanel,
    makeTag,
    makeText,
};
