import { Dialog, DialogContent } from "@/components/ui/dialog";
import SettingsPage from "./SettingsPage";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <SettingsPage isMobile={false} />
      </DialogContent>
    </Dialog>
  );
}
