export const getPaperDimensions = (size: string) => {
    const s = size?.toUpperCase();
    switch(s) {
        case 'F4': return { width: '215mm', height: '330mm' };
        case 'LETTER': return { width: '215.9mm', height: '279.4mm' };
        default: return { width: '210mm', height: '297mm' };
    }
};

export const getNotulenContentStyle = (data: any) => {
    return {
        fontFamily: data.font_family || 'Arial',
        fontSize: `${data.font_size || 12}pt`,
        lineHeight: data.line_height || 1.5,
        textAlign: (data.text_align as any) || 'justify',
        paddingTop: `${data.margin_top || 20}mm`,
        paddingBottom: `${data.margin_bottom || 20}mm`,
        paddingLeft: `${data.margin_left || 30}mm`,
        paddingRight: `${data.margin_right || 20}mm`,
        backgroundColor: 'white',
        minHeight: '297mm', // Default A4
        width: '210mm',
        boxSizing: 'border-box' as const,
        position: 'relative' as const
    };
};
