const canvas = document.getElementById("water");
const ctx = canvas.getContext("2d", {
  alpha: true,
  willReadFrequently: false
});

const background = document.getElementById("background");
const amount = document.getElementById("amount");
const value = document.getElementById("value");
const file = document.getElementById("file");
const clearButton = document.getElementById("clear");

let W = 0;
let H = 0;
let DPR = 1;

let backgroundCanvas;
let backgroundCtx;

let backgroundImageData = null;

const drops = [];
const impacts = [];
const streams = [];

let lastTime = performance.now();

let waterX = 0.5;
let waterY = 0.5;

let waterPower = 0;


/* =====================================================
   resize
===================================================== */

function resize() {

  W = window.innerWidth;
  H = window.innerHeight;

  DPR = Math.min(
    window.devicePixelRatio || 1,
    1.5
  );

  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);

  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  ctx.setTransform(
    DPR,
    0,
    0,
    DPR,
    0,
    0
  );

  createBackgroundBuffer();
}

window.addEventListener("resize", resize);


/* =====================================================
   背景画像をCanvasに展開
===================================================== */

function createBackgroundBuffer() {

  if (
    !background.complete ||
    !background.naturalWidth
  ) {
    return;
  }

  backgroundCanvas =
    document.createElement("canvas");

  backgroundCanvas.width =
    Math.floor(W);

  backgroundCanvas.height =
    Math.floor(H);

  backgroundCtx =
    backgroundCanvas.getContext("2d");

  const scale = Math.max(
    W / background.naturalWidth,
    H / background.naturalHeight
  );

  const dw =
    background.naturalWidth * scale;

  const dh =
    background.naturalHeight * scale;

  backgroundCtx.drawImage(
    background,

    (W - dw) / 2,
    (H - dh) / 2,

    dw,
    dh
  );

  backgroundImageData =
    backgroundCtx.getImageData(
      0,
      0,
      Math.floor(W),
      Math.floor(H)
    );
}


/* =====================================================
   背景ロード
===================================================== */

background.addEventListener(
  "load",
  createBackgroundBuffer
);


/* =====================================================
   水量
===================================================== */

value.textContent =
  amount.value + "%";

amount.addEventListener(
  "input",
  () => {

    value.textContent =
      amount.value + "%";
  }
);


/* =====================================================
   背景変更
===================================================== */

let backgroundURL = null;

file.addEventListener(
  "change",
  event => {

    const image =
      event.target.files?.[0];

    if (!image) return;

    if (backgroundURL) {
      URL.revokeObjectURL(
        backgroundURL
      );
    }

    backgroundURL =
      URL.createObjectURL(image);

    background.src =
      backgroundURL;
  }
);


/* =====================================================
   reset
===================================================== */

clearButton.addEventListener(
  "click",
  () => {

    drops.length = 0;
    impacts.length = 0;
    streams.length = 0;

    waterPower = 0;
  }
);


/* =====================================================
   random
===================================================== */

function random(min, max) {

  return min +
    Math.random() *
    (max - min);
}


/* =====================================================
   タップ
===================================================== */

document.addEventListener(
  "pointerdown",
  event => {

    if (
      event.target.closest(".top") ||
      event.target.closest(".bottom")
    ) {
      return;
    }

    const rect =
      canvas.getBoundingClientRect();

    const x =
      event.clientX - rect.left;

    const y =
      event.clientY - rect.top;

    fireWater(x, y);
  }
);


/* =====================================================
   水を発射
===================================================== */

