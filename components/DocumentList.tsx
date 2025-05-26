import React, { useState } from 'react';
import type { UploadedDocument, SwotAnalysis } from '../types'; // Updated import
import { LoadingSpinner } from './LoadingSpinner';

interface DocumentListProps {
  documents: UploadedDocument[]; // Changed from RagDataItem[] to UploadedDocument[]
  onAnalyzeDocument: (documentId: string) => void;
}

const ExpandableSection: React.FC<{ title: string; content?: string | SwotAnalysis }> = ({ title, content }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!content) return null;

  const renderContent = () => {
    if (typeof content === 'string') {
      return <p className="text-xs text-gray-300 whitespace-pre-wrap">{content}</p>;
    }
    // SWOT Analysis object
    return (
      <div className="space-y-1 text-xs text-gray-300">
        {content.strengths && <p><strong>Forças:</strong> {content.strengths}</p>}
        {content.weaknesses && <p><strong>Fraquezas:</strong> {content.weaknesses}</p>}
        {content.opportunities && <p><strong>Oportunidades:</strong> {content.opportunities}</p>}
        {content.threats && <p><strong>Ameaças:</strong> {content.threats}</p>}
      </div>
    );
  };

  return (
    <div className="py-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full text-left text-xs text-sky-300 hover:text-sky-200 focus:outline-none"
      >
        <span>{title}</span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && <div className="mt-1 p-2 bg-gray-600/30 rounded">{renderContent()}</div>}
    </div>
  );
};

export const DocumentList: React.FC<DocumentListProps> = ({ documents, onAnalyzeDocument }) => {
  if (!documents || documents.length === 0) {
    return <p className="text-sm text-gray-400">Nenhum documento carregado ou processado.</p>;
  }

  return (
    <div className="bg-gray-700/50 p-3 rounded-lg max-h-96 overflow-y-auto custom-scrollbar">
      <ul className="space-y-3">
        {documents.map((doc) => (
          <li key={doc.id} className="text-sm text-gray-300 p-3 bg-gray-700 rounded-md shadow">
            <div className="flex justify-between items-center mb-2">
              <strong className="text-sky-400 truncate" title={doc.name}>{doc.name}</strong>
              {doc.text && !doc.summary && !doc.processingAnalysis && !doc.analysisError && (
                <button
                  onClick={() => onAnalyzeDocument(doc.id)}
                  className="text-xs bg-teal-500 hover:bg-teal-600 text-white py-1 px-2 rounded"
                  disabled={doc.processingAnalysis}
                >
                  Analisar Documento
                </button>
              )}
              {doc.processingAnalysis && (
                <div className="flex items-center text-xs text-yellow-400">
                  <LoadingSpinner size="sm" />
                  <span className="ml-1">Analisando...</span>
                </div>
              )}
            </div>
            
            {!doc.text && !doc.processingAnalysis && (
                 <p className="text-xs text-yellow-400">Aguardando extração de texto...</p>
            )}
            {doc.analysisError && (
              <p className="text-xs text-red-400 mt-1">Erro na análise: {doc.analysisError}</p>
            )}

            {doc.summary && <ExpandableSection title="Resumo" content={doc.summary} />}
            {doc.insights && <ExpandableSection title="Insights" content={doc.insights} />}
            {doc.swot && (doc.swot.strengths || doc.swot.weaknesses || doc.swot.opportunities || doc.swot.threats) && (
              <ExpandableSection title="Análise SWOT" content={doc.swot} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
