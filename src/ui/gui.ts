import GUI from "lil-gui";
import type { MeshAsset } from "../config/meshes";

type GuiCallbacks = {
  resetCamera: () => void;
  selectMesh: (id: string) => void;
  setWireframeVisibility: (visible: boolean) => void;
};

type GuiOptions = {
  meshAssets: MeshAsset[];
  initialMeshId: string;
  initialWireframeVisibility: boolean;
  callbacks: GuiCallbacks;
};

export class Gui {
  private gui: GUI;

  constructor(options: GuiOptions) {
    this.gui = new GUI();

    const params = {
      mesh: options.initialMeshId,
      resetCamera: options.callbacks.resetCamera,
      showWireframe: options.initialWireframeVisibility,
    };

    const meshOptions = Object.fromEntries(
      options.meshAssets.map((asset) => [asset.name, asset.id]),
    );

    this.gui
      .add(params, "mesh", meshOptions)
      .name("Mesh")
      .onChange((id: string) => {
        options.callbacks.selectMesh(id);
      });

    this.gui
      .add(params, "showWireframe")
      .name("Show Wireframe")
      .onChange((visible: boolean) => {
        options.callbacks.setWireframeVisibility(visible);
      });

    this.gui.add(params, "resetCamera").name("Reset Camera");
  }

  dispose() {
    this.gui.destroy();
  }
}
