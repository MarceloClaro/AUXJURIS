
import React, { useState, useEffect, useCallback } from 'react';
import type { UploadedDocument, ComparisonSource } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface ComparisonSidebarProps {
  uploadedDocuments: UploadedDocument[];
  lastAiResponse: string;
  onFileForComparisonB: (file: File | null) => void;
  onStartComparison: () => void;
  isComparing: boolean;
  comparisonError: string | null;
  setDocumentForComparisonA_Id: (id: string | null) => void;
  setDocumentForComparisonA_Source: (source: ComparisonSource) => void;
  setDocumentForComparisonA_Text: (text: string) => void;
  // FIX: Add docBFileProcessing and docBFileError to props
  docBFileProcessing: boolean;
  docBFileError: string | null;
}

export const ComparisonSidebar: React.FC<ComparisonSidebarProps> = ({
  uploadedDocuments,
  lastAiResponse,
  onFileForComparisonB,
  onStartComparison,
  isComparing,
  comparisonError,
  setDocumentForComparisonA_Id,
  setDocumentForComparisonA_Source,
  setDocumentForComparisonA_Text,
  // FIX: Destructure new props
  docBFileProcessing,
  docBFileError,
}) => {
  const [selectedDocAId, setSelectedDocAId] = useState<string>('lastAiResponse'); // 'lastAiResponse' or doc.id
  const [docBFile, setDocBFile] = useState<File | null>(null);
  // FIX: Removed internal state for docBProcessing and docBError as they are now props
  // const [docBProcessing, setDocBProcessing] = useState<boolean>(false);
  // const [docBError, setDocBError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDocAId === 'lastAiResponse') {
      setDocumentForComparisonA_Id(null);
      setDocumentForComparisonA_Source('lastAiResponse');
      setDocumentForComparisonA_Text(lastAiResponse);
    } else {
      const doc = uploadedDocuments.find(d => d.id === selectedDocAId);
      if (doc) {
        setDocumentForComparisonA_Id(doc.id);
        setDocumentForComparisonA_Source('uploadedDocId');
        setDocumentForComparisonA_Text(doc.text);
      } else {
        // Fallback or handle error if doc not found (shouldn't happen if list is synced)
        setDocumentForComparisonA_Id(null);
        setDocumentForComparisonA_Source(null);
        setDocumentForComparisonA_Text('');
      }
    }
  }, [selectedDocAId, uploadedDocuments, lastAiResponse, setDocumentForComparisonA_Id, setDocumentForComparisonA_Source, setDocumentForComparisonA_Text]);


  // FIX: Simplify handleDocBChange. App.tsx (via onFileForComparisonB) now handles async logic and state updates.
  const handleDocBChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setDocBFile(file); // Keep for displaying file name locally
      onFileForComparisonB(file); // Notify parent to process the file
    } else {
      setDocBFile(null);
      onFileForComparisonB(null);
    }
  };

  const canStartComparison = selectedDocAId && docBFile && !isComparing && !docBFileProcessing;

  return (
    <div className="flex flex-col space-y-4 h-full">
      <h2 className="text-xl font-semibold text-sky-400 border-b border-gray-700 pb-2">Comparar Documentos</h2>
      
      <div>
        <label htmlFor="docASelect" className="block text-sm font-medium text-gray-300 mb-1">
          Documento A (Base):
        </label>
        <select
          id="docASelect"
          value={selectedDocAId}
          onChange={(e) => setSelectedDocAId(e.target.value)}
          className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-gray-100 text-sm"
          disabled={isComparing}
        >
          <option value="lastAiResponse">Última Resposta do Assistente</option>
          {uploadedDocuments.map(doc => (
            <option key={doc.id} value={doc.id}>
              {doc.name}
            </option>
          ))}
        </select>
        {selectedDocAId === 'lastAiResponse' && !lastAiResponse && (
            <p className="text-xs text-yellow-400 mt-1">Nenhuma resposta do assistente disponível ainda.</p>
        )}
      </div>

      <div>
        <label htmlFor="docBUpload" className="block text-sm font-medium text-gray-300 mb-1">
          Documento B (para Comparar):
        </label>
        <input
          type="file"
          id="docBUpload"
          accept=".pdf,.txt,.json"
          onChange={handleDocBChange}
          className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-700 disabled:opacity-50"
          disabled={isComparing || docBFileProcessing}
        />
         {/* FIX: Use docBFileProcessing prop for UI */}
         {docBFileProcessing && <div className="flex items-center mt-2"><LoadingSpinner size="sm" /><span className="ml-2 text-xs text-gray-300">Processando Doc B...</span></div>}
         {/* FIX: Use docBFileError prop for UI */}
         {docBFileError && <p className="text-xs text-red-400 mt-1">{docBFileError}</p>}
         {docBFile && !docBFileProcessing && !docBFileError && <p className="text-xs text-green-400 mt-1">{docBFile.name} pronto.</p>}
      </div>

      <button
        onClick={onStartComparison}
        disabled={!canStartComparison}
        className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isComparing ? <LoadingSpinner size="sm" /> : 'Iniciar Comparação'}
      </button>

      {comparisonError && !isComparing && (
        <div className="mt-2 p-2 bg-red-900/30 border border-red-700 rounded-md text-sm text-red-300">
          <p>{comparisonError}</p>
        </div>
      )}
    </div>
  );
};
