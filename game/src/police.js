// 5-Star Police Escalation and Tactical Pursuit AI for Vice City Shadows
// Manages wanted stars, crime detection, cruiser dispatch, sirens, roadblocks, and chase tactics.
import * as THREE from 'three';

export class PoliceSystem {
  constructor(scene, world, vehicleManager, soundFx) {
    this.scene = scene;
    this.world = world;
    this.vehicleManager = vehicleManager;
    this.soundFx = soundFx;

    this.wantedLevel = 0; // 0 to 5 stars
    this.wantedTimer = 0;
    this.escapeTimer = 0;
    this.policeVehicles = [];
    this.maxPolicePerStar = [0, 1, 2, 4, 6, 8];
  }

  reportCrime(crimeType) {
    let starIncrease = 1;
    if (crimeType === 'hit_pedestrian') starIncrease = 1;
    if (crimeType === 'gunfire') starIncrease = 1;
    if (crimeType === 'destroy_car') starIncrease = 2;
    if (crimeType === 'attack_police') starIncrease = 2;
    if (crimeType === 'heist') starIncrease = 4;

    this.wantedLevel = Math.min(5, Math.max(1, this.wantedLevel + starIncrease));
    this.escapeTimer = 0;
    this.soundFx.setSiren(true);
  }

  setWantedLevel(stars) {
    this.wantedLevel = Math.min(5, Math.max(0, stars));
    this.escapeTimer = 0;
    this.soundFx.setSiren(this.wantedLevel > 0);
  }

  update(dt, playerPos, playerVehicle) {
    if (this.wantedLevel === 0) {
      // Clear out police
      this.soundFx.setSiren(false);
      this.despawnExcessPolice(0);
      return;
    }

    const maxCars = this.maxPolicePerStar[this.wantedLevel];
    if (this.policeVehicles.length < maxCars) {
      this.spawnPoliceCruiser(playerPos);
    }

    let policeNearby = false;

    // Update each police cruiser pursuit AI
    this.policeVehicles.forEach((pv) => {
      if (pv.isDestroyed) return;

      const dx = playerPos.x - pv.mesh.position.x;
      const dz = playerPos.z - pv.mesh.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 70) {
        policeNearby = true;
      }

      // Turn towards player
      const targetAngle = Math.atan2(dx, dz);
      let diff = targetAngle - pv.mesh.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      pv.mesh.rotation.y += Math.max(-2.5 * dt, Math.min(2.5 * dt, diff * 3.5 * dt));

      // Pursuit speed scales with wanted level
      const targetSpeed = 24 + this.wantedLevel * 3.5;
      pv.speed = Math.min(targetSpeed, pv.speed + pv.accel * dt);

      // Move forward
      const forwardVec = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), pv.mesh.rotation.y);
      const nextX = pv.mesh.position.x + forwardVec.x * pv.speed * dt;
      const nextZ = pv.mesh.position.z + forwardVec.z * pv.speed * dt;

      if (!this.world.checkCollision(nextX, nextZ, pv.width / 2)) {
        pv.mesh.position.x = nextX;
        pv.mesh.position.z = nextZ;
      } else {
        pv.speed = -pv.speed * 0.4;
      }

      // Ramming / PIT maneuver against player car
      if (playerVehicle && dist < 4.0) {
        this.soundFx.playCrash();
        playerVehicle.speed *= 0.8;
        playerVehicle.health -= 5 * dt;
      }
    });

    // Escape cooldown logic
    if (!policeNearby) {
      this.escapeTimer += dt;
      if (this.escapeTimer > 12.0) {
        // Evaded the police!
        this.wantedLevel = 0;
        this.escapeTimer = 0;
        this.soundFx.setSiren(false);
      }
    } else {
      this.escapeTimer = 0;
    }
  }

  spawnPoliceCruiser(playerPos) {
    // Spawn at intersection behind or ahead of player outside screen view
    const spawnDist = 70 + Math.random() * 30;
    const angle = Math.random() * Math.PI * 2;
    const sx = playerPos.x + Math.cos(angle) * spawnDist;
    const sz = playerPos.z + Math.sin(angle) * spawnDist;

    // Check bounds
    const half = this.world.citySize / 2 - 20;
    const cx = Math.max(-half, Math.min(half, sx));
    const cz = Math.max(-half, Math.min(half, sz));

    const cruiser = this.vehicleManager.createVehicle('police', cx, cz, angle + Math.PI);
    this.policeVehicles.push(cruiser);
  }

  despawnExcessPolice(allowedCount) {
    while (this.policeVehicles.length > allowedCount) {
      const pv = this.policeVehicles.pop();
      if (pv && pv.mesh) {
        this.scene.remove(pv.mesh);
      }
    }
  }
}
