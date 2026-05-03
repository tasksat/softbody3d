import GUI from "lil-gui";

type GuiCallbacks = {
  resetCamera: () => void;
};

export class Gui {
  private gui: GUI;

  constructor(callbacks: GuiCallbacks) {
    this.gui = new GUI();
    const params = {
      resetCamera: callbacks.resetCamera,
    };
    this.gui.add(params, "resetCamera").name("Reset Camera");
  }
}
