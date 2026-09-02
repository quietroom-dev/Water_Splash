const canvas =
  document.getElementById("water");

const ctx =
  canvas.getContext("2d");

const background =
  document.getElementById("background");

const amount =
  document.getElementById("amount");

const value =
  document.getElementById("value");

const file =
  document.getElementById("file");

const clearButton =
  document.getElementById("clear");


let W = 0;
let H = 0;
let DPR = 1;


/*
=========================================================
 水滴
=========================================================
*/

const drops = [];


/*
=========================================================
 水膜
=========================================================
*/

const splashes = [];


/*
=========================================================
 水流
=========================================================
*/

const streams = [];


/*
=========================================================
 resize
=========================================================
*/

function resize() {

  W = window.innerWidth;
  H = window.innerHeight;

  DPR =
    Math.min(
      window.devicePixelRatio || 1,
      2
    );

  canvas.width =
    W * DPR;

  canvas.height =
    H * DPR;

  canvas.style.width =
    W + "px";

  canvas.style.height =
    H + "px";

  ctx.setTransform(
    DPR,
    0,
    0,
    DPR,
    0,
    0
  );
}

window.addEventListener(
  "resize",
  resize
);

resize();


/*
=========================================================
 水量
=========================================================
*/

value.textContent =
  amount.value + "%";

amount.addEventListener(
  "input",
  () => {

    value.textContent =
      amount.value + "%";

  }
);


/*
=========================================================
 背景変更
=========================================================
*/

let backgroundURL = null;

file.addEventListener(
  "change",
  event => {

    const selected =
      event.target.files[0];

    if (!selected) {
      return;
    }

    if (backgroundURL) {

      URL.revokeObjectURL(
        backgroundURL
      );
    }

    backgroundURL =
      URL.createObjectURL(
        selected
      );

    background.src =
      backgroundURL;
  }
);


/*
=========================================================
 reset
=========================================================
*/

clearButton.addEventListener(
  "click",
  () => {

    drops.length = 0;

    splashes.length = 0;

    streams.length = 0;
  }
);


/*
=========================================================
 utility
=========================================================
*/

function random(
  a,
  b
) {

  return (
    a +
    Math.random() *
    (b-a)
  );
}


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


/*
=========================================================
 タップ
=========================================================
*/

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
      event.clientX -
      rect.left;

    const y =
      event.clientY -
      rect.top;


    fireWater(
      x,
      y
    );
  }
);


/*
=========================================================
 水を発射
=========================================================
*/

function fireWater(
  targetX,
  targetY
) {

  const strength =
    Number(
      amount.value
    ) / 100;


  /*
    水の発射位置。
    背景中央奥から
    手前に向かって飛ぶ。
  */

  const sourceX =
    W * .5;

  const sourceY =
    H * .30;


  const dx =
    targetX -
    sourceX;

  const dy =
    targetY -
    sourceY;


  const distance =
    Math.hypot(
      dx,
      dy
    );


  const nx =
    dx / distance;

  const ny =
    dy / distance;


  /*
    大量の水塊
  */

  const count =
    Math.floor(
      35 +
      strength * 120
    );


  for (
    let i=0;
    i<count;
    i++
  ) {

    const t =
      Math.random() *
      .92;


    /*
      中心ほど太くする
    */

    const spread =
      (
        Math.random() -
        .5
      )
      *
      (
        5 +
        strength * 40
      )
      *
      (
        .2 +
        t
      );


    streams.push({

      x:
        sourceX +
        dx*t,

      y:
        sourceY +
        dy*t,

      vx:
        nx *
        random(
          500,
          850
        ),

      vy:
        ny *
        random(
          500,
          850
        ),

      size:
        random(
          2,
          5 +
          strength * 10
        ),

      life:
        random(
          .22,
          .65
        ),

      alpha:
        random(
          .35,
          .95
        ),

      spread
    });
  }


  /*
    衝突地点
  */

  splashes.push({

    x: targetX,

    y: targetY,

    age: 0,

    life:
      random(
        .7,
        1.4
      ),

    radius:
      12 +
      strength * 110,

    strength
  });


  /*
    画面表面に
    大量の水滴を生成
  */

  const dropletCount =
    Math.floor(
      25 +
      strength * 130
    );


  for (
    let i=0;
    i<dropletCount;
    i++
  ) {

    const angle =
      Math.random() *
      Math.PI *
      2;


    const radius =
      Math.random() *
      (
        20 +
        strength * 130
      );


    drops.push({

      x:
        targetX +
        Math.cos(angle) *
        radius,

      y:
        targetY +
        Math.sin(angle) *
        radius,

      radius:
        random(
          1.5,
          3.5 +
          strength * 11
        ),

      vx:
        random(
          -.5,
          .5
        ),

      vy:
        random(
          .2,
          2.5
        ),

      life:
        random(
          1.5,
          5
        ),

      age: 0,

      strength
    });
  }
}


