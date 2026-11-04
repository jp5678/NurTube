// 홈 헤더의 움직이는 그림: AI 신경망 → 간호(십자) 노드, 아래에 심전도 파형
// 움직임은 css/style.css의 .hero-art 규칙이 담당 (움직임 줄이기 설정 시 정지)
window.NT = window.NT || {};

NT.heroArt = (() => {
  const LAYERS = [
    [[40, 30], [40, 70], [40, 110]],
    [[120, 20], [120, 55], [120, 90], [120, 125]],
    [[200, 45], [200, 100]],
  ];
  const OUT = [278, 72];
  const ECG = "M0 160 H120 L128 150 L136 160 H146 L152 122 L160 178 L166 160 H180 L190 148 L200 160 H360";

  const pairs = (a, b) => a.flatMap((p) => b.map((q) => [p, q]));
  const edges = [
    ...pairs(LAYERS[0], LAYERS[1]),
    ...pairs(LAYERS[1], LAYERS[2]),
    ...LAYERS[2].map((p) => [p, OUT]),
  ];
  const line = ([[x1, y1], [x2, y2]], cls, i) =>
    `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="--d:${(i % 5) * -0.32}s"/>`;
  // 데이터가 흐르는 선은 일부만 골라 눈이 편하게
  const flowing = edges.filter((_, i) => i % 3 === 0 || i >= edges.length - 2);
  const nodes = LAYERS.flat().map(([x, y], i) =>
    `<circle class="node" cx="${x}" cy="${y}" r="6" style="--d:${(i * 0.27).toFixed(2)}s"/>`);

  return `<svg class="hero-art" viewBox="0 0 360 190" aria-hidden="true" focusable="false">
    <g>${edges.map((e, i) => line(e, "edge", i)).join("")}</g>
    <g>${flowing.map((e, i) => line(e, "flow", i)).join("")}</g>
    <g>${nodes.join("")}</g>
    <circle class="ring" cx="${OUT[0]}" cy="${OUT[1]}" r="22"/>
    <circle class="out" cx="${OUT[0]}" cy="${OUT[1]}" r="22"/>
    <path class="cross" d="M${OUT[0] - 3} ${OUT[1] - 11}h6v8h8v6h-8v8h-6v-8h-8v-6h8z"/>
    <path class="ecg-bg" d="${ECG}"/>
    <path class="ecg" d="${ECG}" pathLength="100"/>
  </svg>`;
})();
