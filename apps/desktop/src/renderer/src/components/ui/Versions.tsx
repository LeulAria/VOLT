import { useState } from "react";

function Versions(): React.JSX.Element {
  const [versions] = useState(window.electron.process.versions);

  return (
    <ul className="m-0 list-none p-0 font-mono text-xs text-white/50">
      <li>Electron v{versions.electron}</li>
      <li>Chromium v{versions.chrome}</li>
      <li>Node v{versions.node}</li>
    </ul>
  );
}

export default Versions;
