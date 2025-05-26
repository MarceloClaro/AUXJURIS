// src/components/Constituicao/ConstituicaoViewer.tsx
import React, { useMemo } from 'react';
// FIX: Changed FixedSizeList to VariableSizeList to support dynamic item heights.
import { VariableSizeList as List } from 'react-window';
import { useCF88, Seccao, Artigo } from '../../hooks/useCF88';
import { ArtigoRenderer } from './ArtigoRenderer';
import { LoadingSpinner } from '../LoadingSpinner';

export const ConstituicaoViewer: React.FC = () => {
  const { data: seccoesHierarquicas, loading } = useCF88();

  const todosArtigos = useMemo(() => {
    if (!seccoesHierarquicas) return [] as Artigo[];
    const acc: Artigo[] = [];
    
    const extrairArtigosRecursivamente = (itens: (Seccao | Artigo)[]) => {
      for (const item of itens) {
        if (item.tipo === 'ARTIGO') {
          acc.push(item as Artigo);
        } else if ((item as Seccao).filhos && (item as Seccao).filhos.length > 0) {
          extrairArtigosRecursivamente((item as Seccao).filhos);
        }
      }
    };

    extrairArtigosRecursivamente(seccoesHierarquicas);
    return acc.sort((a,b) => {
        // Primeiro por página
        if (a.pagina !== b.pagina) return a.pagina - b.pagina;
        // Depois por número do artigo (convertendo para número se possível)
        const numA = parseInt(a.numero.replace(/\D/g,'')); // Remove non-digits like '-A'
        const numB = parseInt(b.numero.replace(/\D/g,''));
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
        // Fallback para ordenação alfabética do número do artigo se não for numérico ou igual
        return a.numero.localeCompare(b.numero);
    });
  }, [seccoesHierarquicas]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-4">
        <LoadingSpinner size="lg" />
        <p className="text-lg mt-4">Carregando Constituição Federal de 1988...</p>
      </div>
    );
  }

  if (!todosArtigos || todosArtigos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-red-400 p-4">
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 text-red-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <p className="text-lg">Não foi possível carregar os dados da CF/88.</p>
        <p className="text-sm">Verifique o console para mais detalhes e se o arquivo `cf88_structured.json` está acessível em `public/cf88/`.</p>
      </div>
    );
  }
  
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style} className="px-1 py-1"> 
      <ArtigoRenderer artigo={todosArtigos[index]} />
    </div>
  );
  
  // Simple estimation, can be improved with dynamic measurement if needed
  const getItemSize = (index: number): number => {
    const artigo = todosArtigos[index];
    let size = 80; // Base for article title and page number
    size += Math.ceil((artigo.caput?.length || 0) / 60) * 20; // Caput lines
    artigo.incisos?.forEach(inc => size += Math.ceil((inc.texto?.length || 0) / 50) * 18 + 5);
    artigo.paragrafos?.forEach(par => size += Math.ceil((par.texto?.length || 0) / 50) * 18 + 5);
    return size + 40; // Padding and margins
  };

  return (
    <div className="flex-grow bg-gray-800 text-gray-100 p-1 md:p-2 overflow-hidden h-full">
        <List
          height={window.innerHeight - 80} // Adjust height considering potential headers/footers
          itemCount={todosArtigos.length}
          itemSize={getItemSize} // Pass the function directly for VariableSizeList
          width="100%"
          className="custom-scrollbar"
        >
          {Row}
        </List>
    </div>
  );
}