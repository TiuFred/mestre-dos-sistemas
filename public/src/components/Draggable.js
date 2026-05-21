/**
 * Torna um GameObject arrastável dentro de limites.
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.GameObject} gameObject
 * @param {{ minX:number, maxX:number, minY:number, maxY:number }} bounds
 */
export default function makeDraggable(scene, gameObject, bounds) {
    gameObject.setInteractive({ useHandCursor: true });

    scene.input.setDraggable(gameObject);

    let isDragging = false;

    gameObject.on("dragstart", () => {
        isDragging = true;
    });

    gameObject.on("dragend", () => {
        // pequeno delay ajuda no mobile
        setTimeout(() => {
            isDragging = false;
        }, 50);
    });

    scene.input.on("drag", (pointer, obj, dragX, dragY) => {
        if (obj !== gameObject) return;

        const x = Phaser.Math.Clamp(dragX, bounds.minX, bounds.maxX);
        const y = Phaser.Math.Clamp(dragY, bounds.minY, bounds.maxY);

        obj.setPosition(x, y);
    });

    return {
        isDragging: () => isDragging
    };
}