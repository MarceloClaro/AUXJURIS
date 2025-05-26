// src/components/CP/ArtigoCPRenderer.tsx
import React from 'react';
import type { ArtigoCP as ArtigoDataCP } from '../../hooks/useCP';

export const ArtigoCPRenderer: React.FC<{ artigo: ArtigoDataCP }> = ({ artigo }) => {
  const renderHierarquia = () => {
    const partes: string[] = [];
    if (artigo.livro) partes.push(`Livro: ${artigo.livro}`);
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
        // No cp8_structured.json, incisos parecem não ter 'numeroRomano', apenas 'texto'
        <p key={`inciso-cp-${artigo.numero}-${i}`} className="pl-4 mt-1 text-gray-300">
         {String.fromCharCode(97 + i)}) {inciso.texto} {/* Assumindo alíneas a), b), c)... */}
        </p>
      ))}

      {artigo.paragrafos?.map((par, i) => (
        <p key={`paragrafo-cp-${artigo.numero}-${i}`} className="pl-4 mt-1 text-gray-300 italic">
          {par.rotulo === 'UNICO' || par.rotulo === 'Unico' || par.rotulo === 'Parágrafo único' || !par.rotulo
            ? 'Parágrafo único. ' 
            : `§ ${par.rotulo} `} 
          {par.texto}
        </p>
      ))}
    </article>
  );
}
