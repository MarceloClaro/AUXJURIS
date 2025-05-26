// src/components/CDC/CDCViewer.tsx
import React, { useMemo } from 'react';
import { VariableSizeList as List } from 'react-window';
import { useCDC, type CDCTreeNode, type ArtigoCDC, type SecaoCDC } from '../../hooks/useCDC';
import { ArtigoCDCRenderer } from './ArtigoCDCRenderer';
import { LoadingSpinner } from '../LoadingSpinner';

export const CDCViewer: React.FC = () => {
  const { data: cdcDataHierarquico, loading, error } = useCDC();

  const todosArtigos = useMemo(() => {
    if (!cdcDataHierarquico) return [] as ArtigoCDC[];
    const acc: ArtigoCDC[] = [];
    
    const extrairArtigosRecursivamente = (itens: CDCTreeNode[], pathParts: {titulo?: string, capitulo?: string, secao?: string} = {}) => {
      for (const item of itens) {
        let currentPathParts = {...pathParts};
        if (item.tipo === 'TITULO') currentPathParts.titulo = `${item.rotulo || ''} ${item.texto || ''}`.trim();
        if (item.tipo === 'CAPITULO') currentPathParts.capitulo = `${item.rotulo || ''} ${item.texto || ''}`.trim();
        if (item.tipo === 'SECAO') currentPathParts.secao = `${item.rotulo || ''} ${item.texto || ''}`.trim();

        if (item.tipo === 'ARTIGO') {
          const artigoComContexto = { 
            ...item,
            ...currentPathParts
           };
          acc.push(artigoComContexto as ArtigoCDC);
        } else if ((item as SecaoCDC).filhos && (item as SecaoCDC).filhos.length > 0) {
          extrairArtigosRecursivamente((item as SecaoCDC).filhos, currentPathParts);
        }
      }
    };

    extrairArtigosRecursivamente(cdcDataHierarquico);
    return acc.sort((a,b) => {
        if (a.pagina !== b.pagina) return a.pagina - b.pagina;
        const numA = parseInt(a.numero.replace(/\D/g,''));
        const numB = parseInt(b.numero.replace(/\D/g,''));
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
        return a.numero.localeCompare(b.numero);
    });
  }, [cdcDataHierarquico]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-4">
        <LoadingSpinner size="lg" />
        <p className="text-lg mt-4">Carregando Código de Defesa do Consumidor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-red-400 p-4">
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 text-red-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <p className="text-lg">Falha ao carregar o CDC: {error}</p>
        <p className="text-sm">Verifique o console para mais detalhes e se o arquivo `cdc2013_structured.json` está acessível em `public/cdc2013/`.</p>
      </div>
    );
  }
  
  if (!todosArtigos || todosArtigos.length === 0) {
     return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-4">
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 text-gray-500">
           <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
         </svg>
        <p className="text-lg">Nenhum artigo encontrado no Código de Defesa do Consumidor.</p>
        <p className="text-sm">O arquivo `cdc2013_structured.json` pode estar vazio ou malformado.</p>
      </div>
    );
  }
  
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style} className="px-1 py-1"> 
      <ArtigoCDCRenderer artigo={todosArtigos[index]} />
    </div>
  );
  
  const getItemSize = (index: number): number => {
    const artigo = todosArtigos[index];
    let size = 80; 
    size += Math.ceil((artigo.caput?.length || 0) / 70) * 20; 
    artigo.incisos?.forEach(inc => size += Math.ceil((inc.texto?.length || 0) / 60) * 18 + 10);
    artigo.paragrafos?.forEach(par => size += Math.ceil((par.texto?.length || 0) / 60) * 18 + 10);
    return Math.max(100, size + 40); 
  };

  const listHeight = typeof window !== 'undefined' ? window.innerHeight - 80 : 600; 

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
