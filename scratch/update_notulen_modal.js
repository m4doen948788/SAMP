const fs = require('fs');
const path = require('path');

const fileNotulen = path.join(__dirname, '../Frontend/src/features/activity/components/PengaturanNotulen.tsx');

let contentNotulen = fs.readFileSync(fileNotulen, 'utf8');

// 1. Update imports
if (!contentNotulen.includes('RefreshCw')) {
    contentNotulen = contentNotulen.replace(
        "import { Plus, Edit2, Trash2, X, Check, Loader2, Settings, FileText, Type, Move, Image as ImageIcon, List, ZoomIn, ZoomOut, Eye } from 'lucide-react';",
        "import { Plus, Edit2, Trash2, X, Check, Loader2, Settings, FileText, Type, Move, Image as ImageIcon, List, ZoomIn, ZoomOut, Eye, RefreshCw } from 'lucide-react';"
    );
}

// 2. Update the Spasi text in the top summary card
const spasiOld = '<span className="text-[10px] font-bold text-slate-600">Spasi: {globalSettings.line_height}</span>';
const spasiNew = '<span className="text-[10px] font-bold text-slate-600">Spasi: {globalSettings.line_height}, P: {globalSettings.paragraph_spacing_before}/{globalSettings.paragraph_spacing_after}pt, Indent: {globalSettings.first_line_indent}mm</span>';
contentNotulen = contentNotulen.replace(spasiOld, spasiNew);

// 3. Replace the global settings modal
const modalStartStr = '{/* Global Settings Modal */}';
const modalStartIndex = contentNotulen.indexOf(modalStartStr);

const modalEndStr = '            )}';
// Find the closing of the modal (the next )} after modalStartIndex)
const modalEndIndex = contentNotulen.indexOf(modalEndStr, modalStartIndex);

