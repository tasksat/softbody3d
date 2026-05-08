import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ViewHelper } from "three/addons/helpers/ViewHelper.js";

export class SceneView {
  private scene: THREE.Scene;

  private camera: THREE.PerspectiveCamera;
  private readonly initialCameraPosition = new THREE.Vector3(0.0, 1.0, 4.0);
  private readonly initialControlsTarget = new THREE.Vector3(0.0, 0.0, 0.0);

  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private viewHelper: ViewHelper;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color().setRGB(0.0, 0.0, 0.0);

    // Camera

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.05,
      50,
    );
    this.camera.position.copy(this.initialCameraPosition);
    this.camera.lookAt(this.initialControlsTarget);
    this.scene.add(this.camera);

    // Renderer

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.autoClear = false;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    // Controls

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.initialControlsTarget);
    this.controls.zoomSpeed = 2.0;
    this.controls.panSpeed = 1.0;
    this.controls.enableDamping = true;
    this.controls.maxDistance = 40.0;

    // View Helper

    this.viewHelper = new ViewHelper(this.camera, this.renderer.domElement);
    this.viewHelper.location = {
      bottom: 20,
      right: 20,
      top: null,
      left: null,
    };
    this.viewHelper.setLabels("X", "Y", "Z");
    this.renderer.domElement.addEventListener("pointerup", this.onPointerUp);

    // Setup

    this.addLights();
    this.addFloor();
    this.addHelper();

    window.addEventListener("resize", this.onResize);
  }

  update() {
    this.controls.update();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    this.viewHelper.render(this.renderer);
  }

  resetCamera() {
    this.camera.position.copy(this.initialCameraPosition);
    this.camera.lookAt(this.initialControlsTarget);
    this.controls.target.copy(this.initialControlsTarget);
    this.controls.update();
    this.camera.updateMatrixWorld();
  }

  addObject(object: THREE.Object3D) {
    this.scene.add(object);
  }

  removeObject(object: THREE.Object3D) {
    this.scene.remove(object);
  }

  setControlsEnabled(enabled: boolean) {
    this.controls.enabled = enabled;
  }

  private onPointerUp = (event: PointerEvent) => {
    this.viewHelper.handleClick(event);
  };

  private addLights() {
    // Ambient Light

    const ambient = new THREE.AmbientLight(0x505050);
    this.scene.add(ambient);

    // Directional Light

    const directional = new THREE.DirectionalLight(0x55505a);
    directional.position.set(0.0, 3.0, 0.0);
    directional.castShadow = true;
    directional.shadow.camera.near = 1;
    directional.shadow.camera.far = 10;
    directional.shadow.camera.right = 1;
    directional.shadow.camera.left = -1;
    directional.shadow.camera.top = 1;
    directional.shadow.camera.bottom = -1;
    directional.shadow.mapSize.set(1024, 1024);
    this.scene.add(directional);

    // Spot Light

    const spotLight = new THREE.SpotLight(0xffffff, 10.0);
    spotLight.angle = Math.PI / 5;
    spotLight.penumbra = 0.2;
    spotLight.position.set(2.0, 3.0, 3.0);
    spotLight.castShadow = true;
    spotLight.shadow.camera.near = 3;
    spotLight.shadow.camera.far = 10;
    spotLight.shadow.mapSize.set(1024, 1024);
    this.scene.add(spotLight);

    const cornerLightTarget = new THREE.Object3D();
    cornerLightTarget.position.set(0.0, 2.5, 0.0);
    this.scene.add(cornerLightTarget);

    // Corner Light

    const cornerLightPositions = [
      [-10.0, 0.1, -10.0],
      [10.0, 0.1, -10.0],
      [-10.0, 0.1, 10.0],
      [10.0, 0.1, 10.0],
    ] as const;

    for (const [x, y, z] of cornerLightPositions) {
      const light = new THREE.SpotLight(0xffe6b0, 8.0);

      light.position.set(x, y, z);
      light.target = cornerLightTarget;

      light.angle = Math.PI / 3;
      light.penumbra = 0.1;
      light.distance = 12;
      light.decay = 0.5;
      light.castShadow = false;

      this.scene.add(light);
    }
  }

  private addFloor() {
    const geometry = new THREE.PlaneGeometry(20.0, 20.0);
    const material = new THREE.MeshPhongMaterial({
      color: 0xa0adaf,
      shininess: 1000,
    });
    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2.0;
    floor.position.y = 0.0;
    floor.receiveShadow = true;

    this.scene.add(floor);
  }

  private addHelper() {
    const grid = new THREE.GridHelper(20.0, 20, 0xaaaaaa, 0xaaaaaa);
    grid.position.set(0.0, 0.005, 0.0);
    this.scene.add(grid);
  }

  private onResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
  };

  // API for Grabber

  getCamera() {
    return this.camera;
  }

  getDomElement() {
    return this.renderer.domElement;
  }
}
