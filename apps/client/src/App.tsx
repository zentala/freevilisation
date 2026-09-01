import SceneCanvas from "./scene/Canvas";
import { EndTurnButton } from "./hud/EndTurnButton";
import { TurnIndicator } from "./hud/TurnIndicator";

export default function App() {
  return (
    <div className="h-screen w-screen min-w-[320px]">
      <SceneCanvas />
      <TurnIndicator turn={1} era="Ancient" />
      <EndTurnButton idleUnitCount={0} onEndTurn={() => undefined} />
    </div>
  );
}
