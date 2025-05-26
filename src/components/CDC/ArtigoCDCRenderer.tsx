// src/components/CDC/ArtigoCDCRenderer.tsx
import React from 'react';
import type { ArtigoCDC as ArtigoDataCDC } from '../../hooks/useCDC';

export const ArtigoCDCRenderer: React.FC<{ artigo: ArtigoDataCDC }> = ({ artigo }) => {
  const renderHierarquia = () => {
    const partes: string[] = [];
    if (artigo.titulo) partes.push(`Título: ${artigo.titulo}`);
    if (artigo.capitulo) partes.push(`Capítulo: ${artigo.capitulo}`);
    if (artigo.secao) partes.push(`Seção: ${artigo.secao}`);
    if (partes.length === 0) return null;
    return <p className="text-xs text-gray-400 mb-1">{partes.join(' / ')}</p>;
  };
  
  return (
    <article className="mb-6 border-b border-gray-700 pb-6 px-2">
      {renderHierarquia()}
      <h3 className="text-lg font-semibold text-sky-400 mb-2">
        Art. {artigo.numero}{' '}
        <span className="text-xs text-gray-500">(p. {artigo.pagina})</span>
      </h3>
      {artigo.caput && <p className="mt-1 text-gray-200 leading-relaxed">{artigo.caput}</p>}
      
      {artigo.incisos?.map((inciso, i) => (
        // CDC incisos são numerados com romanos
        <p key={`inciso-cdc-${artigo.numero}-${i}`} className="pl-4 mt-1 text-gray-300">
         {inciso.texto.startsWith("I") || inciso.texto.startsWith("V") || inciso.texto.startsWith("X") ? inciso.texto : `${String.fromCharCode(97 + i)}) ${inciso.texto}` }
        </p>
      ))}

      {artigo.paragrafos?.map((par, i) => (
        <p key={`paragrafo-cdc-${artigo.numero}-${i}`} className="pl-4 mt-1 text-gray-300 italic">
          {par.rotulo === 'UNICO' || par.rotulo === 'Unico' || par.rotulo === 'Parágrafo único' || !par.rotulo
            ? 'Parágrafo único. ' 
            : `§ ${par.rotulo}º `} 
          {par.texto}
        </p>
      ))}
    </article>
  );
}
