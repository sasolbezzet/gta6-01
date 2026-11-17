// 3D Vehicle Physics and Dynamic Car Controller for Vice City Shadows
// Supports Cheetah GT, Dominator, SUV, and Police Interceptors with headlights and lightbars.
import * as THREE from 'three';

export class VehicleManager {
  constructor(scene, soundFx, world) {
    this.scene = scene;
    this.soundFx = soundFx;
    this.world = world;
    this.vehicles = [];
    this.playerVehicle = null;

    // Shared materials
    this.tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    this.rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 });
    this.glassMat = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.1, metalness: 0.9 });
    this.lightMat = new THREE.MeshBasicMaterial({ color: 0xffffea });
    this.brakeMat = new THREE.MeshBasicMaterial({ color: 0xff1111 });
    this.blueSirenMat = new THREE.MeshBasicMaterial({ color: 0x0066ff });
    this.redSirenMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
  }

  createVehicle(type = 'cheetah', x = 0, z = 0, rotY = 0) {
    const group = new THREE.Group();
    group.position.set(x, 0.45, z);
    group.rotation.y = rotY;

    let bodyColor = 0xe53935; // Red cheetah
    let width = 2.1;
    let length = 4.6;
    let height = 1.1;
    let maxSpeed = 38; // m/s (~136 km/h)
    let accel = 22;
    let handling = 2.6;

    if (type === 'dominator') {
      bodyColor = 0xfbc02d; // Yellow muscle car
      width = 2.2;
      length = 4.8;
      height = 1.25;
      maxSpeed = 34;
      accel = 24;
      handling = 2.2;
    } else if (type === 'suv') {
      bodyColor = 0x2e7d32; // Green Rumbler
      width = 2.3;
      length = 5.0;
      height = 1.7;
      maxSpeed = 26;
      accel = 16;
      handling = 1.8;
    } else if (type === 'police') {
      bodyColor = 0x1a1a1a; // Police cruiser
      width = 2.2;
      length = 4.9;
      height = 1.35;
      maxSpeed = 36;
      accel = 23;
      handling = 2.5;
    }

    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.2,
      metalness: 0.7,
    });

    // Lower Chassis
    const chassisGeo = new THREE.BoxGeometry(width, height * 0.6, length);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = height * 0.3;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    group.add(chassis);

    // Cabin / Windshield
    const cabinWidth = width * 0.85;
    const cabinLength = length * 0.52;
    const cabinHeight = height * 0.65;
    const cabinGeo = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);
    const cabin = new THREE.Mesh(cabinGeo, this.glassMat);
    cabin.position.set(0, height * 0.85, -length * 0.08);
    cabin.castShadow = true;
    group.add(cabin);

    // Police Cruiser White Doors and Roof
    if (type === 'police') {
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const doorL = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), whiteMat);
      doorL.position.set(-width / 2 - 0.01, height * 0.3, 0);
      doorL.rotation.y = -Math.PI / 2;
      group.add(doorL);

      const doorR = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), whiteMat);
      doorR.position.set(width / 2 + 0.01, height * 0.3, 0);
      doorR.rotation.y = Math.PI / 2;
      group.add(doorR);

      // Police Roof Lightbar
      const barGeo = new THREE.BoxGeometry(1.4, 0.18, 0.35);
      const barBase = new THREE.Mesh(barGeo, new THREE.MeshStandardMaterial({ color: 0x222222 }));
      barBase.position.set(0, height * 1.25, -length * 0.08);
      group.add(barBase);

      const redLight = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.3), this.redSirenMat);
      redLight.position.set(-0.35, height * 1.25, -length * 0.08);
      group.add(redLight);

      const blueLight = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.3), this.blueSirenMat);
      blueLight.position.set(0.35, height * 1.25, -length * 0.08);
      group.add(blueLight);

      group.userData.sirenLights = { red: redLight, blue: blueLight };
    }

    // 4 Wheels
    const wheels = [];
    const wheelPositions = [
      { x: -width / 2 + 0.1, y: 0.2, z: length * 0.32 },
      { x: width / 2 - 0.1, y: 0.2, z: length * 0.32 },
      { x: -width / 2 + 0.1, y: 0.2, z: -length * 0.32 },
      { x: width / 2 - 0.1, y: 0.2, z: -length * 0.32 },
    ];
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 12);
    wheelGeo.rotateZ(Math.PI / 2);

    wheelPositions.forEach((pos) => {
      const wMesh = new THREE.Mesh(wheelGeo, this.tireMat);
      wMesh.position.set(pos.x, pos.y, pos.z);
      wMesh.castShadow = true;
      group.add(wMesh);
      wheels.push(wMesh);
    });

    // Headlights (Front is +Z)
    const headL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), this.lightMat);
    headL.position.set(-width * 0.35, height * 0.35, length / 2 + 0.02);
    group.add(headL);

    const headR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), this.lightMat);
    headR.position.set(width * 0.35, height * 0.35, length / 2 + 0.02);
    group.add(headR);

    // Taillights / Brake lights
    const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), this.brakeMat);
    tailL.position.set(-width * 0.35, height * 0.35, -length / 2 - 0.02);
    group.add(tailL);

    const tailR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), this.brakeMat);
    tailR.position.set(width * 0.35, height * 0.35, -length / 2 - 0.02);
    group.add(tailR);

    const vehicle = {
      type,
      mesh: group,
      speed: 0,
      steering: 0,
      maxSpeed,
      accel,
      handling,
      health: 100,
      isDestroyed: false,
      isPlayerVehicle: false,
      isBraking: false,
      wheels,
      tailL,
      tailR,
      width,
      length,
    };

    this.scene.add(group);
    this.vehicles.push(vehicle);
    return vehicle;
  }

  update(dt, input) {
    const isPlayerInCar = this.playerVehicle !== null;

    this.vehicles.forEach((v) => {
      if (v.isDestroyed) return;

      if (v === this.playerVehicle) {
        this.updatePlayerCarPhysics(v, dt, input);
      }

      // Wheels rotation according to forward speed
      const rollDelta = (v.speed * dt) / 0.42;
      v.wheels.forEach((w) => {
        w.rotation.x += rollDelta;
      });

      // Front wheels steering angle
      if (v.wheels.length >= 2) {
        v.wheels[0].rotation.y = v.steering;
        v.wheels[1].rotation.y = v.steering;
      }

      // Siren flashing lights for police
      if (v.type === 'police' && v.mesh.userData.sirenLights) {
        const time = performance.now() * 0.008;
        const flash = Math.sin(time) > 0;
        v.mesh.userData.sirenLights.red.visible = flash;
        v.mesh.userData.sirenLights.blue.visible = !flash;
      }
    });

    // Update audio engine frequency for player
    if (this.playerVehicle) {
      const speedRatio = Math.abs(this.playerVehicle.speed) / this.playerVehicle.maxSpeed;
      this.soundFx.updateEngine(speedRatio, true);
    } else {
      this.soundFx.updateEngine(0, false);
    }
  }

  updatePlayerCarPhysics(v, dt, input) {
    let throttle = 0;
    if (input.forward) throttle += 1;
    if (input.backward) throttle -= 1;

    let steerInput = 0;
    if (input.left) steerInput += 1;
    if (input.right) steerInput -= 1;

    const handbrake = input.handbrake || false;

    // Steering interpolation
    const targetSteer = steerInput * 0.45;
    v.steering += (targetSteer - v.steering) * dt * 8;

    // Acceleration & Braking
    if (throttle > 0) {
      v.speed += v.accel * dt;
      v.isBraking = false;
    } else if (throttle < 0) {
      if (v.speed > 1) {
        // Braking while going forward
        v.speed -= v.accel * 1.8 * dt;
        v.isBraking = true;
      } else {
        // Reverse
        v.speed -= v.accel * 0.6 * dt;
        v.isBraking = false;
      }
    } else {
      // Natural drag / friction
      v.isBraking = false;
      v.speed *= Math.pow(0.92, dt * 60);
    }

    if (handbrake) {
      v.speed *= Math.pow(0.85, dt * 60);
      v.isBraking = true;
      if (Math.abs(v.speed) > 10) {
        this.soundFx.playTireScreech();
      }
    }

    // Clamp speed
    v.speed = Math.max(-v.maxSpeed * 0.4, Math.min(v.maxSpeed, v.speed));

    // Yaw rotation based on steering and speed
    if (Math.abs(v.speed) > 0.1) {
      const turnMultiplier = (v.speed > 0 ? 1 : -1) * (handbrake ? 1.6 : 1.0);
      v.mesh.rotation.y += v.steering * v.handling * turnMultiplier * (v.speed / v.maxSpeed) * dt;
    }

    // Move forward in local Z direction
    const forwardVec = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), v.mesh.rotation.y);
    const newX = v.mesh.position.x + forwardVec.x * v.speed * dt;
    const newZ = v.mesh.position.z + forwardVec.z * v.speed * dt;

    // Check collision with buildings
    if (!this.world.checkCollision(newX, newZ, v.width / 2)) {
      v.mesh.position.x = newX;
      v.mesh.position.z = newZ;
    } else {
      // Collision impact
      if (Math.abs(v.speed) > 4) {
        this.soundFx.playCrash();
        v.health -= Math.abs(v.speed) * 1.5;
      }
      v.speed = -v.speed * 0.35; // Bounce back
    }
  }

  findNearbyVehicle(x, z, maxDist = 4.5) {
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v.isDestroyed) continue;
      const dist = Math.hypot(v.mesh.position.x - x, v.mesh.position.z - z);
      if (dist <= maxDist) {
        return v;
      }
    }
    return null;
  }
}
