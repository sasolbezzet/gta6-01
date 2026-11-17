// Living City Simulation: Autonomous Civilian Traffic and Pedestrian AI
// Spawns and manages autonomous cars, walking pedestrians, panic reactions, and collisions.
import * as THREE from 'three';

export class TrafficManager {
  constructor(scene, world, vehicleManager, soundFx) {
    this.scene = scene;
    this.world = world;
    this.vehicleManager = vehicleManager;
    this.soundFx = soundFx;

    this.civilianCars = [];
    this.pedestrians = [];
    this.cashPickups = [];

    this.spawnCivilianCars(16);
    this.spawnPedestrians(36);
  }

  spawnCivilianCars(count = 14) {
    const types = ['cheetah', 'dominator', 'suv'];
    const waypoints = this.world.trafficWaypoints;
    if (waypoints.length === 0) return;

    for (let i = 0; i < count; i++) {
      const wp = waypoints[i % waypoints.length];
      const type = types[Math.floor(Math.random() * types.length)];
      const progress = Math.random();
      const spawnX = wp.start.x + (wp.end.x - wp.start.x) * progress;
      const spawnZ = wp.start.z + (wp.end.z - wp.start.z) * progress;
      const angle = Math.atan2(wp.dir.x, wp.dir.z);

      const v = this.vehicleManager.createVehicle(type, spawnX, spawnZ, angle);
      v.targetWaypoint = wp;
      v.targetSpeed = 12 + Math.random() * 8; // Civilian cruising speed
      this.civilianCars.push(v);
    }
  }

