import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';

// 1. FAVICON SVG (512x512)
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <style>
    .pink { fill: #FF1493; }
    .black { fill: #000000; }
  </style>

  <!-- Black Crescent Circle Outer Arc -->
  <path class="black" d="
    M 380,110
    C 280,30 110,90 65,220
    C 25,335 100,450 250,470
    C 340,482 420,440 450,385
    C 420,425 345,460 260,450
    C 130,435 60,330 90,210
    C 125,95 270,45 380,110
    Z
  " />

  <!-- Antennae -->
  <!-- Left Antenna -->
  <path class="pink" d="M 215,310 Q 180,260 148,225 C 145,221 140,227 143,231 Q 175,266 210,315 Z" />
  <circle cx="145" cy="223" r="14" class="pink" />

  <!-- Right Antenna -->
  <path class="pink" d="M 225,305 Q 200,245 185,195 C 182,192 177,196 179,200 Q 195,250 220,310 Z" />
  <circle cx="182" cy="193" r="14" class="pink" />

  <!-- Pink Butterfly Wing -->
  <path class="pink" d="
    M 215,320
    C 210,290 230,240 280,185
    C 330,135 375,125 380,150
    C 385,175 365,230 360,270
    C 355,300 370,330 405,370
    C 415,382 410,400 390,405
    C 350,415 300,380 265,345
    C 240,320 220,330 215,320
    Z
  " />
</svg>`;

// 2. LOGO SVG (1200x380)
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 380" width="1200" height="380">
  <defs>
    <style>
      .pink { fill: #FF1493; }
      .black { fill: #000000; }
    </style>
  </defs>

  <!-- LOGO ICON (Left side: X 20..360, Y 10..370) -->
  <g transform="translate(10, 10) scale(0.72)">
    <!-- Black Crescent Circle Outer Arc -->
    <path class="black" d="
      M 380,110
      C 280,30 110,90 65,220
      C 25,335 100,450 250,470
      C 340,482 420,440 450,385
      C 420,425 345,460 260,450
      C 130,435 60,330 90,210
      C 125,95 270,45 380,110
      Z
    " />

    <!-- Antennae -->
    <path class="pink" d="M 215,310 Q 180,260 148,225 C 145,221 140,227 143,231 Q 175,266 210,315 Z" />
    <circle cx="145" cy="223" r="14" class="pink" />

    <path class="pink" d="M 225,305 Q 200,245 185,195 C 182,192 177,196 179,200 Q 195,250 220,310 Z" />
    <circle cx="182" cy="193" r="14" class="pink" />

    <!-- Pink Butterfly Wing -->
    <path class="pink" d="
      M 215,320
      C 210,290 230,240 280,185
      C 330,135 375,125 380,150
      C 385,175 365,230 360,270
      C 355,300 370,330 405,370
      C 415,382 410,400 390,405
      C 350,415 300,380 265,345
      C 240,320 220,330 215,320
      Z
    " />
  </g>

  <!-- TEXT "musky" (X: 340, Y: 220) with Liquid Dripping "m" -->
  <g transform="translate(340, 100)">
    <!-- 'm' with drips -->
    <path class="black" d="
      M 0,40
      C 0,20 15,0 35,0
      C 50,0 62,10 68,22
      C 75,8 88,0 105,0
      C 125,0 140,18 140,40
      L 140,110
      C 140,118 132,125 125,125
      C 118,125 110,118 110,110
      L 110,45
      C 110,32 102,22 92,22
      C 82,22 72,32 72,45
      L 72,110
      C 72,118 64,125 57,125
      C 50,125 42,118 42,110
      L 42,45
      C 42,32 34,22 24,22
      C 14,22 0,32 0,45
      L 0,110
      C 0,118 -8,125 -15,125
      C -22,125 -30,118 -30,110
      L -30,40
      Z
    " />
    
    <!-- Drips under 'm' -->
    <!-- Drip 1 -->
    <path class="black" d="M -22,110 L -22,145 C -22,152 -12,152 -12,145 L -12,110 Z" />
    <circle cx="-17" cy="158" r="5" class="black" />

    <!-- Drip 2 -->
    <path class="black" d="M 50,110 L 50,155 C 50,163 62,163 62,155 L 62,110 Z" />
    <circle cx="56" cy="170" r="6" class="black" />

    <!-- Drip 3 -->
    <path class="black" d="M 120,110 L 120,140 C 120,146 130,146 130,140 L 130,110 Z" />
    <circle cx="125" cy="152" r="4.5" class="black" />

    <!-- 'u' -->
    <path class="black" d="
      M 160,5
      C 168,5 175,12 175,20
      L 175,80
      C 175,98 190,110 208,110
      C 226,110 240,98 240,80
      L 240,20
      C 240,12 247,5 255,5
      C 263,5 270,12 270,20
      L 270,110
      C 270,118 263,125 255,125
      C 247,125 240,118 240,110
      L 240,98
      C 230,115 212,128 190,128
      C 160,128 145,105 145,75
      L 145,20
      C 145,12 152,5 160,5
      Z
    " />

    <!-- 's' -->
    <path class="black" d="
      M 325,32
      C 315,22 300,18 288,24
      C 278,29 275,40 282,48
      C 288,54 300,58 315,64
      C 338,73 348,88 342,105
      C 334,124 308,132 285,128
      C 268,125 255,112 250,98
      C 247,90 253,83 261,83
      C 268,83 274,88 277,94
      C 283,105 296,110 308,106
      C 318,102 322,92 316,84
      C 310,77 298,73 283,67
      C 262,58 252,44 258,26
      C 266,6 292,-4 316,2
      C 330,6 342,18 346,30
      C 349,38 342,45 334,45
      C 328,45 324,40 325,32
      Z
    " />

    <!-- 'k' -->
    <path class="black" d="
      M 365,-30
      C 373,-30 380,-23 380,-15
      L 380,110
      C 380,118 373,125 365,125
      C 357,125 350,118 350,110
      L 350,-15
      C 350,-23 357,-30 365,-30
      Z
      M 430,20
      C 436,13 446,13 452,20
      C 458,27 458,37 452,43
      L 405,85
      L 458,110
      C 466,114 468,124 463,131
      C 458,138 448,140 441,135
      L 380,105
      L 380,60
      Z
    " />

    <!-- 'y' -->
    <path class="black" d="
      M 480,20
      C 480,12 487,5 495,5
      C 503,5 510,12 510,20
      L 528,75
      L 548,20
      C 548,12 555,5 563,5
      C 571,5 578,12 578,20
      L 542,112
      C 530,142 510,160 482,160
      C 472,160 465,153 465,145
      C 465,137 472,130 482,130
      C 498,130 512,120 520,100
      Z
    " />
  </g>

  <!-- TEXT "Dose" (X: 930, Y: 100) with 3 speed lines on 'E' -->
  <g transform="translate(930, 90)">
    <!-- 'D' -->
    <path class="black" d="
      M 0,0
      L 45,0
      C 75,0 95,18 95,52
      C 95,86 75,105 45,105
      L 0,105
      Z
      M 28,26
      L 28,79
      L 42,79
      C 58,79 67,68 67,52
      C 67,36 58,26 42,26
      Z
    " />

    <!-- 'o' -->
    <path class="black" d="
      M 138,28
      C 158,28 172,44 172,66
      C 172,88 158,104 138,104
      C 118,104 104,88 104,66
      C 104,44 118,28 138,28
      Z
      M 138,50
      C 129,50 123,57 123,66
      C 123,75 129,82 138,82
      C 147,82 153,75 153,66
      C 153,57 147,50 138,50
      Z
    " />

    <!-- 's' -->
    <path class="black" d="
      M 215,48
      C 208,40 198,37 190,41
      C 183,44 180,51 185,57
      C 189,61 198,64 208,68
      C 223,74 230,85 226,97
      C 220,110 202,115 186,112
      C 174,110 165,100 162,90
      C 160,84 165,79 171,79
      C 176,79 180,83 182,87
      C 186,95 195,98 203,95
      C 210,92 213,85 208,80
      C 204,75 196,72 185,68
      C 170,61 163,51 167,38
      C 172,24 190,17 207,21
      C 217,24 225,32 228,41
      C 230,47 225,52 219,52
      C 217,52 215,50 215,48
      Z
    " />

    <!-- 'e' with 3 motion speed lines -->
    <path class="black" d="
      M 268,28
      C 288,28 300,42 298,64
      L 242,64
      C 243,76 250,83 262,83
      C 270,83 277,78 280,72
      C 282,68 287,65 292,66
      C 298,67 302,72 300,78
      C 294,94 280,104 262,104
      C 240,104 226,88 226,66
      C 226,44 242,28 268,28
      Z
      M 266,46
      C 255,46 245,52 243,60
      L 281,60
      C 281,51 275,46 266,46
      Z
    " />

    <!-- 3 Speed lines extending from right of 'e' -->
    <!-- Line 1 (Top) -->
    <path class="black" d="M 308,42 L 335,42 C 339,42 342,45 342,48 C 342,51 339,54 335,54 L 308,54 Z" />
    <circle cx="350" cy="48" r="4.5" class="black" />

    <!-- Line 2 (Middle) -->
    <path class="black" d="M 308,63 L 340,63 C 344,63 347,66 347,69 C 347,72 344,75 340,75 L 308,75 Z" />
    <circle cx="355" cy="69" r="4.5" class="black" />

    <!-- Line 3 (Bottom) -->
    <path class="black" d="M 308,84 L 332,84 C 336,84 339,87 339,90 C 339,93 336,96 332,96 L 308,96 Z" />
    <circle cx="347" cy="90" r="4.5" class="black" />
  </g>
</svg>`;

async function main() {
  const publicDir = path.join(process.cwd(), 'public');

  // Render Favicon PNG (512x512)
  const resvgFavicon = new Resvg(faviconSvg, {
    fitTo: { mode: 'width', value: 512 },
  });
  const faviconBuffer = resvgFavicon.render().asPng();

  fs.writeFileSync(path.join(publicDir, 'favicon.png'), faviconBuffer);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), faviconBuffer);
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), faviconBuffer);
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), faviconBuffer);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), faviconBuffer);

  // Render Logo PNG (1200x380)
  const resvgLogo = new Resvg(logoSvg, {
    fitTo: { mode: 'width', value: 1200 },
  });
  const logoBuffer = resvgLogo.render().asPng();

  fs.writeFileSync(path.join(publicDir, 'logo.png'), logoBuffer);

  console.log('Successfully generated crisp PNG brand assets!');
}

main().catch(console.error);
