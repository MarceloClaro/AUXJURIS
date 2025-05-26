// src/hooks/useCPP.ts
import { useEffect, useState } from 'react';
import { CPP_JSON_URL } from '../constants'; // Importando a URL do JSON do CPP

// Interfaces para a estrutura do cpp7_structured.json
// Estas são baseadas na estrutura implícita e podem precisar de ajuste fino
// conforme a estrutura real do seu JSON se tornar mais detalhada.

export interface ArtigoCPP {
  tipo: 'ARTIGO';
  numero: string;
  caput: string;
  incisos?: { texto: string; numeroRomano?: string; alineas?: string[] }[]; // Adicionado numeroRomano e alineas
  paragrafos?: { texto: string; rotulo?: string; numero?:string; tipo?: string }[]; // Adicionado numero e tipo
  pagina: number;
  // Adicione outros campos se existirem no seu JSON, como 'livro', 'titulo', 'capitulo', 'secao' para contexto
  livro?: string;
  titulo?: string;
  capitulo?: string;
  secao?: string;
}

export interface SecaoCPP {
  tipo: 'LIVRO' | 'TITULO' | 'CAPITULO' | 'SECAO'; // Tipos hierárquicos
  texto: string; // Nome da seção/capítulo/título/livro
  numero_romano?: string; // Número romano, se aplicável
  pagina: number;
  filhos: CPPTreeNode[];
}

export type CPPTreeNode = ArtigoCPP | SecaoCPP;

export function useCPP() {
  const [data, setData] = useState<CPPTreeNode[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(CPP_JSON_URL) // Usando a constante para o caminho do arquivo
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status} ao buscar ${CPP_JSON_URL}`);
        }
        return res.json();
      })
      .then((jsonData: CPPTreeNode[]) => {
        setData(jsonData);
      })
      .catch(err => {
        console.error("Erro ao carregar cpp7_structured.json:", err);
        setError(err.message || "Falha ao carregar dados do CPP.");
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
