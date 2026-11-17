// Ballistics, Weapon Arsenal, and Combat Particle System for Vice City Shadows
// Supports Melee, Pistol, Micro SMG, Assault Rifle, and Frag Grenades with Raycasting and Explosions.
import * as THREE from 'three';

export class WeaponSystem {
  constructor(scene, soundFx, world, vehicleManager, trafficManager, policeSystem) {
    this.scene = scene;
    this.soundFx = soundFx;
    this.world = world;
    this.vehicleManager = vehicleManager;
    this.trafficManager = trafficManager;
    this.policeSystem = policeSystem;

    this.currentWeapon = 'pistol'; // 'fist', 'pistol', 'smg', 'rifle', 'grenade'
    this.ammo = {
      pistol: 72,
      smg: 180,
      rifle: 120,
      grenade: 6,
    };
    this.magazines = {
      pistol: 12,
      smg: 30,
      rifle: 30,
      grenade: 1,
    };
    this.lastFireTime = 0;
    this.projectiles = []; // Bullets and Grenades
    this.particles = []; // Impact sparks, muzzle flash, explosion debris

    // Shared particle materials
    this.tracerMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
    this.sparkMat = new THREE.MeshBasicMaterial({ color: 0xff5722 });
    this.smokeMat = new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.7 });
  }

  setWeapon(type) {
    if (['fist', 'pistol', 'smg', 'rifle', 'grenade'].includes(type)) {
      this.currentWeapon = type;
    }
  }

  fire(origin, direction, isPlayerDriving) {
    const now = performance.now();
    const delays = { fist: 350, pistol: 240, smg: 95, rifle: 130, grenade: 600 };
    if (now - this.lastFireTime < delays[this.currentWeapon]) return false;

    // Check ammo
    if (this.currentWeapon !== 'fist') {
      if (this.ammo[this.currentWeapon] <= 0) return false;
      this.ammo[this.currentWeapon]--;
    }

    this.lastFireTime = now;

    if (this.currentWeapon === 'grenade') {
      this.throwGrenade(origin, direction);
      return true;
    }

    if (this.currentWeapon === 'fist') {
      this.performMeleePunch(origin, direction);
      return true;
    }

    // Gunfire
    this.soundFx.playGunshot(this.currentWeapon);
    this.policeSystem.reportCrime('gunfire');

    // Spawn Muzzle Flash
    this.createMuzzleFlash(origin, direction);

    // Bullet Raycasting
    this.raycastBullet(origin, direction);
    return true;
  }

  createMuzzleFlash(origin, direction) {
    const flashGeo = new THREE.SphereGeometry(0.2, 6, 6);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.copy(origin).addScaledVector(direction, 0.6);
    this.scene.add(flash);

    setTimeout(() => {
      this.scene.remove(flash);
    }, 40);
  }

  raycastBullet(origin, direction) {
    const range = 120;
    const bulletDamage = { pistol: 35, smg: 28, rifle: 55 }[this.currentWeapon] || 30;

    // Bullet tracer visual
    const tracerGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.5, 4);
    tracerGeo.rotateX(Math.PI / 2);
    const tracer = new THREE.Mesh(tracerGeo, this.tracerMat);
    tracer.position.copy(origin);
    tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    this.scene.add(tracer);

    this.projectiles.push({
      mesh: tracer,
      vel: direction.clone().multiplyScalar(160),
      distTraveled: 0,
      maxDist: range,
      isGrenade: false,
    });

    // Check hit against Vehicles
    this.vehicleManager.vehicles.forEach((v) => {
      if (v.isDestroyed) return;
      const dist = this.pointToSegmentDist(v.mesh.position, origin, direction, range);
      if (dist < v.width * 0.7) {
        v.health -= bulletDamage;
        this.spawnHitSparks(v.mesh.position);
        if (v.health <= 0) {
          this.destroyVehicle(v);
        }
      }
    });

    // Check hit against Pedestrians
    this.trafficManager.pedestrians.forEach((p) => {
      if (p.isDead) return;
      const dist = this.pointToSegmentDist(p.mesh.position, origin, direction, range);
      if (dist < 0.8) {
        p.health -= bulletDamage;
        if (p.health <= 0) {
          this.trafficManager.killPedestrian(p, 0);
          this.policeSystem.reportCrime('hit_pedestrian');
        }
      }
    });
  }

  performMeleePunch(origin, direction) {
    const range = 2.5;
    this.trafficManager.pedestrians.forEach((p) => {
      if (p.isDead) return;
      const dx = p.mesh.position.x - origin.x;
      const dz = p.mesh.position.z - origin.z;
      const dist = Math.hypot(dx, dz);
      if (dist < range) {
        p.health -= 25;
        this.soundFx.playCrash();
        if (p.health <= 0) {
          this.trafficManager.killPedestrian(p, 0);
        }
      }
    });
  }

  throwGrenade(origin, direction) {
    const grenadeGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const grenadeMat = new THREE.MeshStandardMaterial({ color: 0x334422, roughness: 0.6 });
    const mesh = new THREE.Mesh(grenadeGeo, grenadeMat);
    mesh.position.copy(origin).add(new THREE.Vector3(0, 1.2, 0));
    this.scene.add(mesh);

    const forward = direction.clone().setY(0.45).normalize();
    const vel = forward.multiplyScalar(22);

    this.projectiles.push({
      mesh,
      vel,
      isGrenade: true,
      timer: 2.2, // 2.2s fuse
    });
  }

  update(dt) {
    // Update bullets & grenades
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      if (p.isGrenade) {
        p.vel.y -= 19.8 * dt; // Gravity
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.rotation.x += dt * 5;

        // Ground bounce
        if (p.mesh.position.y <= 0.2) {
          p.mesh.position.y = 0.2;
          p.vel.y = -p.vel.y * 0.45;
          p.vel.x *= 0.7;
          p.vel.z *= 0.7;
        }

        p.timer -= dt;
        if (p.timer <= 0) {
          this.explodeAt(p.mesh.position);
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
        }
      } else {
        // Bullet tracer
        const step = p.vel.clone().multiplyScalar(dt);
        p.mesh.position.add(step);
        p.distTraveled += step.length();

        if (p.distTraveled >= p.maxDist) {
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
        }
      }
    }

    // Update particle effects
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      pt.mesh.position.addScaledVector(pt.vel, dt);
      if (pt.life <= 0) {
        this.scene.remove(pt.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  explodeAt(pos) {
    this.soundFx.playExplosion();
    this.policeSystem.reportCrime('destroy_car');

    // Visual fireball and debris
    for (let i = 0; i < 24; i++) {
      const size = 0.3 + Math.random() * 0.6;
      const debGeo = new THREE.BoxGeometry(size, size, size);
      const debMat = Math.random() > 0.4 ? this.sparkMat : this.smokeMat;
      const deb = new THREE.Mesh(debGeo, debMat);
      deb.position.copy(pos);
      this.scene.add(deb);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 18,
        Math.random() * 14 + 4,
        (Math.random() - 0.5) * 18
      );
      this.particles.push({ mesh: deb, vel, life: 0.9 + Math.random() * 0.5 });
    }

    // Blast damage radius (12m)
    const blastRadius = 14;
    this.vehicleManager.vehicles.forEach((v) => {
      const dist = v.mesh.position.distanceTo(pos);
      if (dist < blastRadius) {
        v.health -= (1 - dist / blastRadius) * 140;
        if (v.health <= 0 && !v.isDestroyed) {
          this.destroyVehicle(v);
        }
      }
    });

    this.trafficManager.pedestrians.forEach((p) => {
      const dist = p.mesh.position.distanceTo(pos);
      if (dist < blastRadius && !p.isDead) {
        this.trafficManager.killPedestrian(p, 0);
      }
    });
  }

  destroyVehicle(v) {
    v.isDestroyed = true;
    v.speed = 0;
    this.soundFx.playExplosion();
    // Darken chassis material to charred black
    v.mesh.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
      }
    });
  }

  spawnHitSparks(pos) {
    for (let i = 0; i < 5; i++) {
      const spark = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), this.sparkMat);
      spark.position.copy(pos);
      this.scene.add(spark);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8);
      this.particles.push({ mesh: spark, vel, life: 0.25 });
    }
  }

  pointToSegmentDist(point, segStart, segDir, maxLen) {
    const v = point.clone().sub(segStart);
    const proj = v.dot(segDir);
    if (proj <= 0) return point.distanceTo(segStart);
    if (proj >= maxLen) return point.distanceTo(segStart.clone().addScaledVector(segDir, maxLen));
    const closest = segStart.clone().addScaledVector(segDir, proj);
    return point.distanceTo(closest);
  }
}
