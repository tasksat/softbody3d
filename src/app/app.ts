import { SceneView } from "../render/scene";
import { loadVisualMeshPLY } from "../loaders/visloader";
import { loadTetMeshJson } from "../loaders/simloader";
import { TetMeshRenderer } from "../render/wireframe";
import { MeshRenderer } from "../render/mesh";
import { Gui } from "../ui/gui";
import { findMeshAsset, meshAssets, type MeshAsset } from "../config/meshes";
import { SoftBodySolver } from "../simulation/solver";

type AppOptions = {
  initialMesh: MeshAsset;
  initialWireframeVisibility: boolean;
  initialRunning: boolean;
};

export class App {
  private readonly options: AppOptions;

  private sceneView: SceneView;
  private meshRenderer: MeshRenderer | null = null;
  private tetMeshRenderer: TetMeshRenderer | null = null;
  private gui: Gui;

  private loadingMesh = false;

  private showWireframe = false;

  private solver: SoftBodySolver | null = null;
  private simulationRunning: boolean;

  constructor(options: AppOptions) {
    this.options = options;

    this.sceneView = new SceneView();

    this.simulationRunning = options.initialRunning;

    this.gui = new Gui({
      meshAssets,
      initialMeshId: this.options.initialMesh.id,
      initialWireframeVisibility: this.options.initialWireframeVisibility,
      initialRunning: this.options.initialRunning,
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
      },
    });
  }

  async start() {
    await this.loadMesh(this.options.initialMesh);
    this.animate();
  }

  dispose() {
    this.meshRenderer?.dispose();
    this.tetMeshRenderer?.dispose();
    this.gui.dispose();
  }

  private resetSimulation() {
    this.solver?.reset();
    this.setSimulationRunning(false);
    this.gui.setSimulationRunning(false);
    if (this.solver !== null && this.tetMeshRenderer !== null) {
      this.tetMeshRenderer.update(this.solver.positions);
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

  private async loadMesh(asset: MeshAsset) {
    const meshData = await loadVisualMeshPLY(asset.visPath, asset.target);

    if (this.meshRenderer !== null) {
      this.sceneView.removeObject(this.meshRenderer.getObject3D());
      this.meshRenderer.dispose();
      this.meshRenderer = null;
    }

    if (this.tetMeshRenderer !== null) {
      this.sceneView.removeObject(this.tetMeshRenderer.getObject3D());
      this.tetMeshRenderer.dispose();
      this.tetMeshRenderer = null;
    }

    this.meshRenderer = new MeshRenderer(meshData);
    this.sceneView.addObject(this.meshRenderer.getObject3D());
    if (asset.simPath !== undefined) {
      const tetMeshData = await loadTetMeshJson(
        asset.simPath,
        meshData.transform,
      );

      this.solver = new SoftBodySolver(tetMeshData, {
        dt: 1.0 / 60.0,
        substeps: 10,
        iterations: 1,
        gravity: new Float32Array([0.0, -9.8, 0.0]),
        damping: 0.0,
        volCompliance: 0.0,
        edgeCompliance: 0.0,
      });

      this.tetMeshRenderer = new TetMeshRenderer(tetMeshData);
      this.tetMeshRenderer.setVisible(this.showWireframe);
      this.sceneView.addObject(this.tetMeshRenderer.getObject3D());
    }
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    if (this.simulationRunning && this.solver !== null) {
      this.solver.simulate();
      if (this.tetMeshRenderer !== null) {
        this.tetMeshRenderer.update(this.solver.positions);
      }
    }

    this.sceneView.update();
    this.sceneView.render();
  };
}
