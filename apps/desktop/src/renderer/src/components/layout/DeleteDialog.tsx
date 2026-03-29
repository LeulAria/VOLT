import { useTranslation } from "react-i18next";
import type { FlatNode } from "../../../../shared/types";

interface DeleteDialogProps {
  nodes: FlatNode[];
  hasDir: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteDialog({ nodes, hasDir, onConfirm, onCancel }: DeleteDialogProps) {
  const { t } = useTranslation();
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/55 backdrop-blur-[2px]"
      onClick={onCancel}
    >
      <div
        className="bg-[#1a1a1a] border border-white/[0.12] rounded-[10px] p-6 w-[340px] shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold text-white m-0 mb-2">
          {nodes.length === 1
            ? t("deleteDialog.deleteOneItem", { name: nodes[0].label })
            : t("deleteDialog.deleteMultipleItems", { count: nodes.length })}
        </p>
        {hasDir && (
          <p className="text-[#f87171] text-xs m-0 mb-5">{t("deleteDialog.warningFolder")}</p>
        )}
        <p className="text-xs text-white/55 m-0 mb-5 leading-[1.5]">
          {hasDir ? t("deleteDialog.bodyFolder") : t("deleteDialog.bodyFiles")}
        </p>
        <div className="flex gap-2 justify-end">
          <button
            className="px-4 py-1.5 rounded-md border border-white/[0.12] bg-white/[0.06] text-white/75 text-xs cursor-pointer [-webkit-app-region:no-drag] hover:bg-white/10 transition-colors"
            onClick={onCancel}
          >
            {t("deleteDialog.cancel")}
          </button>
          <button
            className="px-4 py-1.5 rounded-md border border-red-500/35 bg-red-500/15 text-[#f87171] text-xs cursor-pointer [-webkit-app-region:no-drag] hover:bg-red-500/25 transition-colors"
            onClick={onConfirm}
          >
            {t("deleteDialog.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
