import GUI from "lil-gui";
import type { MeshAsset } from "../config/meshes";

type GuiCallbacks = {
  resetCamera: () => void;
  selectMesh: (id: string) => void;
  setWireframeVisibility: (visible: boolean) => void;
  resetSimulation: () => void;
  setSimulationRunning: (running: boolean) => void;
};

type GuiOptions = {
  meshAssets: MeshAsset[];
  initialMeshId: string;
  initialWireframeVisibility: boolean;
  initialRunning: boolean;
  callbacks: GuiCallbacks;
};

type GuiParams = {
  mesh: string;
  resetCamera: () => void;
  showWireframe: boolean;
  resetSimulation: () => void;
  simulationRunning: boolean;
};

export class Gui {
  private gui: GUI;
  private params: GuiParams;
  private simulationRunningController: ReturnType<GUI["add"]>;

  constructor(options: GuiOptions) {
    this.gui = new GUI();

    this.params = {
      mesh: options.initialMeshId,
      resetCamera: options.callbacks.resetCamera,
      showWireframe: options.initialWireframeVisibility,
      resetSimulation: options.callbacks.resetSimulation,
      simulationRunning: options.initialRunning,
    };

    const meshOptions = Object.fromEntries(
      options.meshAssets.map((asset) => [asset.name, asset.id]),
    );

    this.gui
      .add(this.params, "mesh", meshOptions)
      .name("Mesh")
      .onChange((id: string) => {
        options.callbacks.selectMesh(id);
      });

    this.gui
      .add(this.params, "showWireframe")
      .name("Show Wireframe")
      .onChange((visible: boolean) => {
        options.callbacks.setWireframeVisibility(visible);
      });

    this.gui.add(this.params, "resetCamera").name("Reset Camera");
    this.gui.add(this.params, "resetSimulation").name("Reset Simulation");
    this.simulationRunningController = this.gui
      .add(this.params, "simulationRunning")
      .name("Simulation Running")
      .onChange((running: boolean) => {
        options.callbacks.setSimulationRunning(running);
      });
  }

  setSimulationRunning(running: boolean) {
    this.simulationRunningController.setValue(running);
  }

  dispose() {
    this.gui.destroy();
  }
}
