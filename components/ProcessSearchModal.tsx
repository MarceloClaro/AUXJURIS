import React, { useState } from 'react';
import axios, { AxiosError } from 'axios'; // axios é importado via importmap
import { LoadingSpinner } from './LoadingSpinner';

interface ProcessSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string; // DATAJUD_API_KEY
}

// Defina uma interface para a estrutura esperada da resposta da API DataJud, se conhecida.
// Exemplo básico:
interface DataJudResponse {
  hits?: {
    total?: { value?: number };
    hits?: any[]; // Detalhe mais essa estrutura se souber o formato dos 'hits'
  };
  // Adicione outros campos conforme a API
  [key: string]: any; // Permite outras propriedades
}

interface ApiErrorResponse {
  erro?: string;
  message?: string; // Algumas APIs de erro retornam 'message'
  error?: any; // Outras podem ter um objeto 'error'
}

export const ProcessSearchModal: React.FC<ProcessSearchModalProps> = ({ isOpen, onClose, apiKey }) => {
  const [numeroProcesso, setNumeroProcesso] = useState('');
  const [resultado, setResultado] = useState<DataJudResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const DATAJUD_CNJ_ENDPOINT = 'https://api-publica.datajud.cnj.jus.br/api_publica_tjce/_search';
  // Para usar com o seu proxy backend:
  // const PROXY_ENDPOINT = 'http://localhost:3001/consulta-processo'; 

  const buscarProcesso = async () => {
    if (!numeroProcesso.trim()) {
      setError("Por favor, insira um número de processo.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResultado(null);

    const query = {
      query: {
        match: {
          numeroProcesso: numeroProcesso.trim()
        }
      }
    };

    try {
      // ** IMPORTANTE SOBRE CORS **
      // A chamada direta abaixo para DATAJUD_CNJ_ENDPOINT provavelmente falhará
      // devido à política de CORS da API do DataJud.
      // Para produção, você DEVE usar um backend proxy.
      // Se você tem seu backend proxy (ex: Node.js) rodando em http://localhost:3001,
      // substitua DATAJUD_CNJ_ENDPOINT por PROXY_ENDPOINT na chamada axios.post.
      // Ex: const response = await axios.post<DataJudResponse>(PROXY_ENDPOINT, query);
      // E remova o header 'Authorization' daqui, pois seu proxy o adicionaria.

      const response = await axios.post<DataJudResponse>(DATAJUD_CNJ_ENDPOINT, query, {
        headers: {
          'Authorization': `APIKey ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      setResultado(response.data);
    } catch (err) {
      console.error('Erro ao consultar processo:', err);
      let errorMessage = "Erro desconhecido ao consultar processo.";
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<ApiErrorResponse>;
        if (axiosError.message.includes("Network Error")) {
             errorMessage = "Erro de rede. Verifique sua conexão ou se um proxy CORS é necessário e está configurado corretamente. A API do DataJud geralmente bloqueia requisições diretas do navegador.";
        } else if (axiosError.response) {
          const responseData = axiosError.response.data;
          errorMessage = `Erro da API (${axiosError.response.status}): ${responseData?.erro || responseData?.message || JSON.stringify(responseData?.error) || axiosError.message}`;
        } else {
          errorMessage = axiosError.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="process-search-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 id="process-search-title" className="text-2xl font-semibold text-sky-400">Consultar Processo Judicial</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-200"
            aria-label="Fechar modal de consulta de processo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="numeroProcesso" className="block text-sm font-medium text-gray-300 mb-1">
              Número do Processo:
            </label>
            <input
              type="text"
              id="numeroProcesso"
              value={numeroProcesso}
              onChange={(e) => setNumeroProcesso(e.target.value)}
              placeholder="Digite o número do processo"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-400 text-gray-100"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={buscarProcesso}
            disabled={isLoading || !numeroProcesso.trim()}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? <LoadingSpinner size="sm" /> : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                Buscar
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-md">
            <p className="text-red-400 text-sm">{error}</p>
            {error.includes("CORS") &&
                 <p className="text-yellow-400 text-xs mt-2">
                    **Nota sobre CORS:** A API do DataJud requer que as chamadas sejam feitas a partir de um servidor (backend proxy).
                    Se você estiver vendo um erro de CORS, configure seu backend proxy (como o exemplo Node.js fornecido)
                    e aponte a URL da requisição no código para o seu proxy (ex: `http://localhost:3001/consulta-processo`).
                 </p>
            }
          </div>
        )}

        {resultado && (
          <div className="mt-6">
            <h3 className="text-xl font-semibold text-gray-200 mb-2">Resultado da Consulta:</h3>
            <div className="p-3 bg-gray-900 rounded-md max-h-80 overflow-y-auto custom-scrollbar">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap break-all">
                {JSON.stringify(resultado, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
