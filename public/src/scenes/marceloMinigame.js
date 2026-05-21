import { SCENES } from "../constants.js";
import EventsManager from "../components/managers/EventsManager.js";

const W = 1920;
const H = 1080;

// ─────────────────────────────────────────────────────────────────────────────
//    DEBUG — mude para `true` para ver os hitboxes na tela com coordenadas.
//    Com o debug ativo, clique em qualquer hitbox para imprimir x/y/w/h no
//    console, facilitando o ajuste manual.
// ─────────────────────────────────────────────────────────────────────────────
const DEBUG_HITBOXES = false;

// ─────────────────────────────────────────────────────────────────────────────
// CAMPOS_FALSOS — cada entrada define um erro clicável no documento falso.
//
//   id        : identificador único do campo
//   label     : nome exibido ao jogador
//   lado      : "frente" ou "verso" — em qual face do documento aparece
//   x, y      : posição do canto superior-esquerdo do hitbox,
//               como fração da largura/altura da imagem exibida (0 a 1)
//   w, h      : largura e altura do hitbox, também como fração (0 a 1)
//
// Dica: ative DEBUG_HITBOXES=true para visualizar e ajustar os valores.
// ─────────────────────────────────────────────────────────────────────────────
const CAMPOS_FALSOS = [
  // ── FRENTE ────────────────────────────────────────────────────────────────
  {
    id: "foto",
    label: "Foto",
    lado: "frente",
    x: 0.075,
    y: 0.240,
    w: 0.200,
    h: 0.300,
  },

  // ── VERSO ─────────────────────────────────────────────────────────────────
  {
    id: "nome",
    label: "Nome",
    lado: "verso",
    x: 0.53,
    y: 0.183,
    w: 0.24,
    h: 0.040,
  },
  {
    id: "nascimento",
    label: "Data de Nascimento",
    lado: "verso",
    x: 0.65,
    y: 0.24,
    w: 0.155,
    h: 0.042,
  },
  {
    id: "profissao",
    label: "Profissão",
    lado: "verso",
    x: 0.57,
    y: 0.306,
    w: 0.170,
    h: 0.044,
  },
  {
    id: "assinatura",
    label: "Assinatura",
    lado: "verso",
    x: 0.475,
    y: 0.822,
    w: 0.310,
    h: 0.060,
  },
];

const TOTAL_ERROS = CAMPOS_FALSOS.length; // 5

