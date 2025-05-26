
// src/components/CPP/CPPViewer.tsx
import React, { useMemo } from 'react';
import { VariableSizeList as List } from 'react-window';
import { useCPP, type CPPTreeNode, type ArtigoCPP, type SecaoCPP } from '../../hooks/useCPP';
import { ArtigoCPPRenderer } from './ArtigoCPPRenderer';
import { LoadingSpinner } from '../LoadingSpinner';

export const CPPViewer: React.FC = () => {
  const { data: cppDataHierarquico, loading, error } = useCPP();

  const todosArtigos = useMemo(() => {
    if (!cppDataHierarquico) return [] as ArtigoCPP[];
    const acc: ArtigoCPP[] = [];
    
    const extrairArtigosRecursivamente = (itens: CPPTreeNode[], path: string[] = []) => {
      for (const item of itens) {
        // FIX: Use type-specific properties for nodeDescriptionForPath
        let nodeDescriptionForPath: string;
        if (item.tipo === 'ARTIGO') {
          // ArtigoCPP has 'numero' and 'caput', but for path, 'numero' is sufficient with 'ARTIGO' type
          nodeDescriptionForPath = `${item.tipo} ${item.numero}`;
        } else { 
          // Item is SecaoCPP which has 'numero_romano' (optional) and 'texto'
          const secaoItem = item as SecaoCPP;
          nodeDescriptionForPath = `${secaoItem.tipo} ${secaoItem.numero_romano || ''} ${secaoItem.texto || ''}`.trim();
        }
        const currentPath = [...path, nodeDescriptionForPath];

        if (item.tipo === 'ARTIGO') {
          const artigoComContexto = { 
            ...item,
            livro: currentPath.find(p => p.startsWith("LIVRO"))?.replace("LIVRO ",""),
            titulo: currentPath.find(p => p.startsWith("TITULO"))?.replace("TITULO ",""),
            capitulo: currentPath.find(p => p.startsWith("CAPITULO"))?.replace("CAPITULO ",""),
            secao: currentPath.find(p => p.startsWith("SECAO"))?.replace("SECAO ",""),
           };
          acc.push(artigoComContexto as ArtigoCPP);
        } else if ((item as SecaoCPP).filhos && (item as SecaoCPP).filhos.length > 0) {
          extrairArtigosRecursivamente((item as SecaoCPP).filhos, currentPath);
        }
      }
    };

    extrairArtigosRecursivamente(cppDataHierarquico);
    return acc.sort((a,b) => {
        if (a.pagina !== b.pagina) return a.pagina - b.pagina;
        const numA = parseInt(a.numero.replace(/\D/g,''));
        const numB = parseInt(b.numero.replace(/\D/g,''));
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
        return a.numero.localeCompare(b.numero);
    });
  }, [cppDataHierarquico]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-4">
        <LoadingSpinner size="lg" />
        <p className="text-lg mt-4">Carregando Código de Processo Penal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-red-400 p-4">
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 text-red-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <p className="text-lg">Falha ao carregar o CPP: {error}</p>
        <p className="text-sm">Verifique o console para mais detalhes e se o arquivo `cpp7_structured.json` está acessível em `public/cpp7/`.</p>
      </div>
    );
  }
  
  if (!todosArtigos || todosArtigos.length === 0) {
     return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-4">
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 text-gray-500">
           <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
         </svg>
        <p className="text-lg">Nenhum artigo encontrado no CPP.</p>
        <p className="text-sm">O arquivo `cpp7_structured.json` pode estar vazio ou malformado.</p>
      </div>
    );
  }
  
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style} className="px-1 py-1"> 
      <ArtigoCPPRenderer artigo={todosArtigos[index]} />
    </div>
  );
  
  const getItemSize = (index: number): number => {
    const artigo = todosArtigos[index];
    let size = 80; 
    size += Math.ceil((artigo.caput?.length || 0) / 70) * 20; // Approximate lines for caput
    artigo.incisos?.forEach(inc => size += Math.ceil((inc.texto?.length || 0) / 60) * 18 + 10);
    artigo.paragrafos?.forEach(par => size += Math.ceil((par.texto?.length || 0) / 60) * 18 + 10);
    return Math.max(100, size + 40); // Minimum size + padding
  };

  // Use window.innerHeight dynamically if possible, or a fixed large height.
  // Ensure the parent container of CPPViewer allows it to take full height.
  const listHeight = typeof window !== 'undefined' ? window.innerHeight - 80 : 600; // Fallback for SSR or test env

  return (
    <div className="flex-grow bg-gray-800 text-gray-100 p-1 md:p-2 overflow-hidden h-full">
        <List
          height={listHeight} 
          itemCount={todosArtigos.length}
          itemSize={getItemSize} 
          width="100%"
          className="custom-scrollbar"
        >
          {Row}
        </List>
    </div>
  );
}
