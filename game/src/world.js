// Procedural 3D City Builder for Vice City Shadows
// Constructs roads, intersections, sidewalks, palm trees, skyscrapers, neon signs, and collision bounds.
import * as THREE from 'three';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // AABB bounding boxes { minX, maxX, minZ, maxZ, mesh }
    this.roadSegments = [];
    this.spawnPoints = [];
    this.trafficWaypoints = [];
    this.citySize = 400; // 400m x 400m urban grid
    this.blockSize = 70;
    this.roadWidth = 14;

    this.buildAtmosphere();
    this.buildGroundAndRoads();
    this.buildCityBlocks();
    this.buildStreetFurniture();
  }

  buildAtmosphere() {
    // Sun-soaked Miami / Vice City tropical lighting
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.7);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.4);
    sunLight.position.set(120, 180, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 400;
    const d = 160;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    this.scene.add(sunLight);

    // Warm tropical sky and fog
    this.scene.background = new THREE.Color(0xf6aa88);
    this.scene.fog = new THREE.FogExp2(0xf6aa88, 0.0035);
  }

  buildGroundAndRoads() {
    // Ocean on the eastern edge
    const oceanGeo = new THREE.PlaneGeometry(160, 600);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0088aa,
      roughness: 0.1,
      metalness: 0.8,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(240, -0.2, 0);
    this.scene.add(ocean);

    // Sandy Beach Strip
    const beachGeo = new THREE.PlaneGeometry(50, 600);
    const beachMat = new THREE.MeshStandardMaterial({ color: 0xedd6af, roughness: 0.9 });
    const beach = new THREE.Mesh(beachGeo, beachMat);
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(155, -0.05, 0);
    this.scene.add(beach);

    // Asphalt Ground Plane for City
    const groundGeo = new THREE.PlaneGeometry(this.citySize, this.citySize);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x222428,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Build Road Grid and Traffic Waypoints
    const step = this.blockSize;
    const half = this.citySize / 2;

    // Road markings & crosswalk materials
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf5b041 }); // Yellow center divider
    const zebraMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // White crosswalk lines

    for (let x = -half + step / 2; x <= half - step / 2; x += step) {
      // North-South Avenue
      const roadGeo = new THREE.PlaneGeometry(this.roadWidth, this.citySize);
      const roadMesh = new THREE.Mesh(roadGeo, groundMat);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.position.set(x, 0.01, 0);
      this.scene.add(roadMesh);

      // Yellow Center Line
      const lineGeo = new THREE.PlaneGeometry(0.3, this.citySize);
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.02, 0);
      this.scene.add(line);

      // Traffic Waypoint Lanes (Left lane -Z, Right lane +Z)
      this.trafficWaypoints.push({
        start: new THREE.Vector3(x - 3.2, 0, -half),
        end: new THREE.Vector3(x - 3.2, 0, half),
        dir: new THREE.Vector3(0, 0, 1),
      });
      this.trafficWaypoints.push({
        start: new THREE.Vector3(x + 3.2, 0, half),
        end: new THREE.Vector3(x + 3.2, 0, -half),
        dir: new THREE.Vector3(0, 0, -1),
      });
    }

    for (let z = -half + step / 2; z <= half - step / 2; z += step) {
      // East-West Boulevard
      const roadGeo = new THREE.PlaneGeometry(this.citySize, this.roadWidth);
      const roadMesh = new THREE.Mesh(roadGeo, groundMat);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.position.set(0, 0.015, z);
      this.scene.add(roadMesh);

      // Center Divider
      const lineGeo = new THREE.PlaneGeometry(this.citySize, 0.3);
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.025, z);
      this.scene.add(line);

      // Traffic Waypoints (East/West)
      this.trafficWaypoints.push({
        start: new THREE.Vector3(-half, 0, z - 3.2),
        end: new THREE.Vector3(half, 0, z - 3.2),
        dir: new THREE.Vector3(1, 0, 0),
      });
      this.trafficWaypoints.push({
        start: new THREE.Vector3(half, 0, z + 3.2),
        end: new THREE.Vector3(-half, 0, z + 3.2),
        dir: new THREE.Vector3(-1, 0, 0),
      });

      // Add Pedestrian Zebra Crosswalks at intersections
      for (let x = -half + step / 2; x <= half - step / 2; x += step) {
        this.addCrosswalk(x, z, zebraMat);
      }
    }
  }

  addCrosswalk(x, z, mat) {
    const offsets = [
      { dx: 0, dz: this.roadWidth / 2 + 1.2, rot: 0 },
      { dx: 0, dz: -(this.roadWidth / 2 + 1.2), rot: 0 },
      { dx: this.roadWidth / 2 + 1.2, dz: 0, rot: Math.PI / 2 },
      { dx: -(this.roadWidth / 2 + 1.2), dz: 0, rot: Math.PI / 2 },
    ];
    offsets.forEach((o) => {
      for (let s = -4; s <= 4; s += 1.4) {
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 3.2), mat);
        strip.rotation.x = -Math.PI / 2;
        strip.rotation.z = o.rot;
        if (o.rot === 0) {
          strip.position.set(x + s, 0.03, z + o.dz);
        } else {
          strip.position.set(x + o.dx, 0.03, z + s);
        }
        this.scene.add(strip);
      }
    });
  }

  buildCityBlocks() {
    const step = this.blockSize;
    const half = this.citySize / 2;
    const sidewalkWidth = (step - this.roadWidth) / 2;

    const buildingColors = [
      0xf8e9d2, 0xd0e1fd, 0xfce4ec, 0xe0f2f1, 0xfff3e0, 0x37474f, 0x455a64, 0x263238
    ];
    const neonColors = [0xff007f, 0x00f0ff, 0xffd700, 0x39ff14, 0x9400d3];

    // Neon signs label database
    const neonLabels = [
      'VICE SHADOWS', 'CLUB TROPICANA', 'DYNASTY BANK', 'OCEAN VIEW',
      'HOTEL HAVANA', 'NEON NIGHTS', 'SOUTH BEACH BAR', 'PALM RESORT'
    ];
    let labelIdx = 0;

    for (let x = -half + step; x < half; x += step) {
      for (let z = -half + step; z < half; z += step) {
        // Concrete Sidewalk Block
        const sideGeo = new THREE.BoxGeometry(step - this.roadWidth - 1, 0.4, step - this.roadWidth - 1);
        const sideMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.9 });
        const sidewalk = new THREE.Mesh(sideGeo, sideMat);
        sidewalk.position.set(x, 0.2, z);
        sidewalk.receiveShadow = true;
        this.scene.add(sidewalk);

        // Procedural Skyscrapers / Buildings inside the block
        const count = 2 + Math.floor(Math.random() * 3);
        const subWidth = (step - this.roadWidth - 6) / 2;

        const positions = [
          { x: x - subWidth / 2, z: z - subWidth / 2 },
          { x: x + subWidth / 2, z: z - subWidth / 2 },
          { x: x - subWidth / 2, z: z + subWidth / 2 },
          { x: x + subWidth / 2, z: z + subWidth / 2 },
        ];

        for (let i = 0; i < count; i++) {
          const pos = positions[i];
          const height = 18 + Math.random() * 55;
          const w = subWidth - 2;
          const d = subWidth - 2;

          const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];
          const bMat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.4,
            metalness: 0.3,
          });
          const bGeo = new THREE.BoxGeometry(w, height, d);
          const bMesh = new THREE.Mesh(bGeo, bMat);
          bMesh.position.set(pos.x, height / 2 + 0.4, pos.z);
          bMesh.castShadow = true;
          bMesh.receiveShadow = true;
          this.scene.add(bMesh);

          // Add windows rows
          this.addWindowDetails(bMesh, w, height, d);

          // Register collision box
          this.colliders.push({
            minX: pos.x - w / 2,
            maxX: pos.x + w / 2,
            minZ: pos.z - d / 2,
            maxZ: pos.z + d / 2,
            height: height,
          });

          // Add rooftop or facade neon sign occasionally
          if (Math.random() < 0.4) {
            const neonCol = neonColors[Math.floor(Math.random() * neonColors.length)];
            const signGeo = new THREE.BoxGeometry(w * 0.7, 2, 0.4);
            const signMat = new THREE.MeshBasicMaterial({ color: neonCol });
            const sign = new THREE.Mesh(signGeo, signMat);
            sign.position.set(pos.x, height + 1.2, pos.z + d / 2 + 0.2);
            this.scene.add(sign);
          }
        }
      }
    }
  }

  addWindowDetails(building, w, h, d) {
    const windowMat = new THREE.MeshBasicMaterial({ color: 0x81d4fa });
    const floors = Math.floor(h / 3);
    for (let f = 1; f < floors; f++) {
      const y = f * 3 - h / 2;
      // Front strip
      const stripGeo = new THREE.PlaneGeometry(w * 0.8, 0.9);
      const stripFront = new THREE.Mesh(stripGeo, windowMat);
      stripFront.position.set(0, y, d / 2 + 0.05);
      building.add(stripFront);

      const stripBack = new THREE.Mesh(stripGeo, windowMat);
      stripBack.rotation.y = Math.PI;
      stripBack.position.set(0, y, -d / 2 - 0.05);
      building.add(stripBack);
    }
  }

  buildStreetFurniture() {
    const step = this.blockSize;
    const half = this.citySize / 2;

    for (let x = -half + step / 2; x <= half - step / 2; x += step) {
      for (let z = -half + step / 2; z <= half - step / 2; z += step) {
        // Place palm trees along sidewalks
        const treeOffsets = [
          { x: x + this.roadWidth / 2 + 2, z: z + 12 },
          { x: x - this.roadWidth / 2 - 2, z: z + 12 },
          { x: x + this.roadWidth / 2 + 2, z: z - 12 },
          { x: x - this.roadWidth / 2 - 2, z: z - 12 },
        ];
        treeOffsets.forEach((to) => {
          if (Math.abs(to.x) < half - 10 && Math.abs(to.z) < half - 10) {
            this.addPalmTree(to.x, to.z);
          }
        });

        // Place street lights at corner sidewalks
        this.addStreetLamp(x + this.roadWidth / 2 + 1.5, z + this.roadWidth / 2 + 1.5);
        this.addStreetLamp(x - this.roadWidth / 2 - 1.5, z - this.roadWidth / 2 - 1.5);
      }
    }
  }

  addPalmTree(x, z) {
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.4, 7, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 3.5, z);
    trunk.rotation.z = (Math.random() - 0.5) * 0.15;
    trunk.castShadow = true;
    this.scene.add(trunk);

    // Palm leaves crown
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.6 });
    for (let i = 0; i < 7; i++) {
      const leafGeo = new THREE.ConeGeometry(1.2, 3.5, 4);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      const angle = (i / 7) * Math.PI * 2;
      leaf.position.set(x + Math.cos(angle) * 1.5, 7, z + Math.sin(angle) * 1.5);
      leaf.rotation.z = Math.PI / 3;
      leaf.rotation.y = angle;
      leaf.castShadow = true;
      this.scene.add(leaf);
    }
  }

  addStreetLamp(x, z) {
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.12, 6, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.8 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 3, z);
    this.scene.add(pole);

    const lightGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff9c4 });
    const bulb = new THREE.Mesh(lightGeo, lightMat);
    bulb.position.set(x, 6, z);
    this.scene.add(bulb);
  }

  checkCollision(x, z, radius = 0.8) {
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (
        x + radius > c.minX &&
        x - radius < c.maxX &&
        z + radius > c.minZ &&
        z - radius < c.maxZ
      ) {
        return true;
      }
    }
    // Ocean barrier
    if (x > 180 || x < -200 || z > 200 || z < -200) {
      return true;
    }
    return false;
  }
}
