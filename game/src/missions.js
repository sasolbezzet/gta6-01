// Crime Narrative and Mission Progression System for Vice City Shadows
// Manages story arcs, checkpoints, reward payouts, and persistent save/load states.

export class MissionManager {
  constructor(soundFx, policeSystem) {
    this.soundFx = soundFx;
    this.policeSystem = policeSystem;

    this.missions = [
      {
        id: 1,
        title: 'The Heist Getaway',
        objective: 'Steal the red Cheetah GT and escape the police to reach the Docks',
        reward: 5000,
        waypoint: { x: 120, z: -140 },
        isCompleted: false,
      },
      {
        id: 2,
        title: 'Ocean Drive Ambush',
        objective: 'Intercept the rival syndicate courier on Ocean Drive and recover the contraband',
        reward: 8500,
        waypoint: { x: -80, z: 90 },
        isCompleted: false,
      },
      {
        id: 3,
        title: 'VIP Extraction',
        objective: 'Escort syndicate boss Elena Vargas through police roadblocks to Marina Tower',
        reward: 15000,
        waypoint: { x: -140, z: -120 },
        isCompleted: false,
      },
      {
        id: 4,
        title: 'Dynasty Bank Convoy',
        objective: 'Infiltrate the bank convoy, survive 5-star police pursuit, and deliver loot',
        reward: 50000,
        waypoint: { x: 140, z: 120 },
        isCompleted: false,
      },
    ];

    this.currentMissionIndex = 0;
    this.currentMission = this.missions[0];
    this.isMissionActive = true;
    this.bannerTimeout = null;

    this.loadState();
  }

  update(dt, player, vehicleManager) {
    if (!this.currentMission || !this.isMissionActive) return;

    const wp = this.currentMission.waypoint;
    if (!wp) return;

    // Check if player reached mission objective
    const dist = Math.hypot(player.position.x - wp.x, player.position.z - wp.z);
    if (dist < 14) {
      if (this.currentMission.id === 1 && !player.isDriving) {
        // Need to be driving to complete getaway
        return;
      }
      this.completeCurrentMission(player);
    }
  }

  completeCurrentMission(player) {
    if (!this.currentMission) return;
    this.currentMission.isCompleted = true;
    player.cash += this.currentMission.reward;
    this.soundFx.playMissionSuccess();

    this.showCompletionBanner(`MISSION PASSED! +$${this.currentMission.reward.toLocaleString()}`);

    // Advance to next mission
    this.currentMissionIndex++;
    if (this.currentMissionIndex < this.missions.length) {
      this.currentMission = this.missions[this.currentMissionIndex];
      // Automatically reduce wanted level on successful delivery
      this.policeSystem.setWantedLevel(0);
    } else {
      this.currentMission = {
        id: 99,
        title: 'Kingpin of Vice Coast',
        objective: 'All story missions complete! Freely explore the open world and rule the streets.',
        waypoint: null,
      };
    }

    this.saveState(player);
  }

  showCompletionBanner(text) {
    let banner = document.getElementById('mission-passed-popup');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'mission-passed-popup';
      banner.style.cssText = `
        position: absolute;
        top: 35%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, rgba(240, 147, 43, 0.95), rgba(235, 77, 75, 0.95));
        padding: 20px 60px;
        color: #ffffff;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 28px;
        font-weight: 900;
        letter-spacing: 3px;
        text-shadow: 2px 2px 8px rgba(0,0,0,0.8);
        border: 3px solid #f9ca24;
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.8);
        z-index: 1000;
        pointer-events: none;
        animation: popupPulse 0.4s ease-out;
      `;
      document.body.appendChild(banner);
    }
    banner.textContent = text;
    banner.style.display = 'block';

    clearTimeout(this.bannerTimeout);
    this.bannerTimeout = setTimeout(() => {
      banner.style.display = 'none';
    }, 4500);
  }

  saveState(player) {
    try {
      const state = {
        missionIdx: this.currentMissionIndex,
        cash: player.cash,
        health: player.health,
        armor: player.armor,
      };
      localStorage.setItem('vice_city_shadows_save', JSON.stringify(state));
    } catch (e) {
      // Local storage fallback
    }
  }

  loadState() {
    try {
      const saved = localStorage.getItem('vice_city_shadows_save');
      if (saved) {
        const data = JSON.parse(saved);
        if (Number.isInteger(data.missionIdx) && data.missionIdx < this.missions.length) {
          this.currentMissionIndex = data.missionIdx;
          this.currentMission = this.missions[this.currentMissionIndex];
        }
      }
    } catch (e) {
      // Fallback
    }
  }
}
