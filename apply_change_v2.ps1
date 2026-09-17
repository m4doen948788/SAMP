$path = "d:\copy-dashboard\Frontend\src\components\ManajemenKegiatan.tsx"
$tempPath = "d:\copy-dashboard\Frontend\src\components\ManajemenKegiatan.tsx.tmp"
$content = Get-Content $path -Raw
$old = '                                    <td className="px-6 py-4">
                                        <h4 className="text-sm font-bold text-slate-800 leading-tight">{act.nama_kegiatan}</h4>
                                        {act.jenis_kegiatan_nama && (
                                            <div className="mt-1.5">
                                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-black uppercase border border-indigo-100">
                                                    {act.jenis_kegiatan_nama}
                                                </span>
                                            </div>
                                        )}
                                    </td>'
$new = '                                    <td className="px-6 py-4">
                                        <h4 className="text-base font-bold text-slate-800 leading-tight">{act.nama_kegiatan}</h4>
                                        {act.jenis_kegiatan_nama && (
                                            <div className="mt-1.5">
                                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[8px] font-black capitalize border border-indigo-100">
                                                    {act.jenis_kegiatan_nama.toLowerCase()}
                                                </span>
                                            </div>
                                        )}
                                    </td>'

# Use LF to keep consistency or handle both
$old_crlf = $old.Replace("`n", "`r`n")
$new_crlf = $new.Replace("`n", "`r`n")

if ($content.Contains($old_crlf)) {
    $content = $content.Replace($old_crlf, $new_crlf)
} elseif ($content.Contains($old)) {
     $content = $content.Replace($old, $new)
} else {
    Write-Error "Target content not found in file."
    exit 1
}

# Write to temp file
Set-Content -Path $tempPath -Value $content -Encoding UTF8

# Try to move - using cmd to be more aggressive
cmd /c "move /y `"$tempPath`" `"$path`""
