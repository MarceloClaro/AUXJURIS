// src/components/Constituicao/ArtigoRenderer.tsx
import React from 'react';
import type { Artigo as ArtigoData } from '../../hooks/useCF88'; // Renomeado para evitar conflito

export const ArtigoRenderer: React.FC<{ artigo: ArtigoData }> = ({ artigo }) => {
  return (
    <article className="mb-6 border-b border-gray-700 pb-6 px-2">
      <h3 className="text-lg font-semibold text-sky-400 mb-2">
        Art. {artigo.numero}{' '}
        <span className="text-xs text-gray-500">(p. {artigo.pagina})</span>
      </h3>
      <p className="mt-1 text-gray-200 leading-relaxed">{artigo.caput}</p>
      {artigo.incisos?.map((inciso, i) => (
        <p key={`inciso-${i}`} className="pl-4 mt-1 text-gray-300">
          {inciso.numeroRomano || `${i+1}`}. {inciso.texto}
        </p>
      ))}
      {artigo.paragrafos?.map((par, i) => (
        <p key={`paragrafo-${i}`} className="pl-4 mt-1 text-gray-300 italic">
          {par.rotulo === 'UNICO' || par.rotulo === 'Unico' || !par.rotulo ? 'Parágrafo único. ' : `§ ${par.rotulo} `} 
          {par.texto}
        </p>
      ))}
    </article>
  );
}
