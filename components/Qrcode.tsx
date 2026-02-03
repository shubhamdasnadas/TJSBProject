import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, X, Printer, Maximize2 } from 'lucide-react';

interface QrcodeProps {
  value: string;
  label?: string;
  subLabel?: string; // e.g. Assigned User
  variant?: 'table' | 'preview';
}

export const Qrcode: React.FC<QrcodeProps> = ({ value, label, subLabel, variant = 'table' }) => {
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
              font-family: 'Inter', system-ui, -apple-system, sans-serif; 
              margin: 0; 
              background: white;
            }
            .label-container { 
              border: 2px solid #000; 
              padding: 20px; 
              text-align: center; 
              width: fit-content;
              border-radius: 8px;
            }
            .qr-img { width: 180px; height: 180px; }
            .asset-name { 
              margin-top: 15px; 
              font-weight: 900; 
              font-size: 18px; 
              text-transform: uppercase;
              letter-spacing: -0.01em;
              color: #000;
            }
            .user-name {
              font-size: 14px;
              font-weight: 700;
              margin-top: 4px;
              color: #333;
              background: #f0f0f0;
              padding: 2px 8px;
              border-radius: 4px;
              display: inline-block;
            }
            .serial-no { 
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; 
              font-size: 11px; 
              margin-top: 8px; 
              color: #666; 
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="label-container">
            <img src="${canvas.toDataURL()}" class="qr-img" />
            <div class="asset-name">${label || 'Asset Unit'}</div>
            ${subLabel ? `<div class="user-name">User: ${subLabel}</div>` : ''}
            <div class="serial-no">S/N: ${value}</div>
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
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    printWindow?.document.write(windowContent);
    printWindow?.document.close();
  };

  if (!value) return (
    <div className="flex items-center gap-2 text-slate-300 italic text-[10px]">
      <QrCode size={14} className="opacity-30"/> No Serial
    </div>
  );

  if (variant === 'preview') {
    return (
      <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-inner group">
        <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 mb-3 relative overflow-hidden">
          <QRCodeCanvas 
            id={`qr-canvas-full-${value}`}
            value={value} 
            size={120} 
            level="H" 
            includeMargin={true}
          />
          <button 
            onClick={handlePrint}
            className="absolute inset-0 bg-blue-600/0 hover:bg-blue-600/10 flex items-center justify-center transition-all opacity-0 hover:opacity-100"
          >
            <Printer size={24} className="text-blue-600 drop-shadow-sm" />
          </button>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Label Preview</div>
          <div className="text-sm font-bold text-slate-800 truncate max-w-[150px] leading-tight">{label}</div>
          {subLabel && <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 mt-1 inline-block">{subLabel}</div>}
        </div>
      </div>
    );
  }

  return (
    <>
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

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
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

            <div className="p-8 flex flex-col items-center justify-center bg-white">
              <div className="p-4 bg-white border-4 border-slate-50 rounded-2xl shadow-inner mb-6 relative group">
                <QRCodeCanvas 
                  id={`qr-canvas-full-${value}`}
                  value={value} 
                  size={200} 
                  level="H" 
                  includeMargin={true}
                />
              </div>
              
              <div className="text-center space-y-1">
                <div className="text-lg font-black text-slate-900 tracking-tight leading-tight uppercase mb-1">{label || 'Asset Unit'}</div>
                {subLabel && (
                  <div className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 inline-block mb-2">
                    User: {subLabel}
                  </div>
                )}
                <div className="block">
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full border border-slate-200 inline-block">
                    SN: {value}
                  </div>
                </div>
              </div>
            </div>

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