/*
=========================================================
 水流
=========================================================
*/

function updateStreams(
  dt
) {

  for (
    let i =
      streams.length-1;

    i>=0;

    i--
  ) {

    const s =
      streams[i];


    s.life -= dt;


    if (
      s.life <= 0
    ) {

      streams.splice(
        i,
        1
      );

      continue;
    }


    s.x +=
      s.vx *
      dt;

    s.y +=
      s.vy *
      dt;


    /*
      空気抵抗
    */

    s.vx *=
      .985;

    s.vy *=
      .985;
  }
}


/*
=========================================================
 水流描画
=========================================================
*/

function drawStreams() {

  for (
    const s of streams
  ) {

    const alpha =
      clamp(
        s.life / .4,
        0,
        1
      )
      *
      s.alpha;


    /*
      水は白ではなく
      半透明の青白い光
    */

    const gradient =
      ctx.createLinearGradient(
        s.x -
          s.vx*.018,

        s.y -
          s.vy*.018,

        s.x +
          s.vx*.018,

        s.y +
          s.vy*.018
      );


    gradient.addColorStop(
      0,
      `rgba(
        150,210,235,
        0
      )`
    );


    gradient.addColorStop(
      .35,
      `rgba(
        220,245,255,
        ${alpha*.35}
      )`
    );


    gradient.addColorStop(
      .5,
      `rgba(
        255,255,255,
        ${alpha*.7}
      )`
    );


    gradient.addColorStop(
      1,
      `rgba(
        150,215,240,
        0
      )`
    );


    ctx.fillStyle =
      gradient;


    ctx.beginPath();

    ctx.ellipse(
      s.x,
      s.y,

      s.size * 3.5,
      s.size,

      Math.atan2(
        s.vy,
        s.vx
      ),

      0,
      Math.PI*2
    );

    ctx.fill();
  }
}


/*
=========================================================
 衝突水膜
=========================================================
*/

function drawSplashes(
  dt
) {

  for (
    let i =
      splashes.length-1;

    i>=0;

    i--
  ) {

    const s =
      splashes[i];


    s.age += dt;


    if (
      s.age >
      s.life
    ) {

      splashes.splice(
        i,
        1
      );

      continue;
    }


    const progress =
      s.age /
      s.life;


    const radius =
      s.radius *
      (
        .25 +
        progress *
        .75
      );


    const alpha =
      (
        1-progress
      )
      *
      s.strength;


    /*
      水が画面に
      叩きつけられた膜
    */

    const gradient =
      ctx.createRadialGradient(
        s.x,
        s.y,
        0,

        s.x,
        s.y,
        radius
      );


    gradient.addColorStop(
      0,
      `rgba(
        210,240,250,
        ${alpha*.25}
      )`
    );


    gradient.addColorStop(
      .35,
      `rgba(
        200,235,248,
        ${alpha*.16}
      )`
    );


    gradient.addColorStop(
      .75,
      `rgba(
        220,245,255,
        ${alpha*.06}
      )`
    );


    gradient.addColorStop(
      1,
      "rgba(180,230,250,0)"
    );


    ctx.fillStyle =
      gradient;


    ctx.beginPath();

    ctx.arc(
      s.x,
      s.y,
      radius,
      0,
      Math.PI*2
    );

    ctx.fill();


    /*
      水膜の筋
    */

    const lines =
      18 +
      Math.floor(
        s.strength * 20
      );


    ctx.lineCap =
      "round";


    for (
      let j=0;
      j<lines;
      j++
    ) {

      const angle =
        j /
        lines *
        Math.PI *
        2;


      const inner =
        radius *
        random(
          .15,
          .35
        );


      const outer =
        radius *
        random(
          .55,
          1
        );


      ctx.strokeStyle =
        `rgba(
          235,250,255,
          ${alpha*.18}
        )`;


      ctx.lineWidth =
        random(
          .4,
          1.5
        );


      ctx.beginPath();

      ctx.moveTo(
        s.x +
        Math.cos(angle) *
        inner,

        s.y +
        Math.sin(angle) *
        inner
      );


      ctx.quadraticCurveTo(

        s.x +
        Math.cos(
          angle+.2
        ) *
        (
          radius*.5
        ),

        s.y +
        Math.sin(
          angle+.2
        ) *
        (
          radius*.5
        ),

        s.x +
        Math.cos(angle) *
        outer,

        s.y +
        Math.sin(angle) *
        outer
      );


      ctx.stroke();
    }
  }
}


