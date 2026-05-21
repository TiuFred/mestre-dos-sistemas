const W = 1920;
const H = 1080;

const CAMPOS_FALSOS = [
  {
    id: "nome",
    label: "Nome",
    lado: "verso",
    x: 0.26, y: 0.190, w: 0.6, h: 0.04,
  },
  {
    id: "nascimento",
    label: "Data de Nascimento",
    lado: "verso",
    x: 0.555, y: 0.25, w: 0.33, h: 0.04,
  },
  {
    id: "profissao",
    label: "Profissão",
    lado: "verso",
    x: 0.355, y: 0.305, w: 0.33, h: 0.045,
  },
  {
    id: "assinatura",
    label: "Assinatura",
    lado: "verso",
    x: 0.20, y: 0.82, w: 0.6, h: 0.07,
  },
];

class MinigameDocumento extends Phaser.Scene {
  constructor() {
    super({ key: "MinigameMarcelo" });
  }

  preload() {
    this.load.image("fundo", "assets/fundominijogos.png");
    this.load.image("frente_real", "assets/frente.real.png");
    this.load.image("frente_falso", "assets/frente.falso.png");
    this.load.image("verso_real", "assets/verso.real.png");
    this.load.image("verso_falso", "assets/verso.falso.png");
  }

  init() {
    this._lado = "frente";
    this._acertos = new Set();
    this._hitboxes = [];
    this._marcadores = [];
    this._docBounds = { width: 560, height: 780 };
    this._imagemDocumentoFalso = null;
  }

  create() {
    this._criarFundo();
    this._criarDocumentos();
    this._criarBotaoVirar();
    this._criarHitboxes();
  }

  _criarFundo() {
    const fundo = this.add.image(W / 2, H / 2, "fundo");
    fundo.setDisplaySize(W, H);
  }

  _criarDocumentos() {
    this._docRealGroup?.destroy(true);
    this._docFalsoGroup?.destroy(true);

    this._docRealGroup = this.add.container(W * 0.30, H / 2);
    this._docFalsoGroup = this.add.container(W * 0.70, H / 2);

    this._drawDocument(this._docRealGroup, false, this._lado);
    this._drawDocument(this._docFalsoGroup, true, this._lado);
  }

  _drawDocument(container, isFake, lado) {
    const key =
      lado === "frente"
        ? (isFake ? "frente_falso" : "frente_real")
        : (isFake ? "verso_falso" : "verso_real");

    const img = this.add.image(0, 0, key);
    img.setDisplaySize(this._docBounds.width, this._docBounds.height);

    if (isFake) {
      this._imagemDocumentoFalso = img;
    }

    container.add(img);
  }

  _criarBotaoVirar() {
    const bg = this.add.rectangle(W / 2, H - 70, 320, 70, 0x1a5a1a, 1)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });

    this.add.text(W / 2, H - 70, "VIRAR DOCUMENTO", {
      fontFamily: "Arial",
      fontSize: "24px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);

    bg.on("pointerover", () => bg.setFillStyle(0x2a8a2a));
    bg.on("pointerout", () => bg.setFillStyle(0x1a5a1a));
    bg.on("pointerdown", () => this._virarDocumento());
  }

  _virarDocumento() {
    this._lado = this._lado === "frente" ? "verso" : "frente";
    this._destruirHitboxes();
    this._criarDocumentos();
    this._criarHitboxes();
  }

  _criarHitboxes() {
    if (this._lado !== "verso") return;
    if (!this._imagemDocumentoFalso) return;

    const bounds = this._imagemDocumentoFalso.getBounds();
    const origemX = bounds.x;
    const origemY = bounds.y;
    const sprW = bounds.width;
    const sprH = bounds.height;

    CAMPOS_FALSOS.forEach((campo) => {
      const hx = origemX + campo.x * sprW;
      const hy = origemY + campo.y * sprH;
      const hw = campo.w * sprW;
      const hh = campo.h * sprH;
      const hcx = hx + hw / 2;
      const hcy = hy + hh / 2;

      if (this._acertos.has(campo.id)) {
        this._criarMarcador(hcx, hcy, hw, hh);
        return;
      }

      const hl = this.add.rectangle(hcx, hcy, hw, hh, 0xff0000, 0)
        .setDepth(50);

      const zona = this.add.zone(hcx, hcy, hw, hh)
        .setInteractive({ useHandCursor: true })
        .setDepth(60);

      zona.on("pointerdown", () => {
        this._onAcerto(campo.id, zona, hl, hcx, hcy, hw, hh);
      });

      this._hitboxes.push({ zona, hl });
    });
  }

  _onAcerto(id, zona, hl, x, y, w, h) {
    this._acertos.add(id);
    zona.disableInteractive();
    hl.setFillStyle(0x00ff44, 0.18);
    hl.setStrokeStyle(3, 0x00ff44, 1);
    this._criarMarcador(x, y, w, h);
  }

  _criarMarcador(x, y, w, h) {
    const rect = this.add.rectangle(x, y, w, h, 0x00ff44, 0.18)
      .setStrokeStyle(3, 0x00ff44, 1)
      .setDepth(55);

    const check = this.add.text(x + w / 2 - 8, y - h / 2 + 6, "✓", {
      fontFamily: "Arial",
      fontSize: "28px",
      color: "#00ff44",
      fontStyle: "bold",
      stroke: "#003300",
      strokeThickness: 4,
    }).setOrigin(1, 0).setDepth(56);

    this._marcadores.push(rect, check);
  }

  _destruirHitboxes() {
    this._hitboxes.forEach(({ zona, hl }) => {
      zona.destroy();
      hl.destroy();
    });
    this._hitboxes = [];

    this._marcadores.forEach((m) => m.destroy());
    this._marcadores = [];
  }
}

const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  backgroundColor: "#000000",
  scene: [MinigameDocumento],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);