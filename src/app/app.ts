import { SceneView } from "../render/scene";
import { loadVisualMeshPLY } from "../loaders/visloader";
import { loadTetMeshJson } from "../loaders/simloader";
import { TetMeshRenderer } from "../render/wireframe";
import { MeshRenderer } from "../render/mesh";
import { Gui } from "../ui/gui";
import { Grabber } from "../interaction/grabber";
import { findMeshAsset, meshAssets, type MeshAsset } from "../config/meshes";
import { SoftBodySolver } from "../simulation/solver";
import { VisualSkinner } from "../simulation/skinner";

type AppOptions = {
  initialMesh: MeshAsset;
  initialWireframeVisibility: boolean;
  initialRunning: boolean;
  initialEdgeCompliance: number;
  initialVolCompliance: number;
};

export class App {
  private readonly options: AppOptions;

  private sceneView: SceneView;
  private meshRenderer: MeshRenderer | null = null;
  private tetMeshRenderer: TetMeshRenderer | null = null;

  private gui: Gui;

  private readonly fpsElement = document.getElementById("stats-fps");
  private readonly visVertsElement = document.getElementById("stats-vis-verts");
  private readonly visFacesElement = document.getElementById("stats-vis-faces");
  private readonly simVertsElement = document.getElementById("stats-sim-verts");
  private readonly simEdgesElement = document.getElementById("stats-sim-edges");
  private readonly simTetsElement = document.getElementById("stats-sim-tets");

  private frameCount = 0;
  private fpsLastTime = performance.now();
  private fps = 0.0;

  private grabber: Grabber | null = null;

  private loadingMesh = false;

  private showWireframe = false;

  private solver: SoftBodySolver | null = null;
  private simulationRunning: boolean;
  private edgeCompliance = 0.0;
  private volCompliance = 0.0;

  private skinner: VisualSkinner | null = null;
  private visPos: Float32Array | null = null;

  constructor(options: AppOptions) {
    this.options = options;

    this.sceneView = new SceneView();

    this.showWireframe = options.initialWireframeVisibility;
    this.simulationRunning = options.initialRunning;

    this.gui = new Gui({
      meshAssets,
      initialMeshId: this.options.initialMesh.id,
      initialWireframeVisibility: this.options.initialWireframeVisibility,
      initialRunning: this.options.initialRunning,
      initialEdgeCompliance: this.options.initialEdgeCompliance,
      callbacks: {
        resetCamera: () => this.sceneView.resetCamera(),
        selectMesh: (id: string) => {
          this.switchMesh(id).catch((error: unknown) => {
            console.error("Failed to switch mesh:", error);
          });
        },
        setWireframeVisibility: (visible: boolean) => {
          this.showWireframe = visible;
          this.tetMeshRenderer?.setVisible(visible);
        },
        resetSimulation: () => this.resetSimulation(),
        setSimulationRunning: (running: boolean) => {
          this.setSimulationRunning(running);
        },
        setEdgeCompliance: (value: number) => {
          this.edgeCompliance = value;
          this.solver?.setEdgeCompliance(value);
        },
      },
    });
  }

  async start() {
    await this.loadMesh(this.options.initialMesh);
    this.animate();
  }

  dispose() {
    this.grabber?.dispose();
    this.grabber = null;
    this.meshRenderer?.dispose();
    this.tetMeshRenderer?.dispose();
    this.gui.dispose();
  }

  private resetSimulation() {
    this.grabber?.cancel();
    this.solver?.reset();
    this.setSimulationRunning(false);
    this.gui.setSimulationRunning(false);
    if (this.solver !== null && this.tetMeshRenderer !== null) {
      this.tetMeshRenderer.update(this.solver.positions);
    }
    if (
      this.solver !== null &&
      this.skinner !== null &&
      this.visPos !== null &&
      this.meshRenderer !== null
    ) {
      this.skinner.update(this.visPos, this.solver.positions);
      this.meshRenderer.update();
    }
  }

  private setSimulationRunning(running: boolean) {
    this.simulationRunning = running;
  }

