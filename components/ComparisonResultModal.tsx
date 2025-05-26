
import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface ComparisonResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: string;
  error: string | null;
  isLoading: boolean;
  docAName?: string;
  docBName?: string;
}

export const ComparisonResultModal: React.FC<ComparisonResultModalProps> = ({
  isOpen,
  onClose,
  result,
  error,
  isLoading,
  docAName = "Documento A",
  docBName = "Documento B",
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="comparison-result-title">
      <div className="modal-content custom-scrollbar" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 id="comparison-result-title" className="text-xl font-semibold text-sky-400">
            Resultado da Comparação
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-200 p-1 rounded-full"
            aria-label="Fechar modal de resultado da comparação"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-10">
            <LoadingSpinner size="lg" />
            <p className="mt-3 text-gray-300">Comparando documentos...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="p-3 bg-red-900/30 border border-red-700 rounded-md text-sm text-red-300">
            <p><strong>Erro na Comparação:</strong></p>
            <p>{error}</p>
          </div>
        )}

        {result && !isLoading && !error && (
          <div>
            <p className="text-sm text-gray-400 mb-3">
              Comparação entre: <strong>{docAName}</strong> e <strong>{docBName}</strong>.
            </p>
            <div className="p-3 bg-gray-900 rounded-md max-h-[60vh] overflow-y-auto custom-scrollbar">
              <pre className="text-sm text-gray-200 whitespace-pre-wrap break-words">
                {result}
              </pre>
            </div>
          </div>
        )}
         {!isLoading && !error && !result && (
             <p className="text-gray-400 text-center py-5">Nenhum resultado para exibir.</p>
         )}
      </div>
    </div>
  );
};
