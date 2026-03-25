import { QRCodeSVG } from "qrcode.react";

interface QROverlayProps {
  qrData: string;
}

const QROverlay = ({ qrData }: QROverlayProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
        <QRCodeSVG value={qrData} size={256} />
        <p className="text-zinc-800 text-sm font-medium">
          Scan with WhatsApp to connect
        </p>
      </div>
    </div>
  );
};

export default QROverlay;
