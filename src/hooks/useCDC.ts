// src/hooks/useCDC.ts
import { useEffect, useState } from 'react';
import { CDC_JSON_URL } from '../constants';

export interface IncisoCDC {
  texto: string;
  // numeroRomano?: string; // Se houver numeração nos incisos do CDC
}
export interface ParagrafoCDC {
  texto: string;
  rotulo?: string; // Ex: "UNICO", "1", "2", etc.
  // numero?: string; 
  // tipo?: string;
}

export interface ArtigoCDC {
  tipo: 'ARTIGO';
  numero: string;
  caput: string;
  incisos?: IncisoCDC[];
  paragrafos?: ParagrafoCDC[];
  pagina: number;
  titulo?: string; // Contexto
  capitulo?: string;
  secao?: string;
}

export interface SecaoCDC {
  tipo: 'TITULO' | 'CAPITULO' | 'SECAO'; // CDC JSON parece começar com TÍTULO
  texto: string; 
  rotulo?: string; // Para número romano/arábico
  pagina: number;
  filhos: CDCTreeNode[];
}

export type CDCTreeNode = ArtigoCDC | SecaoCDC;

export function useCDC() {
  const [data, setData] = useState<CDCTreeNode[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(CDC_JSON_URL)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status} ao buscar ${CDC_JSON_URL}`);
        }
        return res.json();
      })
      .then((jsonData: CDCTreeNode[]) => {
        setData(jsonData);
      })
      .catch(err => {
        console.error("Erro ao carregar cdc2013_structured.json:", err);
        setError(err.message || "Falha ao carregar dados do CDC.");
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
