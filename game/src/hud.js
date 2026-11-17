// GTA-Style Heads-Up Display (HUD) & Real-Time Minimap Radar for Vice City Shadows
// Renders circular radar, health/armor gauges, wanted stars, speedometer, weapons, and mission objectives.

export class HUD {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'game-hud';
    this.container.innerHTML = `
      <style>
        #game-hud {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          user-select: none;
        }

        /* Top Right: Cash, Weapon, Wanted Stars */
        .top-right {
          position: absolute;
          top: 24px;
          right: 32px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }

        .cash-display {
          font-size: 32px;
          font-weight: 900;
          color: #4cd137;
          text-shadow: 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 2px 8px rgba(0,0,0,0.8);
          letter-spacing: 1px;
        }

        .wanted-stars {
          display: flex;
          gap: 6px;
        }

        .star {
          font-size: 26px;
          color: #444;
          text-shadow: 1px 1px 2px #000;
          transition: all 0.2s ease;
        }

        .star.active {
          color: #fbc531;
          text-shadow: 0 0 10px #fbc531, 2px 2px 0 #000;
          animation: starPulse 0.8s infinite alternate;
        }

        @keyframes starPulse {
          from { transform: scale(1); }
          to { transform: scale(1.18); }
        }

        .weapon-card {
          background: rgba(15, 15, 20, 0.75);
          border-left: 4px solid #00d2d3;
          padding: 8px 16px;
          border-radius: 4px;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }

        .weapon-name {
          font-size: 16px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .weapon-ammo {
          font-size: 18px;
          font-weight: 800;
          color: #f5f6fa;
        }

        /* Top Center: Mission Banner */
        .mission-banner {
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(90deg, transparent, rgba(20, 20, 28, 0.85) 20%, rgba(20, 20, 28, 0.85) 80%, transparent);
          padding: 10px 48px;
          text-align: center;
          color: #fff;
          border-bottom: 2px solid #fbc531;
        }

        .mission-title {
          font-size: 12px;
          font-weight: 800;
          color: #fbc531;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .mission-desc {
          font-size: 16px;
          font-weight: 600;
          color: #f5f6fa;
          margin-top: 2px;
          text-shadow: 1px 1px 4px rgba(0,0,0,0.8);
        }

        /* Bottom Left: Minimap & Status Bars */
        .bottom-left {
          position: absolute;
          bottom: 28px;
          left: 28px;
          display: flex;
          align-items: flex-end;
          gap: 16px;
        }

        .minimap-wrapper {
          width: 170px;
          height: 170px;
          border-radius: 50%;
          border: 4px solid rgba(255, 255, 255, 0.25);
          background: #11141a;
          box-shadow: 0 8px 24px rgba(0,0,0,0.8), inset 0 0 16px rgba(0,0,0,0.6);
          overflow: hidden;
          position: relative;
        }

        #minimap-canvas {
          width: 100%;
          height: 100%;
        }

        .status-bars {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 140px;
          margin-bottom: 8px;
        }

        .bar-container {
          height: 10px;
          background: rgba(0, 0, 0, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 3px;
          overflow: hidden;
          position: relative;
        }

        .health-bar {
          height: 100%;
          width: 100%;
          background: #2ed573;
          transition: width 0.15s ease;
        }

        .armor-bar {
          height: 100%;
          width: 100%;
          background: #1e90ff;
          transition: width 0.15s ease;
        }

        /* Speedometer (visible when driving) */
        .speedometer {
          position: absolute;
          bottom: 28px;
          right: 32px;
          background: rgba(15, 15, 20, 0.75);
          padding: 8px 20px;
          border-radius: 6px;
          border-right: 4px solid #ff4757;
          display: none;
          align-items: baseline;
          gap: 6px;
          color: #fff;
        }

        .speed-value {
          font-size: 32px;
          font-weight: 900;
          font-family: monospace;
          color: #f1f2f6;
        }

        .speed-unit {
          font-size: 14px;
          font-weight: 700;
          color: #a4b0be;
        }

        /* Hint Notification */
        .action-hint {
          position: absolute;
          bottom: 120px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.7);
          color: #ffffff;
          padding: 6px 18px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          display: none;
        }
      </style>

      <div class="top-right">
        <div class="cash-display" id="hud-cash">$2,500</div>
        <div class="wanted-stars" id="hud-stars">
          <span class="star">★</span>
          <span class="star">★</span>
          <span class="star">★</span>
          <span class="star">★</span>
          <span class="star">★</span>
        </div>
        <div class="weapon-card">
          <div class="weapon-name" id="hud-weapon">PISTOL</div>
          <div class="weapon-ammo" id="hud-ammo">12 / 60</div>
        </div>
      </div>

      <div class="mission-banner" id="hud-mission-banner">
        <div class="mission-title" id="hud-mission-title">MISSION: SHADOW RUN</div>
        <div class="mission-desc" id="hud-mission-desc">Steal the Cheetah GT and deliver it to the Docks</div>
      </div>

      <div class="bottom-left">
        <div class="minimap-wrapper">
          <canvas id="minimap-canvas" width="170" height="170"></canvas>
        </div>
        <div class="status-bars">
          <div class="bar-container">
            <div class="armor-bar" id="hud-armor" style="width: 100%;"></div>
          </div>
          <div class="bar-container">
            <div class="health-bar" id="hud-health" style="width: 100%;"></div>
          </div>
        </div>
      </div>

      <div class="speedometer" id="hud-speedometer">
        <div class="speed-value" id="hud-speed-val">0</div>
        <div class="speed-unit">KM/H</div>
      </div>

      <div class="action-hint" id="hud-action-hint">Press [F] to Drive Cheetah GT</div>
    `;