export default class MarceloMinigameScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.MARCELO_MINIGAME });
  }

  init(data) {
    this.config = data?.config ?? {};
    this._lado = "frente";
    this._acertos = new Set();
    this._hitboxes = [];
    this._marcadores = [];
    this._debugObjetos = [];
    this._docBounds = { width: 1000, height: 1100 };
    this._docRealGroup = null;
    this._docFalsoGroup = null;
    this._docRealImage = null;
    this._docFalsoImage = null;
    this._imagemDocumentoFalso = null;
    this._progressText = null;
  }

  create() {
    this._criarFundo();
    this._criarInstrucoes();
    this._criarDocumentos();
    this._criarBotaoVirar();
    this._criarHitboxes();
  }

  _criarFundo() {
    const fundo = this.add.image(W / 2, H / 2, "marcelo_background");
    fundo.setDisplaySize(W, H);
  }

  _criarInstrucoes() {
    this.add.rectangle(W / 2, 90, 1500, 130, 0x111111, 0.85)
      .setStrokeStyle(4, 0xF9C22B);

    this.add.text(W / 2, 52, "VERIFICAÇÃO DE DOCUMENTOS", {
      fontFamily: "PressStart2P",
      fontSize: "22px",
      color: "#F9C22B",
    }).setOrigin(0.5);

    this.add.text(
      W / 2,
      108,
      `Após Marcelo entregar o documento, você identificou que existem ${TOTAL_ERROS} erros. Revire dentro do documento virando a página, para achar os erros!`,
      {
        fontFamily: "PressStart2P",
        fontSize: "20px",
        color: "#FFFFFF",
        align: "center",
        wordWrap: { width: 1300 },
      }
    ).setOrigin(0.5);

    this._progressText = this.add.text(
      680, 195,
      `Campos encontrados: 0 / ${TOTAL_ERROS}`,
      {
        fontFamily: "PressStart2P",
        fontSize: "25px",
        color: "#000000",
      }
    ).setOrigin(0, 0.5);
  }

  _criarDocumentos() {
    if (!this._docRealGroup) {
      this._docRealGroup = this.add.container(W * 0.30, H / 2 + 20);
    }

    if (!this._docFalsoGroup) {
      this._docFalsoGroup = this.add.container(W * 0.70, H / 2 + 20);
    }

    if (!this._docRealImage) {
      this._docRealImage = this.add.image(0, 0, "marcelo_front_real").setOrigin(0.5);
      this._docRealGroup.add(this._docRealImage);
    }

    if (!this._docFalsoImage) {
      this._docFalsoImage = this.add.image(0, 0, "marcelo_front_fake").setOrigin(0.5);
      this._docFalsoGroup.add(this._docFalsoImage);
    }

    this._atualizarDocumento(this._docRealImage, false, this._lado);
    this._atualizarDocumento(this._docFalsoImage, true, this._lado);
  }

  _atualizarDocumento(img, isFake, lado) {
    const key =
      lado === "frente"
        ? (isFake ? "marcelo_front_fake" : "marcelo_front_real")
        : (isFake ? "marcelo_back_fake"  : "marcelo_back_real");

    img.setTexture(key);
    img.setOrigin(0.5);

    const tex      = this.textures.get(key).getSourceImage();
    const originalW = tex.width;
    const originalH = tex.height;

    const escalaX = this._docBounds.width  / originalW;
    const escalaY = this._docBounds.height / originalH;
    const escala  = Math.min(escalaX, escalaY);

    img.setDisplaySize(originalW * escala, originalH * escala);

    if (isFake) {
      this._imagemDocumentoFalso = img;
    }
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
    bg.on("pointerout",  () => bg.setFillStyle(0x1a5a1a));
    bg.on("pointerdown", () => this._virarDocumento());
  }

  _virarDocumento() {
    this._lado = this._lado === "frente" ? "verso" : "frente";
    this._destruirHitboxes();
    this._criarDocumentos();
    this._criarHitboxes();
  }

  // ─── HITBOXES ─────────────────────────────────────────────────────────────

  _criarHitboxes() {
    if (!this._imagemDocumentoFalso) return;

    // Filtra apenas os campos do lado atual (frente ou verso)
    const camposDoLado = CAMPOS_FALSOS.filter(c => c.lado === this._lado);
    if (camposDoLado.length === 0) {
      if (DEBUG_HITBOXES) this._debugImagemBounds();
      return;
    }

    const bounds  = this._imagemDocumentoFalso.getBounds();
    const origemX = bounds.x;
    const origemY = bounds.y;
    const sprW    = bounds.width;
    const sprH    = bounds.height;

    if (DEBUG_HITBOXES) this._debugImagemBounds(origemX, origemY, sprW, sprH);

    camposDoLado.forEach((campo) => {
      const hx  = origemX + campo.x * sprW;
      const hy  = origemY + campo.y * sprH;
      const hw  = campo.w * sprW;
      const hh  = campo.h * sprH;
      const hcx = hx + hw / 2;
      const hcy = hy + hh / 2;

      // ── Debug overlay ────────────────────────────────────────────────────
      if (DEBUG_HITBOXES) {
        const dbgRect = this.add.rectangle(hcx, hcy, hw, hh, 0xff9900, 0.25)
          .setStrokeStyle(3, 0xff9900, 1)
          .setDepth(200);

        const dbgLabel = this.add.text(
          hcx, hcy,
          `[${campo.id}]\nx:${campo.x} y:${campo.y}\nw:${campo.w} h:${campo.h}`,
          {
            fontFamily: "Arial",
            fontSize:   "18px",
            color:      "#ff6600",
            stroke:     "#000000",
            strokeThickness: 4,
            align:      "center",
          }
        ).setOrigin(0.5).setDepth(201);

        this._debugObjetos.push(dbgRect, dbgLabel);
      }
      // ─────────────────────────────────────────────────────────────────────

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
        if (DEBUG_HITBOXES) {
          console.log(
            `%c[DEBUG] Acerto: ${campo.id} | x:${campo.x} y:${campo.y} w:${campo.w} h:${campo.h}`,
            "color: #ff9900; font-weight: bold"
          );
        }
        this._onAcerto(campo.id, zona, hl, hcx, hcy, hw, hh);
      });

      this._hitboxes.push({ zona, hl });
    });
  }

  /** Exibe o bounding-box da imagem do documento falso (apenas em modo debug). */
  _debugImagemBounds(ox, oy, sw, sh) {
    if (!ox) {
      const b = this._imagemDocumentoFalso?.getBounds();
      if (!b) return;
      ox = b.x; oy = b.y; sw = b.width; sh = b.height;
    }
    const r = this.add.rectangle(ox + sw / 2, oy + sh / 2, sw, sh, 0x0000ff, 0)
      .setStrokeStyle(3, 0x0000ff, 1)
      .setDepth(199);
    const t = this.add.text(
      ox + 6, oy + 6,
      `IMG ${sw.toFixed(0)}×${sh.toFixed(0)}\nlado: ${this._lado}`,
      { fontFamily: "Arial", fontSize: "18px", color: "#4488ff", stroke: "#000", strokeThickness: 3 }
    ).setDepth(200);
    this._debugObjetos.push(r, t);
  }

  // ─── ACERTO ───────────────────────────────────────────────────────────────

  _onAcerto(id, zona, hl, x, y, w, h) {
    this._acertos.add(id);
    zona.disableInteractive();
    hl.setFillStyle(0x00ff44, 0.18);
    hl.setStrokeStyle(3, 0x00ff44, 1);
    this._criarMarcador(x, y, w, h);

    const encontrados = this._acertos.size;
    this._progressText.setText(`Campos encontrados: ${encontrados} / ${TOTAL_ERROS}`);

    if (encontrados === TOTAL_ERROS) {
      this.time.delayedCall(800, () => {
        EventsManager.getInstance().emit("minigame:scene_result", {
          success: true,
          score:   100,
        });
      });
    }
  }

  _criarMarcador(x, y, w, h) {
    const rect = this.add.rectangle(x, y, w, h, 0x00ff44, 0.18)
      .setStrokeStyle(3, 0x00ff44, 1)
      .setDepth(55);

    const check = this.add.text(x + w / 2 - 8, y - h / 2 + 6, "✓", {
      fontFamily:      "Arial",
      fontSize:        "28px",
      color:           "#000000",
      fontStyle:       "bold",
      stroke:          "#003300",
      strokeThickness: 4,
    }).setOrigin(1, 0).setDepth(56);

    this._marcadores.push(rect, check);
  }

  // ─── LIMPEZA ──────────────────────────────────────────────────────────────

  _destruirHitboxes() {
    this._hitboxes.forEach(({ zona, hl }) => {
      zona?.destroy();
      hl?.destroy();
    });
    this._hitboxes = [];

    this._marcadores.forEach((m) => m?.destroy());
    this._marcadores = [];

    this._debugObjetos.forEach((d) => d?.destroy());
    this._debugObjetos = [];
  }
}
