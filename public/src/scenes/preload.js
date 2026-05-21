import { SCENES } from "../constants.js";
import EventsManager from "../components/managers/EventsManager.js";

/**
 * Updates the preload logo movement inside the configured bounds.
 * @param {PreloadScene} scene Scene instance that stores the movement state.
 * @param {number} startX Initial horizontal position.
 * @param {number} startY Initial vertical position.
 * @param {number} endX Maximum horizontal position.
 * @param {number} endY Maximum vertical position.
 */
function updateLogoMovement(scene, startX, _startY, endX, endY) {
  scene.x += scene.vx * scene.dt;

  if (scene.x >= endX || scene.x <= startX) {
    scene.vx = -scene.vx;
    scene.logo.setTint(Phaser.Display.Color.RandomRGB().color);
  }

  scene.vy += scene.a * scene.dt;
  scene.y += scene.vy * scene.dt;

  const bounceFactor = 0.5;

  if (scene.y >= endY) {
    scene.y = endY;
    scene.vy = -scene.vy * bounceFactor;
    scene.logo.setTint(Phaser.Display.Color.RandomRGB().color);
  }

  scene.logo.setPosition(scene.x, scene.y);

  console.log("MU -> X");
  console.log("Posicao X:", scene.x);
  console.log("Velocidade X:", scene.vx);

  console.log("MUV -> Y");
  console.log("Posicao Y:", scene.y);
  console.log("Velocidade Y:", scene.vy);
  console.log("Aceleracao Y:", scene.a);
  console.log("----------------------");
}

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.PRELOAD });
  }

  preload() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.load.font(
      "PressStart2P",
      "https://raw.githubusercontent.com/google/fonts/refs/heads/main/ofl/pressstart2p/PressStart2P-Regular.ttf",
      "truetype"
    );

    this.load.font(
      "Tiny5",
      "https://raw.githubusercontent.com/google/fonts/refs/heads/main/ofl/tiny5/Tiny5-Regular.ttf",
      "truetype"
    );

    this.add.rectangle(centerX, centerY, width, height, 0x8d1f1f);

    this.add.text(centerX, centerY - 60, "Carregando...", {
      fontFamily: "'Arial Black', sans-serif",
      fontSize: "128px",
      color: "#ffaa00",
      stroke: "#cc4400",
      strokeThickness: 6,
    }).setOrigin(0.5);

    const manifest = this.cache.json.get("assets_manifest");

    manifest.images.forEach(({ key, path }) => this.load.image(key, path));

    manifest.spritesheets.forEach(({ key, path, frameWidth, frameHeight }) =>
      this.load.spritesheet(key, path, { frameWidth, frameHeight })
    );

    manifest.audio.forEach(({ key, path, paths }) => {
      const sources = Array.isArray(paths) ? paths : [path];
      this.load.audio(key, sources);
    });
    manifest.dialogues.forEach(({ key, path }) => this.load.text(key, path));
    manifest.texts?.forEach(({ key, path }) => this.load.text(key, path));
  }

  create() {
    const { width, height } = this.scale;

    this.logo = this.add.image(0, 0, "ui_home_title");
    this.logo.setScale(0.5);
    this.logo.setOrigin(0.5);
    this.logo.setTint(this.randomColor());

    this.startX = 100;
    this.startY = 100;
    this.endX = width - 100;
    this.endY = height - 100;
    this.totalTime = 4;
    this.elapsedTime = 0;

    this.logo.setPosition(this.startX, this.startY);

    new EventsManager(this);

    this.x = this.startX;
    this.y = this.startY;
    this.vx = (this.endX - this.startX) / this.totalTime;
    this.vy = 0;
    this.a = (2 * (this.endY - this.startY)) / (this.totalTime ** 2) * 5;
    this.dt = 16 / 1000;

    this.timerEvent = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        this.elapsedTime += 16 / 1000;

        updateLogoMovement(this, this.startX, this.startY, this.endX, this.endY);

        if (this.elapsedTime >= this.totalTime) {
          this.timerEvent.remove();
          this.scene.start(SCENES.MENU);
        }
      }
    });
  }

  randomColor() {
    return Phaser.Display.Color.RandomRGB().color;
  }
}