function fireWater(
  targetX,
  targetY
) {

  const strength =
    Number(amount.value) / 100;

  waterX =
    targetX / W;

  waterY =
    1 - targetY / H;

  waterPower =
    Math.min(
      1,
      waterPower +
      0.8 * strength
    );


  /*
   * 水が奥から手前に
   * 飛んでくる
   */

  const sourceX = W * 0.5;
  const sourceY = H * 0.28;

  const dx =
    targetX - sourceX;

  const dy =
    targetY - sourceY;

  const distance =
    Math.hypot(dx, dy);

  const nx =
    dx / distance;

  const ny =
    dy / distance;


  /*
   * 大きな水塊
   */

  const count =
    Math.floor(
      45 +
      strength * 180
    );


  for (
    let i = 0;
    i < count;
    i++
  ) {

    const t =
      Math.random() * 0.95;

    const spread =
      (
        Math.random() -
        0.5
      ) *
      (
        4 +
        strength * 50
      ) *
      t;

    streams.push({

      x:
        sourceX +
        dx * t,

      y:
        sourceY +
        dy * t,

      vx:
        nx *
        random(500, 900),

      vy:
        ny *
        random(500, 900),

      size:
        random(
          2,
          5 +
          strength * 9
        ),

      life:
        random(.18, .7),

      alpha:
        random(.3, .9),

      spread
    });
  }


  /*
   * 衝突
   */

  impacts.push({

    x: targetX,
    y: targetY,

    age: 0,

    life:
      random(.8, 1.8),

    radius:
      30 +
      strength * 180,

    strength
  });


  /*
   * 水滴
   */

  const dropletCount =
    Math.floor(
      35 +
      strength * 180
    );


  for (
    let i = 0;
    i < dropletCount;
    i++
  ) {

    const angle =
      Math.random() *
      Math.PI * 2;

    const distance =
      Math.sqrt(
        Math.random()
      ) *
      (
        25 +
        strength * 170
      );


    drops.push({

      x:
        targetX +
        Math.cos(angle) *
        distance,

      y:
        targetY +
        Math.sin(angle) *
        distance,

      radius:
        random(
          2,
          5 +
          strength * 13
        ),

      vx:
        random(-.4, .4),

      vy:
        random(.3, 2),

      age: 0,

      life:
        random(
          1.8,
          5.5
        ),

      strength
    });
  }
}


/* =====================================================
   水流
===================================================== */

function updateStreams(dt) {

  for (
    let i =
      streams.length - 1;

    i >= 0;

    i--
  ) {

    const s =
      streams[i];

    s.life -= dt;

    if (s.life <= 0) {

      streams.splice(i, 1);
      continue;
    }

    s.x +=
      s.vx * dt;

    s.y +=
      s.vy * dt;

    s.vx *= .985;
    s.vy *= .985;
  }
}


/* =====================================================
   水流描画
===================================================== */

