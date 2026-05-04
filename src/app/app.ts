import { SceneView } from "../render/scene";
import { loadVisualMeshPLY } from "../loaders/visloader";
import { loadTetMeshJson } from "../loaders/simloader";
import { TetMeshRenderer } from "../render/wireframe";
import { MeshRenderer } from "../render/mesh";
import { Gui } from "../ui/gui";
import { findMeshAsset, meshAssets, type MeshAsset } from "../config/meshes";

type AppOptions = {
  initialMesh: MeshAsset;
  initialWireframeVisibility: boolean;
};

export class App {
  private readonly options: AppOptions;

  private sceneView: SceneView;
  private meshRenderer: MeshRenderer | null = null;
  private tetMeshRenderer: TetMeshRenderer | null = null;
  private gui: Gui;

  private loadingMesh = false;

  private showWireframe = false;

  constructor(options: AppOptions) {
    this.options = options;

    this.sceneView = new SceneView();
    this.gui = new Gui({
      meshAssets,
      initialMeshId: this.options.initialMesh.id,
      initialWireframeVisibility: this.options.initialWireframeVisibility,
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

      this.tetMeshRenderer = new TetMeshRenderer(tetMeshData);
      this.tetMeshRenderer.setVisible(this.showWireframe);
      this.sceneView.addObject(this.tetMeshRenderer.getObject3D());
    }
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    this.sceneView.update();
    this.sceneView.render();
  };
}
