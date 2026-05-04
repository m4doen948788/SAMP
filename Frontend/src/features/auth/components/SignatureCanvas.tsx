import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Undo, Save, Check } from 'lucide-react';

interface SignatureCanvasProps {
    onSave: (blob: Blob) => void;
    onClear?: () => void;
    height?: number;
    width?: number;
    brushColor?: string;
    brushSize?: number;
}

export default function SignatureCanvas({
    onSave,
    onClear,
    height = 200,
    width = 400,
    brushColor = '#000000',
    brushSize = 2
}: SignatureCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasContent, setHasContent] = useState(false);
    const [history, setHistory] = useState<string[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set high DPI support
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        
        // Fill white background for export safety
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
    }, [width, height, brushColor, brushSize]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.lineTo(x, y);
            ctx.stroke();
            setHasContent(true);
        }
    };

    const stopDrawing = () => {
        if (isDrawing) {
            saveToHistory();
        }
        setIsDrawing(false);
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const saveToHistory = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const dataUrl = canvas.toDataURL();
            setHistory(prev => [...prev.slice(-19), dataUrl]); // Keep last 20 steps
        }
    };

    const handleUndo = () => {
        const canvas = canvasRef.current;
        if (!canvas || history.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const newHistory = [...history];
        newHistory.pop(); // Remove current state
        setHistory(newHistory);

        const lastState = newHistory[newHistory.length - 1];
        if (lastState) {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, width, height);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
            };
            img.src = lastState;
        } else {
            handleClear();
        }
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        setHasContent(false);
        setHistory([]);
        if (onClear) onClear();
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.toBlob((blob) => {
            if (blob) onSave(blob);
        }, 'image/png');
    };

    return (
        <div className="flex flex-col gap-3">
            <div 
                className="relative bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-inner cursor-crosshair touch-none"
                style={{ width: `${width}px`, height: `${height}px` }}
            >
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="block"
                />
                
                {!hasContent && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                        <p className="text-slate-400 font-medium">Gunakan mouse atau sentuhan untuk tanda tangan</p>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleClear}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Eraser size={14} /> Hapus
                    </button>
                    <button
                        type="button"
                        onClick={handleUndo}
                        disabled={history.length === 0}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Undo size={14} /> Undo
                    </button>
                </div>

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!hasContent}
                    className="btn-primary py-2 px-4 text-xs shadow-md disabled:opacity-50"
                >
                    <Check size={14} /> Gunakan Tanda Tangan
                </button>
            </div>
        </div>
    );
}
