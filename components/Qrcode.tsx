import React, { useState } from 'react';
// Import from the defined importmap in index.html
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, X, Printer, Maximize2 } from 'lucide-react';

interface QrcodeProps {
  value: string;
  label?: string;
}

export const Qrcode: React.FC<QrcodeProps> = ({ value, label }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handlePrint = () => {
    const canvas = document.getElementById(`qr-canvas-full-${value}`) as HTMLCanvasElement;
    if (!canvas) return;
    
    const windowContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Label - ${label}</title>
          <style>
            @page { size: auto; margin: 0; }
            body { 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              font-family: 'Inter', sans-serif; 
              margin: 0; 
              background: white;
            }
            .label-container { 
              border: 1.5px solid #000; 
              padding: 16px; 
              text-align: center; 
              width: fit-content;
              border-radius: 4px;
            }
            .qr-img { width: 160px; height: 160px; }
            .asset-name { 
              margin-top: 12px; 
              font-weight: 800; 
              font-size: 16px; 
              text-transform: uppercase;
              letter-spacing: -0.02em;
            }
            .serial-no { 
              font-family: monospace; 
              font-size: 12px; 
              margin-top: 4px; 
              color: #444; 
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="label-container">
            <img src="${canvas.toDataURL()}" class="qr-img" />
            <div class="asset-name">${label || 'Asset Unit'}</div>
            <div class="serial-no">SN: ${value}</div>
          </div>
          <script>
            window.onload = () => { 
              window.print(); 
              setTimeout(() => window.close(), 500); 
            }
          </script>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank', 'width=500,height=500');
    printWindow?.document.write(windowContent);
    printWindow?.document.close();
  };

  if (!value) return (
    <div className="flex items-center gap-2 text-slate-300 italic text-[10px]">
      <QrCode size={14} className="opacity-30"/> No Serial
    </div>
  );

  return (
    <>
      {/* Table Row UI: Thumbnail + Label */}
      <div className="flex items-center gap-3 group/qr cursor-pointer" onClick={() => setIsOpen(true)}>
        <div 
          className="relative shrink-0 p-1 bg-white border border-slate-200 rounded-md shadow-sm group-hover/qr:border-blue-400 group-hover/qr:shadow transition-all overflow-hidden"
          title="Click to view/print"
        >
          <QRCodeCanvas 
            value={value} 
            size={38} 
            level="M" 
            includeMargin={false}
          />
          <div className="absolute inset-0 bg-blue-600/0 group-hover/qr:bg-blue-600/5 flex items-center justify-center transition-colors">
            <Maximize2 size={10} className="text-blue-600 opacity-0 group-hover/qr:opacity-100" />
          </div>
        </div>
        
        <div className="flex flex-col min-w-0">
          <div className="text-[11px] font-bold text-slate-700 truncate max-w-[140px] leading-tight group-hover/qr:text-blue-700 transition-colors">
            {label}
          </div>
          <div className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter truncate">
            {value}
          </div>
        </div>
      </div>

      {/* Modal View */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                  <QrCode size={16} />
                </div>
                <h3 className="font-bold text-slate-800 text-sm tracking-tight">QR Asset Label</h3>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 flex flex-col items-center justify-center bg-white">
              <div className="p-4 bg-white border-4 border-slate-50 rounded-2xl shadow-inner mb-6">
                <QRCodeCanvas 
                  id={`qr-canvas-full-${value}`}
                  value={value} 
                  size={200} 
                  level="H" 
                  includeMargin={true}
                />
              </div>
              
              <div className="text-center space-y-1">
                <div className="text-lg font-black text-slate-900 tracking-tight leading-tight uppercase">{label || 'Asset Unit'}</div>
                <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full border border-slate-200 inline-block">
                  SN: {value}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); handlePrint(); }}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-slate-900/20"
              >
                <Printer size={18} /> Print Label
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                className="flex-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 rounded-xl font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};