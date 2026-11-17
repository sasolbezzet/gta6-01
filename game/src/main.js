// Vice City Shadows - Main Game Coordinator and Orchestrator
// Coordinates Three.js render loop, user inputs, staging scenes for screenshots, and game states.
import * as THREE from 'three';
import { World } from './world.js';
import { SoundFX } from './audio.js';
import { VehicleManager } from './vehicles.js';
import { TrafficManager } from './traffic.js';
import { PoliceSystem } from './police.js';
import { WeaponSystem } from './weapons.js';
import { Player } from './player.js';
import { HUD } from './hud.js';
import { MissionManager } from './missions.js';

export class Game {
  constructor() {
    this.container = document.body;
    this.isPaused = false;
    this.clock = new THREE.Clock();

    // Input state
    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      handbrake: false,
    };
    this.mouseMove = { x: 0, y: 0 };
    this.isAiming = false;

    this.initGraphics();
    this.initAudioAndSystems();
    this.initInputListeners();
    this.initUI();
    this.checkScreenshotMode();

    window.gameInstance = this;
    requestAnimationFrame((t) => this.loop(t));
  }

  initGraphics() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 800);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initAudioAndSystems() {
    this.soundFx = new SoundFX();
    this.world = new World(this.scene);
    this.vehicleManager = new VehicleManager(this.scene, this.soundFx, this.world);
    this.trafficManager = new TrafficManager(this.scene, this.world, this.vehicleManager, this.soundFx);
    this.policeSystem = new PoliceSystem(this.scene, this.world, this.vehicleManager, this.soundFx);
    this.weaponSystem = new WeaponSystem(
      this.scene,
      this.soundFx,
      this.world,
      this.vehicleManager,
      this.trafficManager,
      this.policeSystem
    );
    this.player = new Player(this.scene, this.camera, this.world, this.vehicleManager, this.soundFx);
    this.hud = new HUD();
    this.missionManager = new MissionManager(this.soundFx, this.policeSystem);

    // Spawn player's starter sports car nearby
    this.starterCar = this.vehicleManager.createVehicle('cheetah', 0, 18, 0);
  }

  initInputListeners() {
    window.addEventListener('keydown', (e) => {
      this.soundFx.init(); // Audio unlock on first key
      this.soundFx.resume();

      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') this.input.forward = true;
      if (k === 's' || k === 'arrowdown') this.input.backward = true;
      if (k === 'a' || k === 'arrowleft') this.input.left = true;
      if (k === 'd' || k === 'arrowright') this.input.right = true;
      if (e.key === 'Shift') this.input.sprint = true;
      if (e.key === ' ') this.input.handbrake = true;

      if (k === 'f' || e.key === 'Enter') {
        this.player.toggleVehicle();
      }

      // Weapon hotkeys
      if (k === '1') this.weaponSystem.setWeapon('fist');
      if (k === '2') this.weaponSystem.setWeapon('pistol');
      if (k === '3') this.weaponSystem.setWeapon('smg');
      if (k === '4') this.weaponSystem.setWeapon('rifle');
      if (k === '5' || k === 'g') this.weaponSystem.setWeapon('grenade');

      if (k === 'p' || e.key === 'Escape') {
        this.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') this.input.forward = false;
      if (k === 's' || k === 'arrowdown') this.input.backward = false;
      if (k === 'a' || k === 'arrowleft') this.input.left = false;
      if (k === 'd' || k === 'arrowright') this.input.right = false;
      if (e.key === 'Shift') this.input.sprint = false;
      if (e.key === ' ') this.input.handbrake = false;
    });

    // Pointer Lock and Aiming
    this.renderer.domElement.addEventListener('click', () => {
      this.soundFx.init();
      this.soundFx.resume();
      if (document.pointerLockElement !== this.renderer.domElement && !this.isPaused) {
        this.renderer.domElement.requestPointerLock();
      } else if (!this.player.isDriving) {
        // Fire weapon on left click
        const fireOrigin = this.player.position.clone().add(new THREE.Vector3(0, 1.4, 0));
        const fireDir = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw)).normalize();
        this.weaponSystem.fire(fireOrigin, fireDir, false);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.renderer.domElement) {
        this.mouseMove.x += e.movementX;
        this.mouseMove.y += e.movementY;
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        this.isAiming = true;
        this.camera.fov = 45;
        this.camera.updateProjectionMatrix();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.isAiming = false;
        this.camera.fov = 65;
        this.camera.updateProjectionMatrix();
      }
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  initUI() {
    this.titleScreen = document.createElement('div');
    this.titleScreen.id = 'title-screen';
    this.titleScreen.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at center, rgba(15, 12, 41, 0.6) 0%, rgba(20, 10, 30, 0.95) 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      z-index: 2000;
    `;

    this.titleScreen.innerHTML = `
      <div style="font-size: 64px; font-weight: 900; letter-spacing: 6px; color: #ff007f; text-shadow: 0 0 20px #ff007f, 3px 3px 0 #00f0ff;">
        VICE CITY SHADOWS
      </div>
      <div style="font-size: 20px; font-weight: 700; letter-spacing: 4px; color: #00f0ff; margin-top: 6px; text-shadow: 0 0 10px #00f0ff;">
        THE 3D OPEN-WORLD CRIME EXPERIENCE
      </div>

      <div style="margin-top: 40px; display: flex; flex-direction: column; gap: 14px; width: 280px;">
        <button id="btn-start" style="padding: 14px; font-size: 18px; font-weight: 800; background: #ff007f; color: #fff; border: none; border-radius: 4px; cursor: pointer; letter-spacing: 2px; box-shadow: 0 4px 15px rgba(255,0,127,0.5);">
          START GAME
        </div>
        <button id="btn-controls" style="padding: 12px; font-size: 15px; font-weight: 700; background: rgba(255,255,255,0.15); color: #fff; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; cursor: pointer; letter-spacing: 1px;">
          CONTROLS GUIDE
        </div>
      </div>

      <div id="controls-modal" style="display: none; margin-top: 24px; background: rgba(0,0,0,0.8); padding: 18px 24px; border-radius: 6px; border: 1px solid #00f0ff; font-size: 14px; line-height: 1.6; text-align: left;">
        <div><b>WASD:</b> Move / Drive Vehicle</div>
        <div><b>Shift:</b> Sprint on foot</div>
        <div><b>F / Enter:</b> Hijack / Enter / Exit Vehicle</div>
        <div><b>Space:</b> Handbrake Drift / Jump</div>
        <div><b>Left Click:</b> Shoot / Punch (Aim with Right Click)</div>
        <div><b>1, 2, 3, 4, 5:</b> Switch Weapons (Fist, Pistol, SMG, Rifle, Grenade)</div>
        <div><b>P / Esc:</b> Pause Menu</div>
      </div>
    `;

    document.body.appendChild(this.titleScreen);

    document.getElementById('btn-start').addEventListener('click', () => {
      this.soundFx.init();
      this.soundFx.resume();
      this.titleScreen.style.display = 'none';
      this.renderer.domElement.requestPointerLock();
    });

    document.getElementById('btn-controls').addEventListener('click', () => {
      const modal = document.getElementById('controls-modal');
      modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
    });
  }

  checkScreenshotMode() {
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (!shot) return;

    // Stage scenes matching shots.json
    if (shot === 'title') {
      this.titleScreen.style.display = 'flex';
      this.camera.position.set(20, 14, 45);
      this.camera.lookAt(0, 4, 18);
    } else if (shot === 'drive') {
      this.titleScreen.style.display = 'none';
      // Put player in Cheetah GT sports car
      this.starterCar.speed = 28;
      this.player.isDriving = true;
      this.player.currentVehicle = this.starterCar;
      this.starterCar.isPlayerVehicle = true;
      this.vehicleManager.playerVehicle = this.starterCar;
      this.player.group.visible = false;
      this.starterCar.mesh.position.set(0, 0.45, 30);
      this.player.yaw = Math.PI;
    } else if (shot === 'pursuit') {
      this.titleScreen.style.display = 'none';
      // 5-Star Police Pursuit with flashing cruisers
      this.starterCar.speed = 34;
      this.player.isDriving = true;
      this.player.currentVehicle = this.starterCar;
      this.starterCar.isPlayerVehicle = true;
      this.vehicleManager.playerVehicle = this.starterCar;
      this.player.group.visible = false;
      this.policeSystem.setWantedLevel(5);

      // Spawn police interceptors right behind
      const p1 = this.vehicleManager.createVehicle('police', -3.5, 12, 0);
      p1.speed = 32;
      this.policeSystem.policeVehicles.push(p1);

      const p2 = this.vehicleManager.createVehicle('police', 3.5, 15, 0);
      p2.speed = 33;
      this.policeSystem.policeVehicles.push(p2);
    } else if (shot === 'mission') {
      this.titleScreen.style.display = 'none';
      // Mission objective scene with combat
      this.weaponSystem.setWeapon('rifle');
      this.policeSystem.setWantedLevel(3);
      this.player.position.set(10, 0, 40);
      this.player.group.position.copy(this.player.position);
      // Spawn gunfire tracer
      const origin = this.player.position.clone().add(new THREE.Vector3(0, 1.4, 0));
      const dir = new THREE.Vector3(0.5, 0, -1).normalize();
      this.weaponSystem.fire(origin, dir, false);
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      document.exitPointerLock();
    }
  }

  addCash(amount) {
    this.player.cash += amount;
  }

  loop() {
    requestAnimationFrame((t) => this.loop(t));

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.1); // Prevent physics tunneling

    if (!this.isPaused) {
      // Update Core Systems
      this.player.update(dt, this.input, this.mouseMove);
      this.vehicleManager.update(dt, this.input);
      this.trafficManager.update(dt, this.player.position, this.weaponSystem.lastFireTime > performance.now() - 500);
      this.policeSystem.update(dt, this.player.position, this.player.currentVehicle);
      this.weaponSystem.update(dt);
      this.missionManager.update(dt, this.player, this.vehicleManager);
      this.hud.update(
        this.player,
        this.weaponSystem,
        this.policeSystem,
        this.missionManager,
        this.world,
        this.vehicleManager
      );

      // Reset mouse delta frame
      this.mouseMove.x = 0;
      this.mouseMove.y = 0;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Bootstrap on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