const newModal = `            {/* Global Settings Modal */}
            {showGlobalModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col border border-slate-100 overflow-hidden scale-in-center">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Pengaturan Global Laporan</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Default font, margin, dan spacing untuk seluruh dokumen</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-px bg-slate-100 mx-2"></div>
                                <button onClick={() => setShowGlobalModal(false)} className="text-slate-400 hover:text-slate-600 p-2.5 hover:bg-slate-100 rounded-full transition-all group">
                                    <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden bg-slate-50">
                            {/* Left Panel: Form */}
                            <div className="w-full lg:w-1/2 overflow-y-auto p-8 scrollbar-thin">
                                <form onSubmit={handleSaveGlobalSettings} className="space-y-6">
                                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Type size={16} className="text-emerald-500" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipografi & Kertas (Default)</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-700 ml-1">Jenis Font</label>
                                                <select 
                                                    className="input-modern w-full"
                                                    value={globalFormData.font_family}
                                                    onChange={e => setGlobalFormData({...globalFormData, font_family: e.target.value})}
                                                >
                                                    <option value="Arial">Arial</option>
                                                    <option value="Times New Roman">Times New Roman</option>
                                                    <option value="Courier New">Courier New</option>
                                                    <option value="Verdana">Verdana</option>
                                                    <option value="Georgia">Georgia</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-700 ml-1">Ukuran Font (pt)</label>
                                                <input 
                                                    type="number" 
                                                    className="input-modern w-full"
                                                    value={globalFormData.font_size || ''}
                                                    onChange={e => setGlobalFormData({...globalFormData, font_size: parseInt(e.target.value) || 0})}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-700 ml-1">Spasi Baris</label>
                                                <select 
                                                    className="input-modern w-full"
                                                    value={globalFormData.line_height}
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value);
                                                        setGlobalFormData({...globalFormData, line_height: val});
                                                    }}
                                                >
                                                    <option value="1">Single (1.0)</option>
                                                    <option value="1.15">1.15</option>
                                                    <option value="1.25">1.25</option>
                                                    <option value="1.35">1.35</option>
                                                    <option value="1.5">1.5</option>
                                                    <option value="2">Double (2.0)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-700 ml-1">Ukuran Kertas</label>
                                                <select 
                                                    className="input-modern w-full"
                                                    value={globalFormData.paper_size}
                                                    onChange={e => setGlobalFormData({...globalFormData, paper_size: e.target.value})}
                                                >
                                                    <option value="A4">A4</option>
                                                    <option value="F4">F4</option>
                                                    <option value="Letter">Letter</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Move size={16} className="text-emerald-500" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margin Halaman (mm) (Default)</span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="space-y-1.5 text-center">
                                                <label className="text-[11px] font-bold text-slate-700 block">Atas</label>
                                                <input type="number" className="input-modern w-full text-center" value={globalFormData.margin_top || 0} onChange={e => setGlobalFormData({...globalFormData, margin_top: parseInt(e.target.value) || 0})} />
                                            </div>
                                            <div className="space-y-1.5 text-center">
                                                <label className="text-[11px] font-bold text-slate-700 block">Bawah</label>
                                                <input type="number" className="input-modern w-full text-center" value={globalFormData.margin_bottom || 0} onChange={e => setGlobalFormData({...globalFormData, margin_bottom: parseInt(e.target.value) || 0})} />
                                            </div>
                                            <div className="space-y-1.5 text-center">
                                                <label className="text-[11px] font-bold text-slate-700 block">Kiri</label>
                                                <input type="number" className="input-modern w-full text-center" value={globalFormData.margin_left || 0} onChange={e => setGlobalFormData({...globalFormData, margin_left: parseInt(e.target.value) || 0})} />
                                            </div>
                                            <div className="space-y-1.5 text-center">
                                                <label className="text-[11px] font-bold text-slate-700 block">Kanan</label>
                                                <input type="number" className="input-modern w-full text-center" value={globalFormData.margin_right || 0} onChange={e => setGlobalFormData({...globalFormData, margin_right: parseInt(e.target.value) || 0})} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <List size={16} className="text-emerald-500" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paragraf Lanjutan (Default)</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-700 ml-1 text-xs">Spacing Before (pt)</label>
                                                <input 
                                                    type="number" 
                                                    step="0.1" 
                                                    className="input-modern w-full" 
                                                    value={globalDrafts.paragraph_spacing_before ?? globalFormData.paragraph_spacing_before} 
                                                    onChange={e => {
                                                        const raw = e.target.value;
                                                        setGlobalDrafts(prev => ({...prev, paragraph_spacing_before: raw}));
                                                        const val = parseFloat(raw);
                                                        if (!isNaN(val)) setGlobalFormData({...globalFormData, paragraph_spacing_before: val});
                                                    }} 
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-700 ml-1 text-xs">Spacing After (pt)</label>
                                                <input 
                                                    type="number" 
                                                    step="0.1" 
                                                    className="input-modern w-full" 
                                                    value={globalDrafts.paragraph_spacing_after ?? globalFormData.paragraph_spacing_after} 
                                                    onChange={e => {
                                                        const raw = e.target.value;
                                                        setGlobalDrafts(prev => ({...prev, paragraph_spacing_after: raw}));
                                                        const val = parseFloat(raw);
                                                        if (!isNaN(val)) setGlobalFormData({...globalFormData, paragraph_spacing_after: val});
                                                    }} 
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-700 ml-1 text-xs">Indent Baris 1 (mm)</label>
                                                <input 
                                                    type="number" 
                                                    step="0.1" 
                                                    className="input-modern w-full" 
                                                    value={globalDrafts.first_line_indent ?? globalFormData.first_line_indent} 
                                                    onChange={e => {
                                                        const raw = e.target.value;
                                                        setGlobalDrafts(prev => ({...prev, first_line_indent: raw}));
                                                        const val = parseFloat(raw);
                                                        if (!isNaN(val)) setGlobalFormData({...globalFormData, first_line_indent: val});
                                                    }} 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex items-center justify-end gap-3 sticky bottom-0 bg-white/90 backdrop-blur-md py-4 -mx-8 px-8 border-t border-slate-100 z-10">
                                        <button type="button" onClick={() => setShowGlobalModal(false)} className="btn-modern-secondary px-6 py-2.5 text-xs">Batal</button>
                                        <button type="submit" className="btn-modern px-8 py-2.5 flex items-center gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 text-white rounded-xl">
                                            <Check size={16} />
                                            <span>Simpan Pengaturan Global</span>
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Right Panel: Live Preview */}
                            <div className="hidden lg:flex w-1/2 flex-col bg-slate-200/50 border-l border-slate-100">
                                <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                                            <Eye size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-800 uppercase leading-none tracking-wider">Live Preview</span>
                                            <select 
                                                className="text-[10px] font-bold text-emerald-600 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                                                value={previewTemplateId || ''}
                                                onChange={(e) => setPreviewTemplateId(e.target.value ? parseInt(e.target.value) : null)}
                                            >
                                                <option value="">-- Gunakan Teks Dummy --</option>
                                                {templates.map(t => (
                                                    <option key={t.id} value={t.id}>{t.nama_template}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                                        <button onClick={() => setPreviewZoom(prev => Math.max(0.3, prev - 0.05))} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-white rounded-lg transition-all"><ZoomOut size={14} /></button>
                                        <span className="text-[9px] font-black text-slate-600 w-10 text-center">{Math.round(previewZoom * 100)}%</span>
                                        <button onClick={() => setPreviewZoom(prev => Math.min(1.0, prev + 0.05))} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-white rounded-lg transition-all"><ZoomIn size={14} /></button>
                                        <button onClick={() => setPreviewZoom(0.55)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors"><RefreshCw size={12} /></button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-auto p-12 scrollbar-thin flex flex-col items-center">
                                    <div 
                                        className="relative transition-all duration-300 origin-top mb-20"
                                        style={{ 
                                            transform: \`scale(\${previewZoom})\`,
                                            width: getPaperDimensions(globalFormData.paper_size).width,
                                            height: getPaperDimensions(globalFormData.paper_size).height
                                        }}
                                    >
                                        {/* Kertas Utama */}
                                        <div 
                                            className="bg-white shadow-2xl border border-slate-200 text-black text-left transition-all duration-300 relative"
                                            style={{
                                                width: getPaperDimensions(globalFormData.paper_size).width,
                                                minHeight: getPaperDimensions(globalFormData.paper_size).height,
                                                paddingTop: \`\${globalFormData.margin_top}mm\`,
                                                paddingBottom: \`\${globalFormData.margin_bottom}mm\`,
                                                paddingLeft: \`\${globalFormData.margin_left}mm\`,
                                                paddingRight: \`\${globalFormData.margin_right}mm\`,
                                                fontFamily: \`\${globalFormData.font_family}, sans-serif\`,
                                                fontSize: \`\${globalFormData.font_size}pt\`,
                                                lineHeight: globalFormData.line_height,
                                                textAlign: globalFormData.text_align as any,
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            <style dangerouslySetInnerHTML={{ __html: \`
                                                #preview-content-global p { 
                                                    margin-top: \${globalFormData.paragraph_spacing_before}pt;
                                                    margin-bottom: \${globalFormData.paragraph_spacing_after}pt;
                                                    text-indent: \${globalFormData.first_line_indent}mm;
                                                }
                                            \`}} />
                                            
                                            <div className="border-b-2 border-black pb-4 mb-8 flex items-center gap-6">
                                                <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 border border-slate-200 border-dashed">LOGO</div>
                                                <div className="flex-1 text-center">
                                                    <div className="font-bold text-lg uppercase">Pemerintah Kabupaten Bogor</div>
                                                    <div className="font-bold text-xl uppercase">Badan Perencanaan Pembangunan, Penelitian dan Pengembangan Daerah</div>
                                                    <div className="text-xs italic">Jl. Segar No. 1, Cibinong, Bogor - Jawa Barat</div>
                                                </div>
                                            </div>

                                            <div id="preview-content-global" dangerouslySetInnerHTML={{ __html: previewContent }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}`;

contentNotulen = contentNotulen.slice(0, modalStartIndex) + newModal + contentNotulen.slice(modalEndIndex + 14);

fs.writeFileSync(fileNotulen, contentNotulen);
console.log('Update successful');