  spawnPedestrians(count = 30) {
    const colors = [0xff5722, 0x00bcd4, 0x9c27b0, 0x4caf50, 0xffeb3b, 0xe91e63, 0xffffff];
    const half = this.world.citySize / 2 - 20;

    for (let i = 0; i < count; i++) {
      const group = new THREE.Group();

      // Humanoid Mesh (Low-poly stylized 3D character)
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xd7a17c, roughness: 0.8 });
      const shirtMat = new THREE.MeshStandardMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        roughness: 0.7,
      });
      const pantsMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.8 });

      // Torso
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.3), shirtMat);
      torso.position.y = 1.15;
      torso.castShadow = true;
      group.add(torso);

      // Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.35, 0.32), skinMat);
      head.position.y = 1.7;
      head.castShadow = true;
      group.add(head);

      // Left Leg & Right Leg
      const legGeo = new THREE.BoxGeometry(0.22, 0.8, 0.22);
      const legL = new THREE.Mesh(legGeo, pantsMat);
      legL.position.set(-0.16, 0.4, 0);
      legL.castShadow = true;
      group.add(legL);

      const legR = new THREE.Mesh(legGeo, pantsMat);
      legR.position.set(0.16, 0.4, 0);
      legR.castShadow = true;
      group.add(legR);

      // Random position on sidewalk
      const step = this.world.blockSize;
      const bx = -half + Math.floor(Math.random() * 5) * step + step / 2;
      const bz = -half + Math.floor(Math.random() * 5) * step + step / 2;
      const sideOffset = (Math.random() > 0.5 ? 1 : -1) * (this.world.roadWidth / 2 + 2.5);

      group.position.set(bx + sideOffset, 0, bz + (Math.random() - 0.5) * 40);
      this.scene.add(group);

      this.pedestrians.push({
        mesh: group,
        legL,
        legR,
        isPanicking: false,
        isDead: false,
        speed: 1.8 + Math.random() * 0.8,
        direction: new THREE.Vector3(0, 0, Math.random() > 0.5 ? 1 : -1),
        walkCycle: Math.random() * 10,
        health: 40,
      });
    }
  }

  update(dt, playerPos, isGunfireNearby) {
    this.updateCivilianCars(dt);
    this.updatePedestrians(dt, playerPos, isGunfireNearby);
    this.updateCashPickups(dt, playerPos);
  }

  updateCivilianCars(dt) {
    this.civilianCars.forEach((v) => {
      if (v === this.vehicleManager.playerVehicle || v.isDestroyed) return;

      const wp = v.targetWaypoint;
      if (!wp) return;

      // Obstacle detection ahead (avoid hitting other vehicles)
      let obstacleAhead = false;
      const forwardVec = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), v.mesh.rotation.y);
      const frontX = v.mesh.position.x + forwardVec.x * 6;
      const frontZ = v.mesh.position.z + forwardVec.z * 6;

      for (let i = 0; i < this.vehicleManager.vehicles.length; i++) {
        const other = this.vehicleManager.vehicles[i];
        if (other === v || other.isDestroyed) continue;
        const dist = Math.hypot(other.mesh.position.x - frontX, other.mesh.position.z - frontZ);
        if (dist < 5.0) {
          obstacleAhead = true;
          break;
        }
      }

      // Cruise or brake
      if (obstacleAhead) {
        v.speed = Math.max(0, v.speed - v.accel * dt * 1.5);
      } else {
        v.speed = Math.min(v.targetSpeed, v.speed + v.accel * dt * 0.8);
      }

      // Move forward
      v.mesh.position.x += forwardVec.x * v.speed * dt;
      v.mesh.position.z += forwardVec.z * v.speed * dt;

      // Wrap around or loop waypoint
      const half = this.world.citySize / 2;
      if (
        Math.abs(v.mesh.position.x) > half + 10 ||
        Math.abs(v.mesh.position.z) > half + 10
      ) {
        v.mesh.position.copy(wp.start);
      }
    });
  }

  updatePedestrians(dt, playerPos, isGunfireNearby) {
    const half = this.world.citySize / 2;

    this.pedestrians.forEach((p) => {
      if (p.isDead) return;

      const distToPlayer = Math.hypot(p.mesh.position.x - playerPos.x, p.mesh.position.z - playerPos.z);

      // Trigger panic from gunshots or close reckless driving
      if (isGunfireNearby && distToPlayer < 45) {
        p.isPanicking = true;
        // Flee opposite to player
        p.direction.set(p.mesh.position.x - playerPos.x, 0, p.mesh.position.z - playerPos.z).normalize();
      }

      const moveSpeed = p.isPanicking ? p.speed * 2.8 : p.speed;

      // Animate walking / running legs
      p.walkCycle += dt * (p.isPanicking ? 14 : 7);
      p.legL.rotation.x = Math.sin(p.walkCycle) * 0.6;
      p.legR.rotation.x = -Math.sin(p.walkCycle) * 0.6;

      // Move
      const nextX = p.mesh.position.x + p.direction.x * moveSpeed * dt;
      const nextZ = p.mesh.position.z + p.direction.z * moveSpeed * dt;

      // Check collision with buildings
      if (!this.world.checkCollision(nextX, nextZ, 0.4)) {
        p.mesh.position.x = nextX;
        p.mesh.position.z = nextZ;
      } else {
        // Reverse direction
        p.direction.negate();
      }

      // Orient mesh towards movement direction
      p.mesh.rotation.y = Math.atan2(p.direction.x, p.direction.z);

      // Check vehicle hit-and-run
      this.vehicleManager.vehicles.forEach((v) => {
        if (Math.abs(v.speed) > 4 && !p.isDead) {
          const hitDist = Math.hypot(v.mesh.position.x - p.mesh.position.x, v.mesh.position.z - p.mesh.position.z);
          if (hitDist < 2.2) {
            this.killPedestrian(p, v.mesh.rotation.y);
          }
        }
      });
    });
  }

  killPedestrian(p, hitAngle) {
    p.isDead = true;
    p.mesh.rotation.x = Math.PI / 2;
    p.mesh.position.y = 0.25;
    this.soundFx.playCrash();

    // Spawn cash pickup
    this.spawnCash(p.mesh.position.x, p.mesh.position.z);
  }

  spawnCash(x, z) {
    const cashGeo = new THREE.BoxGeometry(0.5, 0.1, 0.8);
    const cashMat = new THREE.MeshBasicMaterial({ color: 0x00e676 }); // Green banknote
    const cashMesh = new THREE.Mesh(cashGeo, cashMat);
    cashMesh.position.set(x, 0.2, z);
    this.scene.add(cashMesh);

    this.cashPickups.push({
      mesh: cashMesh,
      amount: 100 + Math.floor(Math.random() * 150),
      collected: false,
    });
  }

  updateCashPickups(dt, playerPos) {
    for (let i = this.cashPickups.length - 1; i >= 0; i--) {
      const c = this.cashPickups[i];
      c.mesh.rotation.y += dt * 3;
      const dist = Math.hypot(c.mesh.position.x - playerPos.x, c.mesh.position.z - playerPos.z);
      if (dist < 2.0 && !c.collected) {
        c.collected = true;
        this.scene.remove(c.mesh);
        this.soundFx.playMoney();
        this.cashPickups.splice(i, 1);
        if (window.gameInstance) {
          window.gameInstance.addCash(c.amount);
        }
      }
    }
  }
}