  private async switchMesh(id: string) {
    if (this.loadingMesh) {
      return;
    }

    this.loadingMesh = true;

    try {
      const asset = findMeshAsset(id);
      await this.loadMesh(asset);
    } finally {
      this.loadingMesh = false;
    }
  }

  private updateFPS(now: number) {
    this.frameCount++;

    const elapsed = now - this.fpsLastTime;
    if (elapsed < 100.0) {
      return;
    }

    this.fps = (1000.0 * this.frameCount) / elapsed;
    if (this.fpsElement !== null) {
      this.fpsElement.textContent = this.fps.toFixed(1);
    }

    this.frameCount = 0;
    this.fpsLastTime = now;
  }

  private async loadMesh(asset: MeshAsset) {
    this.grabber?.dispose();
    this.grabber = null;

    const meshData = await loadVisualMeshPLY(asset.visPath, asset.target);

    if (this.meshRenderer !== null) {
      this.sceneView.removeObject(this.meshRenderer.getObject3D());
      this.meshRenderer.dispose();
      this.meshRenderer = null;
      this.skinner = null;
      this.visPos = null;
    }

    if (this.tetMeshRenderer !== null) {
      this.sceneView.removeObject(this.tetMeshRenderer.getObject3D());
      this.tetMeshRenderer.dispose();
      this.tetMeshRenderer = null;
    }

    if (this.visVertsElement !== null) {
      this.visVertsElement.textContent = String(meshData.positions.length / 3);
    }

    if (this.visFacesElement !== null) {
      this.visFacesElement.textContent = String(meshData.indices.length / 3);
    }

    this.meshRenderer = new MeshRenderer(meshData);
    this.sceneView.addObject(this.meshRenderer.getObject3D());
    if (asset.simPath !== undefined) {
      const tetMeshData = await loadTetMeshJson(
        asset.simPath,
        meshData.transform,
      );

      if (this.simVertsElement !== null) {
        this.simVertsElement.textContent = String(tetMeshData.verts.length / 3);
      }
      if (this.simEdgesElement !== null) {
        this.simEdgesElement.textContent = String(
          tetMeshData.edgeIds.length / 2,
        );
      }
      if (this.simTetsElement !== null) {
        this.simTetsElement.textContent = String(tetMeshData.tetIds.length / 4);
      }

      this.solver = new SoftBodySolver(tetMeshData, {
        dt: 1.0 / 60.0,
        substeps: 8,
        iterations: 1,
        gravity: new Float32Array([0.0, -9.8, 0.0]),
        damping: 0.0,
        volCompliance: this.volCompliance,
        edgeCompliance: this.edgeCompliance,
      });

      this.tetMeshRenderer = new TetMeshRenderer(tetMeshData);
      this.tetMeshRenderer.setVisible(this.showWireframe);
      this.sceneView.addObject(this.tetMeshRenderer.getObject3D());

      this.visPos = meshData.positions;
      this.skinner = new VisualSkinner(
        meshData.positions,
        tetMeshData.verts,
        tetMeshData.tetIds,
      );

      if (this.meshRenderer !== null && this.solver !== null) {
        this.grabber = new Grabber({
          camera: this.sceneView.getCamera(),
          domElement: this.sceneView.getDomElement(),
          visualObject: this.meshRenderer.getObject3D(),
          solver: this.solver,
          setControlsEnabled: (enabled: boolean) => {
            this.sceneView.setControlsEnabled(enabled);
          },
          requestRunSimulation: () => {
            this.setSimulationRunning(true);
            this.gui.setSimulationRunning(true);
          },
        });
      }
    }
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    this.updateFPS(now);

    if (this.simulationRunning && this.solver !== null) {
      this.solver.simulate();
      if (this.tetMeshRenderer !== null) {
        this.tetMeshRenderer.update(this.solver.positions);
      }
      if (
        this.skinner !== null &&
        this.visPos !== null &&
        this.meshRenderer !== null
      ) {
        this.skinner.update(this.visPos, this.solver.positions);
        this.meshRenderer.update();
      }
    }

    this.sceneView.update();
    this.sceneView.render();
  };
}