function drawStreams() {

  for (
    const s of streams
  ) {

    const alpha =
      Math.min(
        1,
        s.life * 3
      ) *
      s.alpha;


    const angle =
      Math.atan2(
        s.vy,
        s.vx
      );


    ctx.save();

    ctx.translate(
      s.x,
      s.y
    );

    ctx.rotate(angle);


    /*
     * 水は完全な白ではない
     */

    const gradient =
      ctx.createLinearGradient(
        -s.size * 6,
        0,
        s.size * 6,
        0
      );


    gradient.addColorStop(
      0,
      "rgba(150,210,235,0)"
    );

    gradient.addColorStop(
      .25,
      `rgba(
        205,240,250,
        ${alpha * .25}
      )`
    );

    gradient.addColorStop(
      .5,
      `rgba(
        255,255,255,
        ${alpha * .7}
      )`
    );

    gradient.addColorStop(
      .75,
      `rgba(
        185,230,245,
        ${alpha * .22}
      )`
    );

    gradient.addColorStop(
      1,
      "rgba(150,210,235,0)"
    );


    ctx.fillStyle =
      gradient;


    ctx.beginPath();

    ctx.ellipse(
      0,
      0,

      s.size * 5,
      s.size,

      0,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  }
}


/* =====================================================
   衝突した水
===================================================== */

function drawImpacts(dt) {

  for (
    let i =
      impacts.length - 1;

    i >= 0;

    i--
  ) {

    const impact =
      impacts[i];

    impact.age += dt;


    if (
      impact.age >
      impact.life
    ) {

      impacts.splice(i, 1);
      continue;
    }


    const p =
      impact.age /
      impact.life;


    const radius =
      impact.radius *
      (
        .15 +
        p * .85
      );


    const alpha =
      (
        1 - p
      ) *
      impact.strength;


    /*
     * 水膜
     */

    const gradient =
      ctx.createRadialGradient(
        impact.x,
        impact.y,
        0,

        impact.x,
        impact.y,
        radius
      );


    gradient.addColorStop(
      0,
      `rgba(
        215,245,255,
        ${alpha * .20}
      )`
    );

    gradient.addColorStop(
      .45,
      `rgba(
        190,230,245,
        ${alpha * .12}
      )`
    );

    gradient.addColorStop(
      .8,
      `rgba(
        225,248,255,
        ${alpha * .05}
      )`
    );

    gradient.addColorStop(
      1,
      "rgba(180,225,245,0)"
    );


    ctx.fillStyle =
      gradient;


    ctx.beginPath();

    ctx.arc(
      impact.x,
      impact.y,
      radius,
      0,
      Math.PI * 2
    );

    ctx.fill();


    /*
     * 水の筋
     */

    const lines =
      25 +
      Math.floor(
        impact.strength * 40
      );


    for (
      let j = 0;
      j < lines;
      j++
    ) {

      const angle =
        j / lines *
        Math.PI * 2;


      const r1 =
        radius *
        random(.15, .4);

      const r2 =
        radius *
        random(.55, 1);


      ctx.strokeStyle =
        `rgba(
          230,250,255,
          ${alpha * .15}
        )`;


      ctx.lineWidth =
        random(.4, 1.7);

      ctx.beginPath();

      ctx.moveTo(
        impact.x +
        Math.cos(angle) * r1,

        impact.y +
        Math.sin(angle) * r1
      );

      ctx.quadraticCurveTo(

        impact.x +
        Math.cos(angle + .15) *
        radius * .65,

        impact.y +
        Math.sin(angle + .15) *
        radius * .65,

        impact.x +
        Math.cos(angle) * r2,

        impact.y +
        Math.sin(angle) * r2
      );

      ctx.stroke();
    }
  }
}


/* =====================================================
   ★ 水滴による本物の背景屈折
===================================================== */

function drawRefractedDrops() {

  if (!backgroundImageData) {
    return;
  }


  /*
   * 毎フレームすべての画素を
   * 書き換えるとiPhoneでは重いので、
   * 水滴の周囲だけ処理する。
   */

  for (
    const d of drops
  ) {

    const r =
      d.radius;


    if (r < 2) {
      continue;
    }


    const left =
      Math.max(
        0,
        Math.floor(
          d.x - r * 2.1
        )
      );

    const right =
      Math.min(
        W,
        Math.ceil(
          d.x + r * 2.1
        )
      );

    const top =
      Math.max(
        0,
        Math.floor(
          d.y - r * 2.1
        )
      );

    const bottom =
      Math.min(
        H,
        Math.ceil(
          d.y + r * 2.1
        )
      );


    const width =
      right - left;

    const height =
      bottom - top;


    if (
      width <= 0 ||
      height <= 0
    ) {
      continue;
    }


    /*
     * 水滴用Canvas
     */

    const temp =
      document.createElement(
        "canvas"
      );

    temp.width = width;
    temp.height = height;


    const tctx =
      temp.getContext("2d");


    const pixels =
      tctx.createImageData(
        width,
        height
      );


    /*
     * 球状の水滴として
     * 背景を屈折
     */

    for (
      let y = 0;
      y < height;
      y++
    ) {

      for (
        let x = 0;
        x < width;
        x++
      ) {

        const px =
          left + x;

        const py =
          top + y;


        const dx =
          px - d.x;

        const dy =
          py - d.y;


        const dist =
          Math.sqrt(
            dx * dx +
            dy * dy
          );


        const normalized =
          dist / r;


        if (
          normalized > 1.05
        ) {
          continue;
        }


        /*
         * 球状レンズの厚み
         */

        const sphere =
          Math.sqrt(
            Math.max(
              0,
              1 -
              normalized *
              normalized
            )
          );


        /*
         * 屈折量

           中心ほど強く
           背景をずらす
        */

        const refraction =
          sphere *
          r *
          .65;


        const sampleX =
          Math.round(
            px -
            (
              dx /
              Math.max(
                dist,
                .001
              )
            ) *
            refraction
          );


        const sampleY =
          Math.round(
            py -
            (
              dy /
              Math.max(
                dist,
                .001
              )
            ) *
            refraction
          );


        const sx =
          clamp(
            sampleX,
            0,
            W - 1
          );

        const sy =
          clamp(
            sampleY,
            0,
            H - 1
          );


        const sourceIndex =
          (
            sy * W + sx
          ) * 4;


        const targetIndex =
          (
            y * width + x
          ) * 4;


        const alpha =
          (
            1 -
            Math.pow(
              normalized,
              2
            )
          ) *
          .72 *
          Math.min(
            1,
            d.life
          );


        pixels.data[
          targetIndex
        ] =
          backgroundImageData.data[
            sourceIndex
          ];


        pixels.data[
          targetIndex + 1
        ] =
          backgroundImageData.data[
            sourceIndex + 1
          ];


        pixels.data[
          targetIndex + 2
        ] =
          backgroundImageData.data[
            sourceIndex + 2
          ];


        pixels.data[
          targetIndex + 3
        ] =
          Math.floor(
            alpha * 255
          );
      }
    }


    tctx.putImageData(
      pixels,
      0,
      0
    );


    /*
     * 屈折した背景
     */

    ctx.drawImage(
      temp,
      left,
      top
    );


    /*
     * 水滴表面のハイライト
     */

    const highlight =
      ctx.createRadialGradient(

        d.x -
          r * .38,

        d.y -
          r * .45,

        .1,

        d.x,
        d.y,

        r * 1.15
      );


    highlight.addColorStop(
      0,
      `rgba(
        255,255,255,
        ${.78 * d.life}
      )`
    );


    highlight.addColorStop(
      .08,
      `rgba(
        255,255,255,
        ${.3 * d.life}
      )`
    );


    highlight.addColorStop(
      .38,
      "rgba(255,255,255,0)"
    );


    highlight.addColorStop(
      .8,
      `rgba(
        210,245,255,
        ${.08 * d.life}
      )`
    );


    highlight.addColorStop(
      1,
      "rgba(150,220,240,0)"
    );


    ctx.fillStyle =
      highlight;


    ctx.beginPath();

    ctx.ellipse(
      d.x,
      d.y,

      r,
      r * 1.18,

      d.vy * .04,

      0,
      Math.PI * 2
    );

    ctx.fill();


    /*
     * 水滴の縁
     */

    ctx.strokeStyle =
      `rgba(
        240,252,255,
        ${.30 * d.life}
      )`;

    ctx.lineWidth = .7;

    ctx.beginPath();

    ctx.ellipse(
      d.x,
      d.y,

      r * .86,
      r,

      0,
      0,
      Math.PI * 2
    );

    ctx.stroke();
  }
}


/* =====================================================
   水滴更新
===================================================== */

function updateDrops(dt) {

  for (
    let i =
      drops.length - 1;

    i >= 0;

    i--
  ) {

    const d =
      drops[i];


    d.age += dt;
    d.life -= dt;


    if (
      d.life <= 0
    ) {

      drops.splice(i, 1);
      continue;
    }


    /*
     * ガラス表面を
     * ゆっくり下へ流れる
     */

    d.vy +=
      .55 * dt;

    d.vy *= .995;


    d.y +=
      d.vy;


    /*
     * 画面外
     */

    if (
      d.y >
      H + 50
    ) {

      drops.splice(i, 1);
    }
  }
}


/* =====================================================
   clamp
===================================================== */

function clamp(
  value,
  min,
  max
) {

  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}


/* =====================================================
   animation
===================================================== */

function animate(now) {

  const dt =
    Math.min(
      .033,
      (now - lastTime) / 1000
    );

  lastTime = now;


  ctx.clearRect(
    0,
    0,
    W,
    H
  );


  updateStreams(dt);

  updateDrops(dt);


  /*
   * ① 水が飛んでくる
   */

  drawStreams();


  /*
   * ② 衝突して広がる
   */

  drawImpacts(dt);


  /*
   * ③ 水滴越しに
   *    背景そのものを歪ませる
   */

  drawRefractedDrops();


  /*
   * 水の勢いを少しずつ減衰
   */

  waterPower *=
    Math.pow(
      .20,
      dt
    );


  requestAnimationFrame(
    animate
  );
}


requestAnimationFrame(
  animate
);
