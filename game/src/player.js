// Third-Person Player Controller, Animation, and Camera System for Vice City Shadows
// Seamlessly transitions between on-foot tactical movement and high-speed vehicle driving.
import * as THREE from 'three';

export class Player {
  constructor(scene, camera, world, vehicleManager, soundFx) {
    this.scene = scene;
    this.camera = camera;
    this.world = world;
    this.vehicleManager = vehicleManager;
    this.soundFx = soundFx;

    this.position = new THREE.Vector3(0, 0, 10);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0.2;
    this.walkCycle = 0;

    this.health = 100;
    this.armor = 100;
    this.cash = 2500;
    this.isDriving = false;
    this.currentVehicle = null;

    this.buildCharacterMesh();
  }

  buildCharacterMesh() {
    this.group = new THREE.Group();

    // Materials for Vice Coast Protagonist
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdca880, roughness: 0.7 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x00bcd4, roughness: 0.5 }); // Cyan floral shirt
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e272c, roughness: 0.8 }); // Dark denim
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.75, 0.35), shirtMat);
    torso.position.y = 1.25;
    torso.castShadow = true;
    this.group.add(torso);

    // Head & Hair
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.38, 0.35), skinMat);
    head.position.y = 1.82;
    head.castShadow = true;
    this.group.add(head);

    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.38), new THREE.MeshStandardMaterial({ color: 0x212121 }));
    hair.position.y = 1.98;
    this.group.add(hair);

    // Left & Right Arms
    const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2);
    this.armL = new THREE.Mesh(armGeo, shirtMat);
    this.armL.position.set(-0.45, 1.2, 0);
    this.armL.castShadow = true;
    this.group.add(this.armL);

    this.armR = new THREE.Mesh(armGeo, shirtMat);
    this.armR.position.set(0.45, 1.2, 0);
    this.armR.castShadow = true;
    this.group.add(this.armR);

    // Left & Right Legs
    const legGeo = new THREE.BoxGeometry(0.25, 0.85, 0.25);
    this.legL = new THREE.Mesh(legGeo, pantsMat);
    this.legL.position.set(-0.18, 0.45, 0);
    this.legL.castShadow = true;
    this.group.add(this.legL);

    this.legR = new THREE.Mesh(legGeo, pantsMat);
    this.legR.position.set(0.18, 0.45, 0);
    this.legR.castShadow = true;
    this.group.add(this.legR);

    this.group.position.copy(this.position);
    this.scene.add(this.group);
  }

  update(dt, input, mouseMove) {
    // Update Camera Orbit Angles from Mouse
    this.yaw -= mouseMove.x * 0.0025;
    this.pitch = Math.max(-0.6, Math.min(1.1, this.pitch + mouseMove.y * 0.0025));

    if (this.isDriving && this.currentVehicle) {
      this.updateDriving(dt);
    } else {
      this.updateOnFoot(dt, input);
    }

    this.updateCamera(dt);
  }

  updateOnFoot(dt, input) {
    const isSprinting = input.sprint || false;
    const speed = isSprinting ? 9.5 : 4.4;

    // Movement vectors relative to camera yaw
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const moveDir = new THREE.Vector3();
    if (input.forward) moveDir.add(forward);
    if (input.backward) moveDir.sub(forward);
    if (input.right) moveDir.add(right);
    if (input.left) moveDir.sub(right);

    const isMoving = moveDir.lengthSq() > 0.001;
    if (isMoving) {
      moveDir.normalize();

      // Smooth Character Model Rotation towards movement direction
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      let angleDiff = targetAngle - this.group.rotation.y;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      this.group.rotation.y += angleDiff * dt * 12;

      // Leg swing animations
      this.walkCycle += dt * (isSprinting ? 16 : 9);
      this.legL.rotation.x = Math.sin(this.walkCycle) * 0.7;
      this.legR.rotation.x = -Math.sin(this.walkCycle) * 0.7;
      this.armL.rotation.x = -Math.sin(this.walkCycle) * 0.5;
      this.armR.rotation.x = Math.sin(this.walkCycle) * 0.5;

      const nextX = this.position.x + moveDir.x * speed * dt;
      const nextZ = this.position.z + moveDir.z * speed * dt;

      // Collision with city geometry
      if (!this.world.checkCollision(nextX, nextZ, 0.4)) {
        this.position.x = nextX;
        this.position.z = nextZ;
      }
    } else {
      // Idle pose reset
      this.legL.rotation.x = 0;
      this.legR.rotation.x = 0;
      this.armL.rotation.x = 0;
      this.armR.rotation.x = 0;
    }

    this.group.position.copy(this.position);
  }

  updateDriving(dt) {
    if (!this.currentVehicle) return;
    this.position.copy(this.currentVehicle.mesh.position);
    this.group.position.copy(this.position);
    // Align camera yaw gently behind car
    const carYaw = this.currentVehicle.mesh.rotation.y;
    let dyaw = carYaw + Math.PI - this.yaw;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    this.yaw += dyaw * dt * 2.5;
  }

  updateCamera(dt) {
    if (this.isDriving && this.currentVehicle) {
      // Vehicle Chase Camera
      const dist = 7.5;
      const height = 3.2;
      const camTarget = this.currentVehicle.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));

      const cx = camTarget.x + Math.sin(this.yaw) * dist * Math.cos(this.pitch);
      const cy = camTarget.y + Math.sin(this.pitch) * dist + height;
      const cz = camTarget.z + Math.cos(this.yaw) * dist * Math.cos(this.pitch);

      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(camTarget);
    } else {
      // Third-Person Foot Camera
      const dist = 4.2;
      const height = 1.9;
      const camTarget = this.position.clone().add(new THREE.Vector3(0, 1.4, 0));

      const cx = camTarget.x + Math.sin(this.yaw) * dist * Math.cos(this.pitch);
      const cy = camTarget.y + Math.sin(this.pitch) * dist + height;
      const cz = camTarget.z + Math.cos(this.yaw) * dist * Math.cos(this.pitch);

      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(camTarget);
    }
  }

  toggleVehicle() {
    if (this.isDriving) {
      // Exit Vehicle
      const v = this.currentVehicle;
      if (v) {
        v.isPlayerVehicle = false;
        this.vehicleManager.playerVehicle = null;
        // Spawn player to the left of the driver door
        const sideVec = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), v.mesh.rotation.y);
        this.position.copy(v.mesh.position).addScaledVector(sideVec, v.width / 2 + 1.2);
        this.group.position.copy(this.position);
        this.group.visible = true;
      }
      this.currentVehicle = null;
      this.isDriving = false;
    } else {
      // Try to enter nearby vehicle
      const v = this.vehicleManager.findNearbyVehicle(this.position.x, this.position.z, 4.5);
      if (v && !v.isDestroyed) {
        this.currentVehicle = v;
        v.isPlayerVehicle = true;
        this.vehicleManager.playerVehicle = v;
        this.isDriving = true;
        this.group.visible = false; // Player sits inside car
        this.soundFx.playCrash(); // Door shut sound
      }
    }
  }

  takeDamage(amount) {
    if (this.armor > 0) {
      const absorbed = amount * 0.7;
      this.armor = Math.max(0, this.armor - absorbed);
      this.health = Math.max(0, this.health - (amount - absorbed));
    } else {
      this.health = Math.max(0, this.health - amount);
    }
  }

  heal(amount) {
    this.health = Math.min(100, this.health + amount);
  }
}
