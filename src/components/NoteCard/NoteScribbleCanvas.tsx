import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Pen, Eraser } from 'lucide-react';

interface NoteScribbleCanvasProps {
  drawingData?: string;
  onUpdateDrawing: (data: string) => void;
  width?: number;
  height?: number;
}

export const NoteScribbleCanvas: React.FC<NoteScribbleCanvasProps> = ({
  drawingData,
  onUpdateDrawing,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#1e293b'); // slate-800 default
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

  // Restore drawing from drawingData URL or SVG
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (drawingData) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = drawingData;
    } else {
      // Draw initial default scribble if empty (like flower doodle in Card 3)
      drawDefaultDoodle(ctx, canvas.width, canvas.height);
    }
  }, []);

  const drawDefaultDoodle = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw a cute flower + Sunny doodle as default sample
    ctx.beginPath();
    // Flower center
    ctx.arc(w * 0.3, h * 0.45, 18, 0, Math.PI * 2);
    // Petals
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const px = w * 0.3 + Math.cos(angle) * 32;
      const py = h * 0.45 + Math.sin(angle) * 32;
      ctx.moveTo(w * 0.3 + Math.cos(angle) * 18, h * 0.45 + Math.sin(angle) * 18);
      ctx.arc(px, py, 12, 0, Math.PI * 2);
    }
    // Eyes & Smile
    ctx.moveTo(w * 0.26, h * 0.42);
    ctx.arc(w * 0.26, h * 0.42, 3, 0, Math.PI * 2);
    ctx.moveTo(w * 0.34, h * 0.42);
    ctx.arc(w * 0.34, h * 0.42, 3, 0, Math.PI * 2);
    ctx.moveTo(w * 0.26, h * 0.48);
    ctx.quadraticCurveTo(w * 0.3, h * 0.53, w * 0.34, h * 0.48);

    // Stem & Leaf
    ctx.moveTo(w * 0.3, h * 0.58);
    ctx.quadraticCurveTo(w * 0.28, h * 0.75, w * 0.32, h * 0.9);
    ctx.moveTo(w * 0.3, h * 0.7);
    ctx.quadraticCurveTo(w * 0.42, h * 0.65, w * 0.45, h * 0.75);
    ctx.quadraticCurveTo(w * 0.38, h * 0.78, w * 0.3, h * 0.7);

    // Signature "Sunny!"
    ctx.font = '22px cursive, "Caveat", sans-serif';
    ctx.strokeText('Sunny!', w * 0.52, h * 0.82);

    ctx.stroke();
  };

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasPos(e);
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        onUpdateDrawing(canvas.toDataURL());
      }
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onUpdateDrawing(canvas.toDataURL());
  };

  return (
    <div className="w-full h-full flex flex-col relative group/draw">
      {/* Mini Controls Bar */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-xs p-1 rounded-xl shadow-xs border border-slate-200 opacity-90 group-hover/draw:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => setIsEraser(false)}
          className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
            !isEraser ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Pen tool"
        >
          <Pen className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setIsEraser(true)}
          className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
            isEraser ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Eraser tool"
        >
          <Eraser className="w-3.5 h-3.5" />
        </button>

        {/* Colors */}
        {!isEraser && (
          <div className="flex items-center gap-1 px-1 border-l border-slate-200">
            {['#1e293b', '#2563eb', '#dc2626', '#16a34a'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setStrokeColor(c)}
                className={`w-3.5 h-3.5 rounded-full border transition-transform ${
                  strokeColor === c ? 'scale-125 border-slate-900 shadow-2xs' : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleClear}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border-l border-slate-200"
          title="Clear canvas"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Canvas Drawing Area */}
      <div className="w-full flex-1 flex items-center justify-center bg-white rounded-xl overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={320}
          height={240}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="w-full h-full object-contain touch-none"
        />
      </div>
    </div>
  );
};
