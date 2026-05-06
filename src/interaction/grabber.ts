import * as THREE from "three";
import type { SoftBodySolver } from "../simulation/solver";

type GrabberOptions = {
  domElement: HTMLElement;
  camera: THREE.Camera;
  visualObject: THREE.Object3D;
  solver: SoftBodySolver;
  setControlsEnabled?: (enabled: boolean) => void;
  requestRunSimulation?: () => void;
};

export class Grabber {
  private readonly domElement: HTMLElement;
  private readonly camera: THREE.Camera;
  private readonly visualObject: THREE.Object3D;
  private readonly solver: SoftBodySolver;
  private readonly setControlsEnabled?: (enabled: boolean) => void;
  private readonly requestRunSimulation?: () => void;

  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();

  private readonly dragPlane = new THREE.Plane();
  private readonly dragPoint = new THREE.Vector3();

  private readonly localPoint = new THREE.Vector3();
  private readonly prevLocalPoint = new THREE.Vector3();
  private readonly grabVelocity = new THREE.Vector3();

  private readonly cameraDirection = new THREE.Vector3();

  private dragging = false;
  private pointerId: number | null = null;
  private lastTime = 0.0;

  constructor(options: GrabberOptions) {
    this.domElement = options.domElement;
    this.camera = options.camera;
    this.visualObject = options.visualObject;
    this.solver = options.solver;
    this.setControlsEnabled = options.setControlsEnabled;
    this.requestRunSimulation = options.requestRunSimulation;

    this.domElement.addEventListener("pointerdown", this.onPointerDown, true);
    this.domElement.addEventListener("pointermove", this.onPointerMove, true);
    this.domElement.addEventListener("pointerup", this.onPointerUp, true);
    this.domElement.addEventListener(
      "pointercancel",
      this.onPointerCancel,
      true,
    );
  }

  dispose() {
    this.cancel();

    this.domElement.removeEventListener(
      "pointerdown",
      this.onPointerDown,
      true,
    );
    this.domElement.removeEventListener(
      "pointermove",
      this.onPointerMove,
      true,
    );
    this.domElement.removeEventListener("pointerup", this.onPointerUp, true);
    this.domElement.removeEventListener(
      "pointercancel",
      this.onPointerCancel,
      true,
    );
  }

  cancel() {
    if (!this.dragging) {
      return;
    }

    this.dragging = false;
    this.pointerId = null;

    this.solver.grab.cancel();
    this.setControlsEnabled?.(true);
  }

  private onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }

    this.updatePointer(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hits = this.raycaster.intersectObject(this.visualObject, true);
    if (hits.length == 0) {
      return;
    }

    const hit = hits[0];

    this.localPoint.copy(hit.point);
    this.visualObject.worldToLocal(this.localPoint);
    this.prevLocalPoint.copy(this.localPoint);
    this.grabVelocity.set(0.0, 0.0, 0.0);

    const grabbed = this.solver.grab.start(this.localPoint, 0.25);
    if (!grabbed) {
      return;
    }

    this.dragging = true;
    this.pointerId = event.pointerId;
    this.lastTime = performance.now();

    this.camera.getWorldDirection(this.cameraDirection);
    this.dragPlane.setFromNormalAndCoplanarPoint(
      this.cameraDirection,
      hit.point,
    );

    this.domElement.setPointerCapture(event.pointerId);
    this.setControlsEnabled?.(false);
    this.requestRunSimulation?.();

    event.preventDefault();
    
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.dragging || event.pointerId !== this.pointerId) {
      return;
    }

    this.updatePointer(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hit = this.raycaster.ray.intersectPlane(
      this.dragPlane,
      this.dragPoint,
    );
    if (hit === null) {
      return;
    }

    const now = performance.now();
    const dt = Math.max((now - this.lastTime) / 1000.0, 1e-6);
    this.lastTime = now;

    this.prevLocalPoint.copy(this.localPoint);
    this.localPoint.copy(this.dragPoint);
    this.visualObject.worldToLocal(this.localPoint);
    this.grabVelocity
      .copy(this.localPoint)
      .sub(this.prevLocalPoint)
      .multiplyScalar(1.0 / dt);

    this.solver.grab.move(this.localPoint, this.grabVelocity);

    event.preventDefault();
    
  };

  private onPointerUp = (event: PointerEvent) => {
    if (!this.dragging || event.pointerId !== this.pointerId) {
      return;
    }

    this.dragging = false;
    this.pointerId = null;

    this.solver.grab.end(this.grabVelocity);
    this.setControlsEnabled?.(true);

    if (this.domElement.hasPointerCapture(event.pointerId)) {
      this.domElement.releasePointerCapture(event.pointerId);
    }

    event.preventDefault();
    
  };

  private onPointerCancel = (event: PointerEvent) => {
    if (!this.dragging || event.pointerId !== this.pointerId) {
      return;
    }

    this.cancel();

    if (this.domElement.hasPointerCapture(event.pointerId)) {
      this.domElement.releasePointerCapture(event.pointerId);
    }

    event.preventDefault();
    
  };

  private updatePointer(event: PointerEvent) {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = (2.0 * (event.clientX - rect.left)) / rect.width - 1.0;
    this.pointer.y = -((2.0 * (event.clientY - rect.top)) / rect.height - 1.0);
  }
}
