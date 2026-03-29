import { memo } from "react";

interface SelectionBoxProps {
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

const SelectionBox = memo(function SelectionBox({ rect }: SelectionBoxProps) {
  return (
    <div
      className="absolute pointer-events-none border-[1.5px] border-[#4a9eff] bg-[rgba(74,158,255,0.08)] z-[500]"
      style={{
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      }}
    />
  );
});

export default SelectionBox;