/*
=========================================================
 水滴
=========================================================
*/

function drawDrops(
  dt
) {

  for (
    let i =
      drops.length-1;

    i>=0;

    i--
  ) {

    const d =
      drops[i];


    d.age += dt;

    d.life -= dt;


    if (
      d.life <= 0
    ) {

      drops.splice(
        i,
        1
      );

      continue;
    }


    /*
      重力
    */

    d.vy +=
      .7 *
      dt;


    d.x +=
      d.vx;

    d.y +=
      d.vy;


    const alpha =
      Math.min(
        1,
        d.life
      );


    /*
      水滴の影
    */

    ctx.beginPath();

    ctx.fillStyle =
      `rgba(
        20,80,100,
        ${alpha*.13}
      )`;

    ctx.ellipse(
      d.x + 1.2,
      d.y + 1.8,

      d.radius*1.05,
      d.radius*1.25,

      0,
      0,
      Math.PI*2
    );

    ctx.fill();


    /*
      水滴本体
    */

    const gradient =
      ctx.createRadialGradient(

        d.x -
          d.radius*.35,

        d.y -
          d.radius*.45,

        .1,

        d.x,
        d.y,

        d.radius*1.2
      );


    gradient.addColorStop(
      0,
      `rgba(
        255,255,255,
        ${alpha*.8}
      )`
    );


    gradient.addColorStop(
      .12,
      `rgba(
        225,248,255,
        ${alpha*.38}
      )`
    );


    gradient.addColorStop(
      .55,
      `rgba(
        140,210,235,
        ${alpha*.10}
      )`
    );


    gradient.addColorStop(
      .85,
      `rgba(
        255,255,255,
        ${alpha*.30}
      )`
    );


    gradient.addColorStop(
      1,
      "rgba(120,200,230,0)"
    );


    ctx.fillStyle =
      gradient;


    ctx.beginPath();

    ctx.ellipse(
      d.x,
      d.y,

      d.radius,
      d.radius*1.25,

      d.vy*.03,

      0,
      Math.PI*2
    );

    ctx.fill();


    /*
      水滴のハイライト
    */

    ctx.fillStyle =
      `rgba(
        255,255,255,
        ${alpha*.7}
      )`;


    ctx.beginPath();

    ctx.ellipse(
      d.x -
        d.radius*.35,

      d.y -
        d.radius*.48,

      d.radius*.18,

      d.radius*.38,

      -.4,

      0,
      Math.PI*2
    );

    ctx.fill();
  }
}


/*
=========================================================
 メインループ
=========================================================
*/

let previous =
  performance.now();


function animate(
  now
) {

  const dt =
    Math.min(
      .033,
      (
        now -
        previous
      ) / 1000
    );


  previous =
    now;


  ctx.clearRect(
    0,
    0,
    W,
    H
  );


  updateStreams(
    dt
  );


  drawStreams();

  drawSplashes(
    dt
  );

  drawDrops(
    dt
  );


  requestAnimationFrame(
    animate
  );
}


requestAnimationFrame(
  animate
);
