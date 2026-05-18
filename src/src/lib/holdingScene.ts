import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';

export const createHoldingScene = (container: HTMLElement) => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020205);
  scene.fog = new THREE.FogExp2(0x020205, 0.0015);

  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(200, 150, 200);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Lights
  const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0x00ffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0x00ffff, 1, 500);
  pointLight.position.set(0, 100, 0);
  scene.add(pointLight);

  // Corporate Office Towers
  const officeGroup = new THREE.Group();
  const offices: { [id: string]: THREE.Mesh } = {};
  const officeMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x111111,
    specular: 0x00ffff,
    shininess: 30
  });
  
  const nodeIds = ["finance_corp", "technova", "healthbridge", "aerodynamics", "greenenergy"];
  
  nodeIds.forEach((id, i) => {
    const w = 20;
    const h = 80 + Math.random() * 60;
    const d = 20;
    const geometry = new THREE.BoxGeometry(w, h, d);
    const office = new THREE.Mesh(geometry, officeMaterial.clone());
    
    const angle = (i / nodeIds.length) * Math.PI * 2;
    office.position.x = Math.cos(angle) * 120;
    office.position.z = Math.sin(angle) * 120;
    office.position.y = h / 2;
    office.userData = { id, type: 'subsidiary' };
    
    // Glass facade effect
    const glassGeo = new THREE.BoxGeometry(w + 0.5, h + 0.5, d + 0.5);
    const glassMat = new THREE.MeshPhongMaterial({ 
      color: 0x00ffff, 
      transparent: true, 
      opacity: 0.1,
      wireframe: true
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    office.add(glass);

    // Corporate Logo placeholder (glowing cube on top)
    const logoGeo = new THREE.BoxGeometry(5, 5, 5);
    const logoMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const logo = new THREE.Mesh(logoGeo, logoMat);
    logo.position.y = h / 2 + 5;
    office.add(logo);

    officeGroup.add(office);
    offices[id] = office;
  });

  // Background "City" of other companies
  for (let i = 0; i < 60; i++) {
    const w = Math.random() * 10 + 5;
    const h = Math.random() * 50 + 10;
    const d = Math.random() * 10 + 5;
    const geometry = new THREE.BoxGeometry(w, h, d);
    const building = new THREE.Mesh(geometry, officeMaterial);
    building.position.x = (Math.random() - 0.5) * 400;
    building.position.z = (Math.random() - 0.5) * 400;
    
    // Avoid center
    if (Math.abs(building.position.x) < 50 && Math.abs(building.position.z) < 50) {
      building.position.x += 100;
    }
    
    building.position.y = h / 2;
    officeGroup.add(building);
  }
  scene.add(officeGroup);

  // Internal Office View Group (Workstations)
  const internalGroup = new THREE.Group();
  internalGroup.visible = false;
  scene.add(internalGroup);

  const createInternalView = (nodeId: string, underAttackDeviceId?: string) => {
    internalGroup.clear();
    
    // Floor plane
    const floorGeo = new THREE.PlaneGeometry(300, 300);
    const floorMat = new THREE.MeshPhongMaterial({ color: 0x050508, transparent: true, opacity: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5;
    internalGroup.add(floor);

    // Central Gateway / Core Switch
    const gatewayGeo = new THREE.OctahedronGeometry(10);
    const gatewayMat = new THREE.MeshPhongMaterial({ 
      color: 0x00ffff, 
      emissive: 0x00ffff, 
      emissiveIntensity: 0.5,
      wireframe: true 
    });
    const gateway = new THREE.Mesh(gatewayGeo, gatewayMat);
    gateway.position.set(0, 40, 0);
    gateway.userData = { isGateway: true };
    internalGroup.add(gateway);

    // Gateway Glow
    const glowGeo = new THREE.SphereGeometry(12);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.1 });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    gateway.add(glow);

    // Create a grid of "Workstations"
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        const wsGroup = new THREE.Group();
        const posX = x * 50;
        const posZ = z * 50;
        wsGroup.position.set(posX, 0, posZ);
        
        // Desk
        const deskGeo = new THREE.BoxGeometry(25, 2, 15);
        const deskMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
        const desk = new THREE.Mesh(deskGeo, deskMat);
        desk.position.y = 10;
        wsGroup.add(desk);

        // Monitor
        const isTarget = underAttackDeviceId && (
          // Simple heuristic to match target device ID visually
          (x === 0 && z === 0) || Math.random() > 0.95
        );
        
        const monGeo = new THREE.BoxGeometry(12, 8, 1);
        const monMat = new THREE.MeshPhongMaterial({ 
          color: isTarget ? 0xff0000 : 0x0a0a0a,
          emissive: isTarget ? 0xff0000 : 0x00ffff,
          emissiveIntensity: isTarget ? 1 : 0.05
        });
        const monitor = new THREE.Mesh(monGeo, monMat);
        monitor.position.set(0, 16, -5);
        wsGroup.add(monitor);

        // PC Tower
        const pcGeo = new THREE.BoxGeometry(4, 10, 10);
        const pcMat = new THREE.MeshPhongMaterial({ color: 0x0a0a0a });
        const pc = new THREE.Mesh(pcGeo, pcMat);
        pc.position.set(10, 5, 0);
        wsGroup.add(pc);

        // Status light on PC
        const lightGeo = new THREE.SphereGeometry(0.4);
        const lightMat = new THREE.MeshBasicMaterial({ color: isTarget ? 0xff0000 : 0x00ff00 });
        const light = new THREE.Mesh(lightGeo, lightMat);
        light.position.set(10, 8, 5.1);
        wsGroup.add(light);

        internalGroup.add(wsGroup);

        // Network Connection Line to Gateway
        const points = [
          new THREE.Vector3(posX, 10, posZ),
          new THREE.Vector3(posX * 0.5, 25, posZ * 0.5),
          new THREE.Vector3(0, 40, 0)
        ];
        const curve = new THREE.CatmullRomCurve3(points);
        const curvePoints = curve.getPoints(20);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
        const lineMat = new THREE.LineBasicMaterial({ 
          color: isTarget ? 0xff0000 : 0x00ffff, 
          transparent: true, 
          opacity: isTarget ? 0.8 : 0.2 
        });
        const line = new THREE.Line(lineGeo, lineMat);
        internalGroup.add(line);

        // Data packet animation on line
        if (Math.random() > 0.7 || isTarget) {
          const packetGeo = new THREE.SphereGeometry(0.5);
          const packetMat = new THREE.MeshBasicMaterial({ color: isTarget ? 0xff0000 : 0x00ffff });
          const packet = new THREE.Mesh(packetGeo, packetMat);
          internalGroup.add(packet);
          
          const duration = isTarget ? 800 : 2000 + Math.random() * 2000;
          new TWEEN.Tween({ t: 0 })
            .to({ t: 1 }, duration)
            .repeat(Infinity)
            .onUpdate((obj) => {
              const pos = curve.getPoint(obj.t);
              packet.position.copy(pos);
            })
            .start();
        }
      }
    }

    // Floating Corporate Data Particles
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 1000;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 200;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0x00ffff, size: 0.8, transparent: true, opacity: 0.3 });
    const particles = new THREE.Points(particleGeo, particleMat);
    internalGroup.add(particles);
  };

  // Ground Grid (Corporate Data Grid)
  const gridHelper = new THREE.GridHelper(800, 40, 0x00ffff, 0x050505);
  scene.add(gridHelper);

  const trafficLines: THREE.Line[] = [];
  const lineMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.6 });

  const addTrafficLine = (startId: string, endId: string, type: 'normal' | 'suspicious' | 'attack', size: number) => {
    const startNode = offices[startId];
    const endNode = offices[endId];
    if (!startNode || !endNode) return;

    const start = startNode.position.clone();
    const end = endNode.position.clone();
    
    // Corporate data lines are more direct but have a slight arc
    const points = [start, end.clone().lerp(start, 0.5).add(new THREE.Vector3(0, 30, 0)), end];
    const curve = new THREE.CatmullRomCurve3(points);
    const curvePoints = curve.getPoints(30);
    
    const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
    
    const color = type === 'attack' ? 0xff0000 : type === 'suspicious' ? 0xffff00 : 0x00ffff;
    // Intensity based on size
    const baseOpacity = Math.min(0.3 + (size / 1500), 1.0);
    
    const mat = new THREE.LineBasicMaterial({ 
      color, 
      transparent: true, 
      opacity: baseOpacity 
    });
    
    const line = new THREE.Line(geometry, mat);
    scene.add(line);
    trafficLines.push(line);

    // Pulsate animation
    const pulseSpeed = type === 'attack' ? 150 : type === 'suspicious' ? 300 : 500;
    const pulseTween = new TWEEN.Tween(mat)
      .to({ opacity: baseOpacity * 0.2 }, pulseSpeed)
      .repeat(Infinity)
      .yoyo(true)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();

    setTimeout(() => {
      pulseTween.stop();
      scene.remove(line);
      const index = trafficLines.indexOf(line);
      if (index > -1) trafficLines.splice(index, 1);
      mat.dispose();
      geometry.dispose();
    }, 2000);
  };

  const focusOnNode = (nodeId: string, zoomIn: boolean = true) => {
    const targetNode = offices[nodeId];
    if (!targetNode) return;

    const targetPos = zoomIn 
      ? targetNode.position.clone().add(new THREE.Vector3(60, 60, 60))
      : new THREE.Vector3(200, 150, 200);
    
    new TWEEN.Tween(camera.position)
      .to({ x: targetPos.x, y: targetPos.y, z: targetPos.z }, 1500)
      .easing(TWEEN.Easing.Cubic.Out)
      .onUpdate(() => {
        camera.lookAt(zoomIn ? targetNode.position : new THREE.Vector3(0,0,0));
      })
      .start();
  };

  const setViewMode = (mode: 'holding' | 'node', nodeId?: string, targetDeviceId?: string) => {
    if (mode === 'node' && nodeId) {
      officeGroup.visible = false;
      gridHelper.visible = false;
      internalGroup.visible = true;
      createInternalView(nodeId, targetDeviceId);
      
      new TWEEN.Tween(camera.position)
        .to({ x: 120, y: 100, z: 120 }, 1500)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(() => camera.lookAt(0,0,0))
        .start();
    } else {
      officeGroup.visible = true;
      gridHelper.visible = true;
      internalGroup.visible = false;
      
      new TWEEN.Tween(camera.position)
        .to({ x: 200, y: 150, z: 200 }, 1500)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(() => camera.lookAt(0,0,0))
        .start();
    }
  };

  const animate = (time: number) => {
    requestAnimationFrame(animate);
    TWEEN.update(time);
    if (officeGroup.visible) {
      officeGroup.rotation.y += 0.0003;
    }
    if (internalGroup.visible) {
      internalGroup.rotation.y += 0.002;
      internalGroup.children.forEach(child => {
        if (child.userData.isGateway) {
          child.rotation.y += 0.02;
          child.rotation.x += 0.01;
        }
      });
    }
    renderer.render(scene, camera);
  };

  animate(0);

  const onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };

  window.addEventListener('resize', onResize);

  return {
    addTrafficLine,
    focusOnNode,
    setViewMode,
    cleanup: () => {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    }
  };
};
