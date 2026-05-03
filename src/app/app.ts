import { SceneView } from "../render/scene";
import { Gui } from "../ui/gui";

export class App {
  private sceneView: SceneView;
  private gui: Gui;

  constructor() {
    this.sceneView = new SceneView();
    this.gui = new Gui({ resetCamera: () => this.sceneView.resetCamera() });
  }

  start() {
    this.animate();
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    this.sceneView.update();
    this.sceneView.render();
  };
}
