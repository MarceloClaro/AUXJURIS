// src/hooks/useCF88.ts
import { useEffect, useState } from 'react';

// As interfaces precisam corresponder à estrutura do seu cf88_structured.json
export interface Inciso {
  texto: string;
  numeroRomano?: string; // Adicionado para compatibilidade com ArtigoRenderer
}
export interface Paragrafo {
  rotulo: string;
  texto: string;
  tipo?: string; // Adicionado para compatibilidade com ArtigoRenderer
}
export interface Artigo {
  tipo: 'ARTIGO';
  numero: string;
  caput: string;
  incisos?: Inciso[];
  paragrafos?: Paragrafo[];
  pagina: number;
}
export interface Seccao {
  tipo: 'SECAO' | 'CAPITULO' | 'TITULO';
  texto: string; // Nome da seção/capítulo/título
  numero_romano?: string; // Número romano, se aplicável
  pagina: number;
  filhos: (Seccao | Artigo)[];
}

export function useCF88() {
  const [data, setData] = useState<Seccao[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('/cf88/cf88_structured.json') // Caminho para o arquivo na pasta public
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((jsonData: Seccao[]) => { // Tipar jsonData
        setData(jsonData);
      })
      .catch(err => {
        console.error("Erro ao carregar cf88_structured.json:", err);
        setError(err.message || "Falha ao carregar dados da CF/88.");
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
