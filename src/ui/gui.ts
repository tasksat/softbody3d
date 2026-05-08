import GUI from "lil-gui";
import type { MeshAsset } from "../config/meshes";

function setupSettingsDrawer(gui: GUI) {
  const root = gui.domElement;

  root.classList.add("settings-drawer");

  const tab = document.createElement("button");
  tab.type = "button";
  tab.className = "settings-drawer-tab";
  tab.setAttribute("aria-label", "Toggle controls panel");
  tab.setAttribute("aria-expanded", "false");

  const label = document.createElement("span");
  label.className = "settings-drawer-tab-label";
  label.textContent = "Control Panel";

  tab.appendChild(label);
  root.appendChild(tab);

  let open = false;

  const setOpen = (nextOpen: boolean) => {
    open = nextOpen;
    root.classList.toggle("is-open", open);
    tab.setAttribute("aria-expanded", String(open));
  };

  tab.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(!open);
  });

  setOpen(false);
}

type GuiCallbacks = {
  resetCamera: () => void;
  selectMesh: (id: string) => void;
  setWireframeVisibility: (visible: boolean) => void;
  resetSimulation: () => void;
  setSimulationRunning: (running: boolean) => void;
  setEdgeCompliance: (value: number) => void;
};

type GuiOptions = {
  meshAssets: MeshAsset[];
  initialMeshId: string;
  initialWireframeVisibility: boolean;
  initialRunning: boolean;
  initialEdgeCompliance: number;
  callbacks: GuiCallbacks;
};

type GuiParams = {
  mesh: string;
  resetCamera: () => void;
  showWireframe: boolean;
  resetSimulation: () => void;
  simulationRunning: boolean;
  edgeCompliance: number;
};

export class Gui {
  private gui: GUI;
  private params: GuiParams;
  private simulationRunningController: ReturnType<GUI["add"]>;

  constructor(options: GuiOptions) {
    this.gui = new GUI({
      width: 260,
      touchStyles: 0,
    });
    this.gui.$title.remove();

    setupSettingsDrawer(this.gui);

    this.params = {
      mesh: options.initialMeshId,
      resetCamera: options.callbacks.resetCamera,
      showWireframe: options.initialWireframeVisibility,
      resetSimulation: options.callbacks.resetSimulation,
      simulationRunning: options.initialRunning,
      edgeCompliance: options.initialEdgeCompliance,
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

    const simulationFolder = this.gui.addFolder("Simulation");

    simulationFolder
      .add(this.params, "edgeCompliance", 0.0, 5.0, 0.1)
      .name("Compliance")
      .onChange((value: number) => {
        options.callbacks.setEdgeCompliance(value);
      });
  }

  setSimulationRunning(running: boolean) {
    this.simulationRunningController.setValue(running);
  }

  dispose() {
    this.gui.destroy();
  }
}
