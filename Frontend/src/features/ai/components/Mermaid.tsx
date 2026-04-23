import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import mermaid from 'mermaid';

// Initialize mermaid once globally
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#6366f1',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#4f46e5',
    lineColor: '#64748b',
    secondaryColor: '#f1f5f9',
    tertiaryColor: '#ffffff',
  },
  securityLevel: 'loose',
  fontFamily: 'Inter, system-ui, sans-serif',
});

// Global counter to avoid Mermaid ID collisions across multiple renders
let mermaidCounter = 0;

interface MermaidProps {
  chart: string;
  onCopy?: () => void;
}

const Mermaid: React.FC<MermaidProps> = ({ chart, onCopy }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  // FIXED: useState must ALWAYS be at top level - not after conditional returns
  const [copied, setCopied] = useState(false);

  const chartId = useRef(`mermaid-chart-${++mermaidCounter}`);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!chart) return;

    const renderChart = async () => {
      try {
        setSvg('');
        setError(null);

        const cleanChart = chart
          .replace(/^```mermaid\n?/, '')
          .replace(/\n?```$/, '')
          .trim();

        if (!cleanChart) return;

        // Use a unique ID each call to avoid internal Mermaid state collisions
        const uniqueId = `mermaid-r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const { svg: renderedSvg } = await mermaid.render(uniqueId, cleanChart);

        if (isMounted.current) {
          setSvg(renderedSvg);
        }
      } catch (err: any) {
        console.error('Mermaid Render Error:', err);
        if (isMounted.current) {
          setError('Gagal memproses diagram. Format tidak valid.');
        }
        // Cleanup any orphaned Mermaid DOM elements
        try {
          document.querySelectorAll('[id^="mermaid-r-"]').forEach(el => el.remove());
        } catch (_) {}
      }
    };

    renderChart();
  }, [chart]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(chart).catch(() => {});
    setCopied(true);
    if (onCopy) onCopy();
    setTimeout(() => setCopied(false), 2000);
  }, [chart, onCopy]);

  if (error) {
    return (
      <div className="p-4 my-4 bg-red-50/50 border border-red-200 rounded-xl overflow-hidden self-stretch">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-xs font-bold text-red-600 uppercase tracking-tight">Diagram Terminal</span>
          </div>
          <button 
            onClick={handleCopy}
            className="px-2 py-1 bg-white border border-red-200 text-red-600 text-[10px] font-bold rounded hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center gap-1"
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? 'Tersalin' : 'Salin Sintaks'}
          </button>
        </div>
        <div className="text-[11px] text-red-700 italic leading-relaxed font-medium">
          {error}. Nayaxa mencoba memproses struktur diagram yang kompleks, namun terjadi ketidakcocokan sintaks Mermaid.
        </div>
        <div className="mt-2 text-[9px] text-red-400 font-mono line-clamp-1 border-t border-red-100 pt-1">
          Raw: {chart.slice(0, 50)}...
        </div>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="p-4 flex justify-center">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative group/mermaid my-4 p-6 bg-white/70 backdrop-blur-md border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[100px] flex flex-col items-center">
      <div className="absolute right-3 top-3 z-10">
        <button
          onClick={handleCopy}
          className="p-2 bg-slate-50 text-slate-500 rounded-lg border border-slate-200 hover:bg-white hover:text-indigo-600 transition-all shadow-sm active:scale-95 flex items-center gap-2 text-xs font-semibold"
          title="Salin Kode Bagan"
        >
          {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          {copied ? 'Tersalin' : 'Salin Bagan'}
        </button>
      </div>
      <div
        className="w-full flex justify-center overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
};

export default Mermaid;
