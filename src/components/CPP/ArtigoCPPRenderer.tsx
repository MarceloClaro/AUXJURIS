// src/components/CPP/ArtigoCPPRenderer.tsx
import React from 'react';
import type { ArtigoCPP as ArtigoDataCPP } from '../../hooks/useCPP';

export const ArtigoCPPRenderer: React.FC<{ artigo: ArtigoDataCPP }> = ({ artigo }) => {
  return (
    <article className="mb-6 border-b border-gray-700 pb-6 px-2">
      <h3 className="text-lg font-semibold text-sky-400 mb-2">
        Art. {artigo.numero}{' '}
        <span className="text-xs text-gray-500">(p. {artigo.pagina})</span>
      </h3>
      {artigo.caput && <p className="mt-1 text-gray-200 leading-relaxed">{artigo.caput}</p>}
      
      {artigo.incisos?.map((inciso, i) => (
        <div key={`inciso-${artigo.numero}-${i}`} className="pl-4 mt-1 text-gray-300">
          <p>
            {inciso.numeroRomano || `${i + 1}`}. {inciso.texto}
          </p>
          {/* Renderizar alíneas se existirem */}
          {inciso.alineas?.map((alinea, idxAlinea) => (
             <p key={`alinea-${artigo.numero}-${i}-${idxAlinea}`} className="pl-8 text-gray-400">
               {String.fromCharCode(97 + idxAlinea)}) {alinea}
             </p>
          ))}
        </div>
      ))}

      {artigo.paragrafos?.map((par, i) => (
        <p key={`paragrafo-${artigo.numero}-${i}`} className="pl-4 mt-1 text-gray-300 italic">
          {par.rotulo === 'UNICO' || par.rotulo === 'Unico' || (par.numero && par.numero.toLowerCase() === 'único') || !par.rotulo && !par.numero
            ? 'Parágrafo único. ' 
            : `§ ${par.rotulo || par.numero || (i+1)}º `} 
          {par.texto}
        </p>
      ))}
    </article>
  );
}
