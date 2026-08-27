import SceneCanvas from "./scene/Canvas";
import { EndTurnButton } from "./hud/EndTurnButton";

export default function App() {
  return (
    <div className="h-screen w-screen">
      <SceneCanvas />
      <EndTurnButton idleUnitCount={0} onEndTurn={() => undefined} />
    </div>
  );
}
