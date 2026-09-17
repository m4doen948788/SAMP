$path = "d:\copy-dashboard\Frontend\src\components\ManajemenKegiatan.tsx"
$content = Get-Content $path -Raw
# Using a regex or exact match. Exact match is safer if we get the whitespace right.
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

# Handle CRLF vs LF
$content = $content.Replace($old.Replace("`n", "`r`n"), $new.Replace("`n", "`r`n"))
Set-Content -Path $path -Value $content -Encoding UTF8