    document.body.appendChild(this.container);

    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.mmCtx = this.minimapCanvas.getContext('2d');
    this.cashEl = document.getElementById('hud-cash');
    this.starsEl = document.getElementById('hud-stars');
    this.weaponEl = document.getElementById('hud-weapon');
    this.ammoEl = document.getElementById('hud-ammo');
    this.healthEl = document.getElementById('hud-health');
    this.armorEl = document.getElementById('hud-armor');
    this.speedoEl = document.getElementById('hud-speedometer');
    this.speedValEl = document.getElementById('hud-speed-val');
    this.missionTitleEl = document.getElementById('hud-mission-title');
    this.missionDescEl = document.getElementById('hud-mission-desc');
    this.hintEl = document.getElementById('hud-action-hint');
  }

  update(player, weaponSystem, policeSystem, missionManager, world, vehicleManager) {
    // Health & Armor bars
    this.healthEl.style.width = `${Math.max(0, player.health)}%`;
    this.armorEl.style.width = `${Math.max(0, player.armor)}%`;

    // Cash Display
    this.cashEl.textContent = `$${player.cash.toLocaleString()}`;

    // Weapon Info
    const w = weaponSystem.currentWeapon.toUpperCase();
    this.weaponEl.textContent = w;
    if (weaponSystem.currentWeapon === 'fist') {
      this.ammoEl.textContent = '∞';
    } else {
      const mag = weaponSystem.magazines[weaponSystem.currentWeapon] || 0;
      const reserve = weaponSystem.ammo[weaponSystem.currentWeapon] || 0;
      this.ammoEl.textContent = `${Math.min(mag, reserve)} / ${Math.max(0, reserve - mag)}`;
    }

    // Wanted Stars
    const stars = this.starsEl.children;
    for (let i = 0; i < 5; i++) {
      if (i < policeSystem.wantedLevel) {
        stars[i].classList.add('active');
      } else {
        stars[i].classList.remove('active');
      }
    }

    // Speedometer
    if (player.isDriving && player.currentVehicle) {
      this.speedoEl.style.display = 'flex';
      const kmh = Math.round(Math.abs(player.currentVehicle.speed) * 3.6);
      this.speedValEl.textContent = kmh;
    } else {
      this.speedoEl.style.display = 'none';
    }

    // Mission text
    if (missionManager && missionManager.currentMission) {
      this.missionTitleEl.textContent = `MISSION: ${missionManager.currentMission.title.toUpperCase()}`;
      this.missionDescEl.textContent = missionManager.currentMission.objective;
    }

    // Vehicle interaction hint
    if (!player.isDriving) {
      const nearCar = vehicleManager.findNearbyVehicle(player.position.x, player.position.z, 4.5);
      if (nearCar) {
        this.hintEl.style.display = 'block';
        this.hintEl.textContent = `Press [F] to Drive ${nearCar.type.toUpperCase()}`;
      } else {
        this.hintEl.style.display = 'none';
      }
    } else {
      this.hintEl.style.display = 'block';
      this.hintEl.textContent = 'Press [F] to Exit Vehicle';
    }

    // Render Minimap Radar
    this.renderMinimap(player, world, vehicleManager, policeSystem, missionManager);
  }

  renderMinimap(player, world, vehicleManager, policeSystem, missionManager) {
    const ctx = this.mmCtx;
    const w = 170;
    const h = 170;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 0.85; // radar zoom scale

    ctx.clearRect(0, 0, w, h);

    // Save and rotate radar relative to player orientation
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(player.yaw);

    // Draw City Roads
    ctx.strokeStyle = '#3a404d';
    ctx.lineWidth = 10;
    const half = world.citySize / 2;
    const step = world.blockSize;

    // Road Grid
    for (let x = -half + step / 2; x <= half - step / 2; x += step) {
      const rx = (x - player.position.x) * scale;
      ctx.beginPath();
      ctx.moveTo(rx, -half * scale);
      ctx.lineTo(rx, half * scale);
      ctx.stroke();
    }
    for (let z = -half + step / 2; z <= half - step / 2; z += step) {
      const rz = (z - player.position.z) * scale;
      ctx.beginPath();
      ctx.moveTo(-half * scale, rz);
      ctx.lineTo(half * scale, rz);
      ctx.stroke();
    }

    // Draw Mission Objective Blip (Yellow Beacon)
    if (missionManager && missionManager.currentMission && missionManager.currentMission.waypoint) {
      const wp = missionManager.currentMission.waypoint;
      const wx = (wp.x - player.position.x) * scale;
      const wz = (wp.z - player.position.z) * scale;

      ctx.fillStyle = '#fbc531';
      ctx.beginPath();
      ctx.arc(wx, wz, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw Civilian & Police Vehicles
    vehicleManager.vehicles.forEach((v) => {
      if (v === player.currentVehicle || v.isDestroyed) return;
      const vx = (v.mesh.position.x - player.position.x) * scale;
      const vz = (v.mesh.position.z - player.position.z) * scale;

      if (v.type === 'police') {
        // Red and Blue flashing police blip
        const isRed = Math.floor(performance.now() / 250) % 2 === 0;
        ctx.fillStyle = isRed ? '#ff4757' : '#2ed573';
      } else {
        ctx.fillStyle = '#ced6e0';
      }

      ctx.beginPath();
      ctx.arc(vx, vz, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();

    // Draw Player Indicator at Center (Arrow pointing forward)
    ctx.fillStyle = '#2ed573';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx - 6, cy + 6);
    ctx.lineTo(cx, cy + 3);
    ctx.lineTo(cx + 6, cy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}
