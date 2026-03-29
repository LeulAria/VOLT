import { memo } from "react";
import { type TileType } from "../store/useTileStore";
import { TerminalView } from "./TerminalView";
import { BrowserTileView } from "./BrowserView";
import { FilesView } from "./FilesView";
// import { VOLTCODE_ENABLED } from "../../voltcode/feature-flag";
// import { VoltCodeView } from "../../voltcode/VoltCodeView";

interface TileContentProps {
  id: string;
  type: TileType;
  title?: string;
  filePath?: string;
  initialCommand?: string;
  browserUrl?: string;
  readOnly?: boolean;
}

const TileContent = memo(function TileContent({
  id,
  type,
  filePath,
  initialCommand,
  browserUrl,
  readOnly,
}: TileContentProps) {
  switch (type) {
    case "browser":
      return <BrowserTileView tileId={id} url={browserUrl} />;
    case "file":
      return <FilesView tileId={id} filePath={filePath} readOnly={readOnly} />;
    // case "voltcode":
    //   return VOLTCODE_ENABLED ? <VoltCodeView tileId={id} /> : <TerminalView tileId={id} cwd={filePath} initialCommand={initialCommand} />;
    case "terminal":
      return <TerminalView tileId={id} cwd={filePath} initialCommand={initialCommand} />;
    default:
      return <TerminalView tileId={id} cwd={filePath} initialCommand={initialCommand} />;
  }
});

export default TileContent;
