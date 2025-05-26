// src/hooks/useCP.ts
import { useEffect, useState } from 'react';
import { CP_JSON_URL } from '../constants';

export interface IncisoCP {
  texto: string;
  // numeroRomano?: string; // Se houver numeração romana/arábica nos incisos do CP
}
export interface ParagrafoCP {
  texto: string;
  rotulo?: string; // Ex: "UNICO", "1", "2", etc.
  // numero?: string; // Alternativa para rotulo
  // tipo?: string; // Se houver distinção explícita
}

export interface ArtigoCP {
  tipo: 'ARTIGO';
  numero: string;
  caput: string;
  incisos?: IncisoCP[];
  paragrafos?: ParagrafoCP[];
  pagina: number;
  livro?: string;
  titulo?: string;
  capitulo?: string;
  secao?: string;
}

export interface SecaoCP {
  tipo: 'LIVRO' | 'TITULO' | 'CAPITULO' | 'SECAO';
  texto: string; 
  numero_romano?: string; // Para LIVRO, TITULO, CAPITULO
  rotulo?: string; // Para SECAO, se usar 'rotulo' no JSON em vez de 'numero_romano'
  pagina: number;
  filhos: CPTreeNode[];
}

export type CPTreeNode = ArtigoCP | SecaoCP;

export function useCP() {
  const [data, setData] = useState<CPTreeNode[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(CP_JSON_URL)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status} ao buscar ${CP_JSON_URL}`);
        }
        return res.json();
      })
      .then((jsonData: CPTreeNode[]) => {
        setData(jsonData);
      })
      .catch(err => {
        console.error("Erro ao carregar cp8_structured.json:", err);
        setError(err.message || "Falha ao carregar dados do CP.");
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
