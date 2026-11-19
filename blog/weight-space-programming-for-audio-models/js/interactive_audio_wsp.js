/* Interactive First-Principles Visualizations for:
   "Weight-Space Programming for Audio Models: LLMs Can Directly Edit Audio Model Weights and Compress Them"
*/
(function () {
  "use strict";

  // =========================================================================
  // 1. Interactive Acoustic Nuisance Profiler & Weight Surgery (Figure 1)
  // =========================================================================
  function initNuisanceWidget() {
    const canvas = document.getElementById("fig1-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const slider = document.getElementById("fig1-gamma-slider");
    const valSpan = document.getElementById("fig1-gamma-val");
    const btnDeepfake = document.getElementById("fig1-mode-deepfake");
    const btnASR = document.getElementById("fig1-mode-asr");
    const btnPlay = document.getElementById("fig1-play-btn");

    let mode = "deepfake"; // "deepfake" | "asr"
    let gamma = 0.0;
    let animId = null;

    const realBase = [
      [-1.35, -0.18], [-1.12, 0.14], [-1.28, -0.35], [-0.92, 0.05],
      [-1.18, 0.24], [-1.04, -0.28], [-1.42, 0.08], [-0.98, -0.14],
    ];
    const mp3Shifts = [
      [0.06, 1.18], [-0.04, 1.24], [0.05, 1.12], [0.02, 1.22],
      [-0.03, 1.15], [0.04, 1.26], [0.01, 1.19], [-0.02, 1.21],
    ];
    const telShifts = [
      [0.12, 1.56], [0.08, 1.62], [0.11, 1.48], [0.09, 1.58],
      [0.05, 1.52], [0.10, 1.64], [0.07, 1.55], [0.08, 1.59],
    ];
    const spoofPts = [
      [1.12, 0.22], [1.38, 0.48], [1.22, -0.12], [0.96, 0.38],
      [1.32, 0.08], [1.16, -0.28], [1.44, 0.30], [1.05, -0.05],
    ];

    function draw() {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Left Card: 2D Hidden State Plane (u_task vs u_codec)
      ctx.fillStyle = "#f9fbfa";
      ctx.strokeStyle = "#d5e0da";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(14, 14, 435, H - 28, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#222";
      ctx.font = "600 13px 'Source Sans 3', sans-serif";
      ctx.fillText(
        mode === "deepfake"
          ? "A. Hidden-State Geometry (Wav2Vec2 Layer 20)"
          : "A. Conformer Encoder Geometry (Layer 32)",
        28,
        36
      );

      // Axes
      const ox = 232;
      const oy = 185;
      const sx = 76;
      const sy = 68;

      ctx.strokeStyle = "#cccccc";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(32, oy);
      ctx.lineTo(432, oy);
      ctx.moveTo(ox, 50);
      ctx.lineTo(ox, 232);
      ctx.stroke();

      ctx.fillStyle = "#555";
      ctx.font = "11.5px 'JetBrains Mono', monospace";
      ctx.fillText(
        mode === "deepfake"
          ? "Task Axis u_task (Real < 0 | Deepfake > 0)"
          : "Phonetic Axis u_task (Consonant /t/ < 0 | /d/ > 0)",
        85,
        248
      );
      ctx.save();
      ctx.translate(28, 210);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("Codec / Channel Nuisance Axis u_codec", 0, 0);
      ctx.restore();

      // Tilted Unedited Decision Boundary (dashed red)
      ctx.strokeStyle = "#d93a4b";
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(ox - 92, oy + 45);
      ctx.lineTo(ox + 78, oy - 128);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#d93a4b";
      ctx.font = "600 11px 'Source Sans 3', sans-serif";
      ctx.fillText("Unedited Boundary (Tilted by Codec Shortcut!)", ox + 8, 62);

      // Orthogonal WSP Boundary (solid green)
      ctx.strokeStyle = "#118659";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(ox, 48);
      ctx.lineTo(ox, 228);
      ctx.stroke();
      ctx.fillStyle = "#118659";
      ctx.fillText("WSP Orthogonal Boundary", ox + 6, 222);

      // Plot points: Clean WAV (blue circles), MP3 (orange squares), Telephone/Encodec (purple triangles)
      for (let i = 0; i < realBase.length; i++) {
        const [rx, ry] = realBase[i];
        const [mx, my] = mp3Shifts[i];
        const [tx, ty] = telShifts[i];

        const cx = ox + rx * sx;
        const cy = oy - ry * sy;

        const mpx = ox + (rx + (1 - gamma) * mx) * sx;
        const mpy = oy - (ry + (1 - gamma) * my) * sy;

        const tpx = ox + (rx + (1 - gamma) * tx) * sx;
        const tpy = oy - (ry + (1 - gamma) * ty) * sy;

        // Drift connector lines
        ctx.strokeStyle = "rgba(230, 126, 34, 0.45)";
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(mpx, mpy);
        ctx.stroke();

        ctx.strokeStyle = "rgba(123, 100, 184, 0.45)";
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(tpx, tpy);
        ctx.stroke();

        // Clean .WAV circle
        ctx.fillStyle = "#1f77b4";
        ctx.beginPath();
        ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // 64kbps .MP3 square
        ctx.fillStyle = "#e67e22";
        ctx.fillRect(mpx - 4, mpy - 4, 8, 8);

        // 8kHz Telephone / Encodec triangle
        ctx.fillStyle = "#7b64b8";
        ctx.beginPath();
        ctx.moveTo(tpx, tpy - 5);
        ctx.lineTo(tpx - 4.5, tpy + 4);
        ctx.lineTo(tpx + 4.5, tpy + 4);
        ctx.closePath();
        ctx.fill();
      }

      // Spoof / Target Class B points (red X)
      ctx.strokeStyle = "#d93a4b";
      ctx.lineWidth = 2;
      for (let i = 0; i < spoofPts.length; i++) {
        const [sx0, sy0] = spoofPts[i];
        const px = ox + sx0 * sx;
        const py = oy - sy0 * sy;
        ctx.beginPath();
        ctx.moveTo(px - 4, py - 4);
        ctx.lineTo(px + 4, py + 4);
        ctx.moveTo(px + 4, py - 4);
        ctx.lineTo(px - 4, py + 4);
        ctx.stroke();
      }

      // Legend inside Left Card
      const legY = 266;
      ctx.fillStyle = "#1f77b4";
      ctx.beginPath();
      ctx.arc(38, legY - 4, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#333";
      ctx.font = "11.5px 'Source Sans 3', sans-serif";
      ctx.fillText("Clean .WAV", 47, legY);

      ctx.fillStyle = "#e67e22";
      ctx.fillRect(118, legY - 8, 8, 8);
      ctx.fillStyle = "#333";
      ctx.fillText("Same Audio as .MP3", 130, legY);

      ctx.fillStyle = "#7b64b8";
      ctx.beginPath();
      ctx.moveTo(242, legY - 9);
      ctx.lineTo(237.5, legY);
      ctx.lineTo(246.5, legY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#333";
      ctx.fillText("8kHz Tel / Encodec", 251, legY);

      ctx.strokeStyle = "#d93a4b";
      ctx.beginPath();
      ctx.moveTo(356, legY - 8);
      ctx.lineTo(364, legY);
      ctx.moveTo(364, legY - 8);
      ctx.lineTo(356, legY);
      ctx.stroke();
      ctx.fillText(mode === "deepfake" ? "Deepfake" : "Other Phoneme", 369, legY);

      // Right Card: Live Before-vs-After Bar Chart of Drift & Error Rate
      ctx.fillStyle = "#f9fbfa";
      ctx.strokeStyle = "#d5e0da";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(465, 14, W - 479, H - 28, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#222";
      ctx.font = "600 13px 'Source Sans 3', sans-serif";
      ctx.fillText(
        mode === "deepfake"
          ? "B. Measured Codec Drift & Deepfake Equal Error Rate (EER %)"
          : "B. Measured Channel Drift & Speech Word Error Rate (WER %)",
        480,
        36
      );

      const metrics =
        mode === "deepfake"
          ? [
              {
                label: "64kbps MP3 Activation Drift ||H_mp3 - H_wav||",
                before: 1.42,
                after: 1.42 * (1 - 0.84 * gamma),
                max: 2.0,
                unit: "",
              },
              {
                label: "Encodec / 8kHz Tel Drift ||H_tel - H_wav||",
                before: 1.88,
                after: 1.88 * (1 - 0.81 * gamma),
                max: 2.0,
                unit: "",
              },
              {
                label: "In-The-Wild Real-World Deepfake EER (%)",
                before: 11.22,
                after: 11.22 - (11.22 - 2.51) * gamma,
                max: 12.5,
                unit: "%",
              },
              {
                label: "ASVspoof 2021 Codec/DF Eval EER (%)",
                before: 8.32,
                after: 8.32 - (8.32 - 1.98) * gamma,
                max: 10.0,
                unit: "%",
              },
            ]
          : [
              {
                label: "8kHz PSTN Mel Std Collapse Factor (Dead Bins >3.4kHz)",
                before: 8.5,
                after: 8.5 - (8.5 - 1.15) * gamma,
                max: 9.5,
                unit: "x hiss",
              },
              {
                label: "Conformer Layer 32 Drift ||H_noisy - H_clean||",
                before: 0.58,
                after: 0.58 * (1 - 0.64 * gamma),
                max: 0.7,
                unit: "",
              },
              {
                label: "4-Dataset Noisy / Reverberant ASR Macro WER (%)",
                before: 8.09,
                after: 8.09 - (8.09 - 6.87) * gamma,
                max: 9.5,
                unit: "%",
              },
              {
                label: "URGENT 2024 Noisy Competition ASR WER (%)",
                before: 10.97,
                after: 10.97 - (10.97 - 8.66) * gamma,
                max: 12.5,
                unit: "%",
              },
            ];

      const barLeft = 482;
      const barMaxW = W - 575;
      metrics.forEach((m, idx) => {
        const y0 = 64 + idx * 52;
        ctx.fillStyle = "#333";
        ctx.font = "600 11.5px 'Source Sans 3', sans-serif";
        ctx.fillText(m.label, barLeft, y0);

        // Background track
        ctx.fillStyle = "#e9efec";
        ctx.fillRect(barLeft, y0 + 7, barMaxW, 18);

        // Ghost bar for unedited baseline (gamma=0)
        const wBefore = (m.before / m.max) * barMaxW;
        ctx.fillStyle = "rgba(217, 58, 75, 0.25)";
        ctx.fillRect(barLeft, y0 + 7, wBefore, 18);

        // Current bar at current gamma
        const wCur = (m.after / m.max) * barMaxW;
        ctx.fillStyle = gamma > 0.5 ? "#2e996a" : "#e67e22";
        ctx.fillRect(barLeft, y0 + 7, wCur, 18);

        ctx.fillStyle = "#111";
        ctx.font = "600 11.5px 'JetBrains Mono', monospace";
        ctx.fillText(
          `${m.after.toFixed(2)}${m.unit} (was ${m.before.toFixed(2)}${m.unit})`,
          barLeft + Math.max(wBefore, wCur) + 6,
          y0 + 20
        );
      });
    }

    slider.addEventListener("input", () => {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
        btnPlay.textContent = "Auto-Animate Surgery (γ: 0% → 100%)";
      }
      gamma = parseFloat(slider.value);
      valSpan.textContent = `${Math.round(gamma * 100)}% (γ = ${gamma.toFixed(2)})`;
      draw();
    });

    btnDeepfake.addEventListener("click", () => {
      mode = "deepfake";
      btnDeepfake.classList.add("active-pill");
      btnASR.classList.remove("active-pill");
      draw();
    });

    btnASR.addEventListener("click", () => {
      mode = "asr";
      btnASR.classList.add("active-pill");
      btnDeepfake.classList.remove("active-pill");
      draw();
    });

    btnPlay.addEventListener("click", () => {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
        btnPlay.textContent = "Auto-Animate Surgery (γ: 0% → 100%)";
        return;
      }
      gamma = 0.0;
      btnPlay.textContent = "Pause Animation";
      function step() {
        gamma += 0.012;
        if (gamma > 1.0) gamma = 0.0;
        slider.value = gamma.toFixed(2);
        valSpan.textContent = `${Math.round(gamma * 100)}% (γ = ${gamma.toFixed(2)})`;
        draw();
        animId = requestAnimationFrame(step);
      }
      animId = requestAnimationFrame(step);
    });

    draw();
  }

  // =========================================================================
  // 2. Interactive Orthogonal Null-Space vs. Naive Nulling (Figure 2A)
  // =========================================================================
  function initOrthogonalSurgeryWidget() {
    const canvas = document.getElementById("fig2a-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const btns = document.querySelectorAll("[data-fig2a-mode]");
    let mode = "orth"; // "orig" | "naive" | "orth"

    function drawArrow(x1, y1, x2, y2, color, width, label, labelOffset) {
      const head = 9;
      const angle = Math.atan2(y2 - y1, x2 - x1);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      if (label) {
        ctx.font = "600 12px 'Source Sans 3', sans-serif";
        ctx.fillText(label, x2 + (labelOffset ? labelOffset[0] : 6), y2 + (labelOffset ? labelOffset[1] : 0));
      }
    }

    function draw() {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Left Panel: Vector Geometry
      ctx.fillStyle = "#f9fbfa";
      ctx.strokeStyle = "#d5e0da";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(14, 14, 440, H - 28, 8);
      ctx.fill();
      ctx.stroke();

      const ox = 85;
      const oy = 188;

      ctx.strokeStyle = "#ccd6d0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, oy);
      ctx.lineTo(425, oy);
      ctx.moveTo(ox, 38);
      ctx.lineTo(ox, 215);
      ctx.stroke();

      // Task vector v_task along horizontal axis
      drawArrow(ox, oy, ox + 260, oy, "#1f77b4", 3, "Task Direction q_task (Real vs. Fake)", [-130, 22]);

      // Raw Codec Drift vector d_codec at 28 deg overlap (cos theta = 0.47)
      const rawX = ox + 135;
      const rawY = oy - 122;
      drawArrow(ox, oy, rawX, rawY, "#d93a4b", 2.4, "Raw MP3/Tel Drift d_codec (28° overlap, cos θ = 0.47)", [-20, -10]);

      if (mode === "naive") {
        // Naive nulling deletes along d_codec, shrinking q_task by 22.1%!
        ctx.strokeStyle = "#e67e22";
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ox + 260, oy);
        ctx.lineTo(ox + 202, oy);
        ctx.stroke();
        ctx.setLineDash([]);
        drawArrow(ox, oy, ox + 202, oy, "#e67e22", 3.5, "Remaining Task Signal (-22.1% Destroyed!)", [-40, -16]);
      } else if (mode === "orth") {
        // Gram-Schmidt / QR deflated u_nuis strictly at 90 degrees!
        ctx.strokeStyle = "#888";
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(rawX, rawY);
        ctx.lineTo(ox, rawY);
        ctx.moveTo(rawX, rawY);
        ctx.lineTo(rawX, oy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Right-angle square marker
        ctx.strokeStyle = "#118659";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(ox, oy - 14, 14, 14);

        drawArrow(
          ox,
          oy,
          ox,
          rawY,
          "#118659",
          3.2,
          "Orthogonal u_nuis = d_codec - (d_codec · q_task) q_task (Exact 90°!)",
          [10, 4]
        );
      }

      // Right Panel: Exact Measured Impact Table/Bars
      ctx.fillStyle = "#f9fbfa";
      ctx.strokeStyle = "#d5e0da";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(470, 14, W - 484, H - 28, 8);
      ctx.fill();
      ctx.stroke();

      const stats =
        mode === "orig"
          ? {
              title: "1. Unedited Base Weights (No Surgery)",
              taskRetained: "100.0%",
              codecRemoved: "0.0% (Full Codec Leakage)",
              asv19EER: "0.22% EER",
              itwEER: "11.22% EER (Fails on MP3/Social Media)",
              asrCleanWER: "2.07% WER",
              color: "#555555",
            }
          : mode === "naive"
          ? {
              title: "2. Naive PCA Nulling (Without Orthogonalizing First)",
              taskRetained: "77.9% (-22.1% Task Signal Erased!)",
              codecRemoved: "100.0%",
              asv19EER: "0.89% EER (4.0× Worse on Clean Studio!)",
              itwEER: "5.40% EER",
              asrCleanWER: "3.41% WER (+1.34% Degradation!)",
              color: "#d93a4b",
            }
          : {
              title: "3. 90° Orthogonal Null-Space Surgery (Gram-Schmidt / QR)",
              taskRetained: "100.0% (Zero Task Signal Lost!)",
              codecRemoved: "88.4% (Orthogonal Codec Drift Erased)",
              asv19EER: "0.12% EER (45% Better than Base!)",
              itwEER: "2.51% EER (4.5× Better on In-The-Wild!)",
              asrCleanWER: "2.02% WER (Zero Clean Degradation!)",
              color: "#118659",
            };

      ctx.fillStyle = stats.color;
      ctx.font = "700 13.5px 'Source Sans 3', sans-serif";
      ctx.fillText(stats.title, 488, 40);

      const rows = [
        ["Task Signal Retained (||W q_task||):", stats.taskRetained],
        ["Codec Nuisance Drift Removed:", stats.codecRemoved],
        ["ASVspoof 2019 Clean Eval EER:", stats.asv19EER],
        ["In-The-Wild Real-World Eval EER:", stats.itwEER],
        ["LibriSpeech Clean Speech WER:", stats.asrCleanWER],
      ];

      rows.forEach(([k, v], i) => {
        const y = 74 + i * 32;
        ctx.fillStyle = "#444";
        ctx.font = "600 12px 'Source Sans 3', sans-serif";
        ctx.fillText(k, 488, y);
        ctx.fillStyle = stats.color;
        ctx.font = "600 12px 'JetBrains Mono', monospace";
        ctx.fillText(v, 695, y);
      });
    }

    btns.forEach((b) => {
      b.addEventListener("click", () => {
        btns.forEach((x) => x.classList.remove("active-pill"));
        b.classList.add("active-pill");
        mode = b.getAttribute("data-fig2a-mode");
        draw();
      });
    });

    draw();
  }

  // =========================================================================
  // 3. Interactive Signal-to-Noise Eigen-Filter (GEVD Demystified, Figure 2B)
  // =========================================================================
  function initGEVDSNRWidget() {
    const canvas = document.getElementById("fig2b-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const slider = document.getElementById("fig2b-rank-slider");
    const label = document.getElementById("fig2b-rank-val");

    const ranks = [32, 64, 96, 128, 256, 1280];
    const wers = { 32: 7.18, 64: 6.93, 96: 6.87, 128: 7.01, 256: 7.34, 1280: 7.81 };
    let selRank = 96;

    // 16 representative eigen-channel buckets across the 1,280 dimensions
    const buckets = [
      { k: "1..16", sig: 92, nois: 4 },
      { k: "17..32", sig: 78, nois: 6 },
      { k: "33..48", sig: 64, nois: 9 },
      { k: "49..64", sig: 50, nois: 12 },
      { k: "65..80", sig: 38, nois: 16 },
      { k: "81..96", sig: 26, nois: 21 }, // Cutoff r=96: Signal > Noise!
      { k: "97..128", sig: 15, nois: 28 }, // Noise > Signal starts here!
      { k: "129..256", sig: 9, nois: 36 },
      { k: "257..512", sig: 5, nois: 44 },
      { k: "513..1280", sig: 2, nois: 52 },
    ];
    const bucketMaxRank = [16, 32, 48, 64, 80, 96, 128, 256, 512, 1280];

    function draw() {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Left Panel: Clean Signal Power (Green) vs. Noise Power (Red) per Channel Group
      ctx.fillStyle = "#f9fbfa";
      ctx.strokeStyle = "#d5e0da";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(14, 14, 545, H - 28, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#222";
      ctx.font = "600 13px 'Source Sans 3', sans-serif";
      ctx.fillText(
        "A. Clean Speech Power (Green) vs. Noise Power (Red) Across 1,280 Channels",
        28,
        36
      );

      const baseY = 195;
      const x0 = 42;
      const stepX = 50;

      buckets.forEach((b, i) => {
        const bx = x0 + i * stepX;
        const kept = bucketMaxRank[i] <= selRank;
        const alpha = kept ? 1.0 : 0.22;

        // Clean Speech bar (Green)
        ctx.fillStyle = `rgba(46, 153, 106, ${alpha})`;
        const hSig = b.sig * 1.35;
        ctx.fillRect(bx, baseY - hSig, 16, hSig);

        // Noise Power bar (Red)
        ctx.fillStyle = `rgba(217, 58, 75, ${alpha})`;
        const hNois = b.nois * 1.35;
        ctx.fillRect(bx + 17, baseY - hNois, 16, hNois);

        ctx.save();
        ctx.translate(bx + 16, baseY + 14);
        ctx.rotate(Math.PI / 5);
        ctx.fillStyle = kept ? "#222" : "#999";
        ctx.font = "10.5px 'JetBrains Mono', monospace";
        ctx.fillText(b.k, 0, 0);
        ctx.restore();
      });

      // Vertical SNR = 1.0 cutoff line between 81..96 and 97..128
      const cutX = x0 + 6 * stepX - 6;
      ctx.strokeStyle = "#118659";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(cutX, 46);
      ctx.lineTo(cutX, baseY + 5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#118659";
      ctx.font = "600 11px 'Source Sans 3', sans-serif";
      ctx.fillText("← High-SNR Speech (Green > Red) | Noisy Tail (Red > Green) →", cutX - 165, 56);

      // Right Panel: Resulting Noisy ASR Word Error Rate (WER %)
      ctx.fillStyle = "#f9fbfa";
      ctx.strokeStyle = "#d5e0da";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(575, 14, W - 589, H - 28, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#222";
      ctx.font = "600 13px 'Source Sans 3', sans-serif";
      ctx.fillText("B. Locked-Test Noisy Word Error Rate (WER %)", 590, 36);

      const curWER = wers[selRank] || 6.87;
      const compareBars = [
        { name: "Unedited Baseline (32.4B)", val: 8.09, col: "#888888" },
        { name: "Standard Ridge (Keep All 1,280)", val: 7.81, col: "#e67e22" },
        { name: `Selected Cutoff (Keep Top r=${selRank})`, val: curWER, col: selRank === 96 ? "#118659" : "#1f77b4" },
      ];

      compareBars.forEach((cb, idx) => {
        const y = 70 + idx * 54;
        ctx.fillStyle = "#333";
        ctx.font = "600 12px 'Source Sans 3', sans-serif";
        ctx.fillText(cb.name, 592, y);

        const w = ((cb.val - 6.0) / 2.5) * 260;
        ctx.fillStyle = cb.col;
        ctx.fillRect(592, y + 8, w, 20);

        ctx.fillStyle = "#111";
        ctx.font = "700 12px 'JetBrains Mono', monospace";
        ctx.fillText(`${cb.val.toFixed(2)}% WER`, 598 + w, y + 23);
      });
    }

    slider.addEventListener("input", () => {
      const idx = parseInt(slider.value, 10);
      selRank = ranks[idx] || 96;
      label.textContent =
        selRank === 1280
          ? "r = 1280 (All Channels — Standard Ridge, Includes Noisy Tail!)"
          : selRank === 96
          ? "r = 96 (Exact SNR = 1.0 Cutoff — Optimal 6.87% WER!)"
          : `r = ${selRank} Channels Kept`;
      draw();
    });

    draw();
  }

  // =========================================================================
  // 4. Animated Loss Landscape: 25-Epoch SGD/AdamW vs. 1-Pass OFP (Figure 4)
  // =========================================================================
  function initOFPvsSGDWidget() {
    const canvas = document.getElementById("fig4-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const slider = document.getElementById("fig4-epoch-slider");
    const epLabel = document.getElementById("fig4-epoch-val");
    const playBtn = document.getElementById("fig4-play-btn");

    let epoch = 25;
    let animId = null;

    // Precompute 25-epoch SGD/AdamW path toward training shortcut (0.72, 0.64)
    const sgdPath = [[0.0, 0.0]];
    let wt = 0.0;
    let wn = 0.0;
    for (let ep = 1; ep <= 25; ep++) {
      const dt = wt - 0.72;
      const dn = wn - 0.64;
      const gt = 2.4 * (0.85 * dt + 0.52 * dn) * 0.85 + 0.6 * (-0.52 * dt + 0.85 * dn) * -0.52;
      const gn = 2.4 * (0.85 * dt + 0.52 * dn) * 0.52 + 0.6 * (-0.52 * dt + 0.85 * dn) * 0.85;
      const osc = (ep % 2 === 0 ? 1 : -1) * 0.035 * Math.exp(-ep * 0.08);
      wt = wt - 0.11 * gt + osc * 0.4;
      wn = wn - 0.11 * gn - osc;
      sgdPath.push([wt, wn]);
    }

    function draw() {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Left Panel: 2D Weight Space (w_task, w_codec)
      ctx.fillStyle = "#f9fbfa";
      ctx.strokeStyle = "#d5e0da";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(14, 14, 455, H - 28, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#222";
      ctx.font = "600 13px 'Source Sans 3', sans-serif";
      ctx.fillText("A. Weight-Space Trajectory: 25-Epoch Backprop vs. 1-Pass OFP", 28, 36);

      const ox = 82;
      const oy = 198;
      const sx = 285;
      const sy = 165;

      // Unseen Test Loss Contours centered at (1.0, 0.0)
      [0.22, 0.45, 0.72].forEach((r) => {
        ctx.strokeStyle = "rgba(31, 119, 180, 0.28)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(ox + 1.0 * sx, oy, r * sx * 0.65, r * sy * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Tilted Training Loss Contours centered at Shortcut Minimum (0.72, 0.64)
      [0.2, 0.42].forEach((r) => {
        ctx.strokeStyle = "rgba(230, 126, 34, 0.45)";
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(ox + 0.72 * sx, oy - 0.64 * sy, r * sx * 0.7, r * sy * 0.35, -0.52, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Axes
      ctx.strokeStyle = "#bbb";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(42, oy);
      ctx.lineTo(445, oy);
      ctx.moveTo(ox, 48);
      ctx.lineTo(ox, 232);
      ctx.stroke();

      // Green LCMV Nuisance-Zero Constraint Line (c_codec^T w = 0 => w_codec = 0)
      ctx.strokeStyle = "#118659";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(435, oy);
      ctx.stroke();
      ctx.fillStyle = "#118659";
      ctx.font = "600 11.5px 'JetBrains Mono', monospace";
      ctx.fillText("Hard Constraint Line: c_codec^T w = 0 (w_codec = 0)", ox + 12, oy + 18);

      ctx.fillStyle = "#555";
      ctx.font = "11.5px 'Source Sans 3', sans-serif";
      ctx.fillText("True Task Weight w_task →", 285, 248);
      ctx.save();
      ctx.translate(32, 190);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("Codec Shortcut Weight w_codec →", 0, 0);
      ctx.restore();

      // Draw SGD/AdamW trajectory up to `epoch`
      ctx.strokeStyle = "#d93a4b";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let i = 0; i <= epoch; i++) {
        const [px, py] = sgdPath[i];
        const cx = ox + px * sx;
        const cy = oy - py * sy;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();

      for (let i = 0; i <= epoch; i += 3) {
        const [px, py] = sgdPath[i];
        ctx.fillStyle = "#d93a4b";
        ctx.beginPath();
        ctx.arc(ox + px * sx, oy - py * sy, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shortcut minimum X marker at (0.72, 0.64)
      const scX = ox + 0.72 * sx;
      const scY = oy - 0.64 * sy;
      ctx.fillStyle = "#d93a4b";
      ctx.font = "700 11.5px 'Source Sans 3', sans-serif";
      ctx.fillText("Training Shortcut Min (Unseen EER = 6.95%)", scX - 95, scY - 12);

      // 1-Pass OFP Jump Arrow along w_codec = 0 to (1.0, 0.0)
      const optX = ox + 1.0 * sx;
      const optY = oy;
      ctx.fillStyle = "#118659";
      ctx.beginPath();
      ctx.arc(optX, optY, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "700 11.5px 'Source Sans 3', sans-serif";
      ctx.fillText("★ 1-Pass OFP Optimum (0.19s, EER = 4.12%)", optX - 135, optY - 12);

      // Right Panel: Explicitly Labeled Benchmark Bar Chart (Y-axis: Unseen EER %, X-axis: Method & H100 Time)
      ctx.fillStyle = "#f9fbfa";
      ctx.strokeStyle = "#d5e0da";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(485, 14, W - 499, H - 28, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#222";
      ctx.font = "600 13px 'Source Sans 3', sans-serif";
      ctx.fillText("B. Unseen 4-Dataset Equal Error Rate (%, Lower is Better)", 500, 36);

      const bars = [
        { name: "SGD (1 Epoch, BCE Loss)", eer: 8.42, time: "0.48s", col: "#d93a4b" },
        { name: "AdamW (5 Epochs, BCE Loss)", eer: 7.31, time: "2.45s", col: "#d93a4b" },
        { name: "AdamW (25 Epochs, BCE Loss)", eer: 7.08, time: "12.10s", col: "#d93a4b" },
        { name: "AdamW (25 Epochs, Focal Loss)", eer: 6.95, time: "12.40s", col: "#e67e22" },
        { name: "1-Pass Standard Ridge (No Nulling)", eer: 5.62, time: "0.14s", col: "#1f77b4" },
        { name: "1-Pass OFP (Ours, Boundary + Nulling)", eer: 4.12, time: "0.19s", col: "#118659" },
      ];

      bars.forEach((b, i) => {
        const y = 56 + i * 33;
        ctx.fillStyle = "#333";
        ctx.font = "11.5px 'Source Sans 3', sans-serif";
        ctx.fillText(b.name, 500, y + 13);

        const barX = 702;
        const w = (b.eer / 9.5) * 165;
        ctx.fillStyle = b.col;
        ctx.fillRect(barX, y + 1, w, 17);

        ctx.fillStyle = "#111";
        ctx.font = "600 11px 'JetBrains Mono', monospace";
        ctx.fillText(`${b.eer.toFixed(2)}% (${b.time})`, barX + w + 5, y + 14);
      });

      ctx.fillStyle = "#555";
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.fillText("X-Axis: Equal Error Rate (%) on Unseen Generators (1x H100 GPU)", 500, 264);
    }

    slider.addEventListener("input", () => {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
        playBtn.textContent = "Animate 25 Epochs vs. 1-Pass Jump";
      }
      epoch = parseInt(slider.value, 10);
      epLabel.textContent = `Epoch ${epoch} / 25`;
      draw();
    });

    playBtn.addEventListener("click", () => {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
        playBtn.textContent = "Animate 25 Epochs vs. 1-Pass Jump";
        return;
      }
      let frame = 0;
      playBtn.textContent = "Pause Animation";
      function tick() {
        frame++;
        if (frame % 6 === 0) {
          epoch = (epoch + 1) % 26;
          slider.value = String(epoch);
          epLabel.textContent = `Epoch ${epoch} / 25`;
          draw();
        }
        animId = requestAnimationFrame(tick);
      }
      animId = requestAnimationFrame(tick);
    });

    draw();
  }

  // =========================================================================
  // 5. Interactive Velocity-Preserving Compression Widget (Figure 5)
  // =========================================================================
  function initVelocitySVDWidget() {
    const canvas = document.getElementById("fig5-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const slider = document.getElementById("fig5-vel-slider");
    const label = document.getElementById("fig5-vel-val");

    let alpha = 1.0; // 0.0 = Standard SVD/ASVD (blurs spikes), 1.0 = Velocity-Preserving OT-SVD

    function draw() {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = "#f9fbfa";
      ctx.strokeStyle = "#d5e0da";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(14, 14, W - 28, H - 28, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#222";
      ctx.font = "600 13px 'Source Sans 3', sans-serif";
      ctx.fillText(
        "Frame-to-Frame Transition Speed |Y_t - Y_{t-1}| Across Consonant Bursts (/p/, /t/, /k/) at 2.23×–3.66× Compression",
        28,
        38
      );

      const x0 = 56;
      const y0 = 198;
      const plotW = W - 96;
      const plotH = 135;

      ctx.strokeStyle = "#ccc";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + plotW, y0);
      ctx.moveTo(x0, 52);
      ctx.lineTo(x0, y0);
      ctx.stroke();

      const N = 120;
      const teachPts = [];
      const compPts = [];
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        const base = 0.08 + 0.03 * Math.sin(2 * Math.PI * 2 * t);
        const b1 = 0.78 * Math.exp(-0.5 * Math.pow((t - 0.22) / 0.022, 2));
        const b2 = 0.88 * Math.exp(-0.5 * Math.pow((t - 0.52) / 0.020, 2));
        const b3 = 0.82 * Math.exp(-0.5 * Math.pow((t - 0.80) / 0.022, 2));
        const vTeach = base + b1 + b2 + b3;
        const vASVD = base + 0.56 * (b1 + b2 + b3); // 44% peak loss in standard SVD
        const vCur = (1 - alpha) * vASVD + alpha * vTeach;
        teachPts.push([x0 + t * plotW, y0 - vTeach * plotH]);
        compPts.push([x0 + t * plotW, y0 - vCur * plotH]);
      }

      // Shaded lost transition energy when alpha < 1
      ctx.fillStyle = "rgba(217, 58, 75, 0.16)";
      ctx.beginPath();
      teachPts.forEach(([px, py], i) => {
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      for (let i = compPts.length - 1; i >= 0; i--) {
        ctx.lineTo(compPts[i][0], compPts[i][1]);
      }
      ctx.closePath();
      ctx.fill();

      // Teacher curve (black dashed)
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      teachPts.forEach(([px, py], i) => {
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Compressed curve
      ctx.strokeStyle = alpha > 0.5 ? "#118659" : "#d93a4b";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      compPts.forEach(([px, py], i) => {
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      const keptPct = (58.0 + 41.1 * alpha).toFixed(1);
      const werVal = (6.45 - 1.41 * alpha).toFixed(2);
      ctx.fillStyle = alpha > 0.5 ? "#118659" : "#d93a4b";
      ctx.font = "700 12.5px 'JetBrains Mono', monospace";
      ctx.fillText(
        `Consonant Speed Peak Retained: ${keptPct}%  |  Compressed Wav2Vec2 ASR WER: ${werVal}% (Full 315M Teacher = 5.16%)`,
        x0 + 12,
        224
      );
    }

    slider.addEventListener("input", () => {
      alpha = parseFloat(slider.value);
      label.textContent =
        alpha === 0
          ? "0% Velocity Weight (Standard SVD / ASVD — Loses 42% of Consonant Speed!)"
          : alpha === 1
          ? "100% Velocity-Preserving SVD (Cov(Z) + 2·Cov(ΔZ) — Retains 99.1% of Consonant Speed!)"
          : `${Math.round(alpha * 100)}% Velocity Weight`;
      draw();
    });

    draw();
  }

  window.addEventListener("DOMContentLoaded", () => {
    initNuisanceWidget();
    initOrthogonalSurgeryWidget();
    initGEVDSNRWidget();
    initOFPvsSGDWidget();
    initVelocitySVDWidget();
  });
})();
