import "./style.css";
import { App } from "./app/app";
import { defaultMeshAsset } from "./config/meshes";

const app = new App({
  initialMesh: defaultMeshAsset,
  initialWireframeVisibility: false,
});
app.start();
