
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadAreaProps { // Renamed from PdfUploadAreaProps
  onFilesSelect: (files: File[]) => void;
  onProcessFiles: () => void; // Renamed from onProcessPdfs
  isProcessing: boolean;
  maxFiles: number;
  currentFileCount: number;
}

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({ onFilesSelect, onProcessFiles, isProcessing, maxFiles, currentFileCount }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    if (rejectedFiles && rejectedFiles.length > 0) {
        const firstRejection = rejectedFiles[0];
        if (firstRejection.errors) {
            const firstError = firstRejection.errors[0];
            if (firstError.code === 'file-too-large') {
                setError("Um ou mais arquivos são muito grandes.");
            } else if (firstError.code === 'file-invalid-type') {
                setError("Tipo de arquivo inválido. Apenas PDF, JSON ou TXT são permitidos."); // Updated error message
            } else if (firstError.code === 'too-many-files') {
                 setError(`Muitos arquivos. Máximo de ${maxFiles} permitido.`);
            } else {
                setError(firstError.message || "Erro ao selecionar arquivo.");
            }
        } else {
            setError("Erro ao validar arquivos.");
        }
        return;
    }

    if (acceptedFiles.length > 0) {
        const totalFiles = currentFileCount + acceptedFiles.length; // This logic seems ok but depends on how App handles `uploadedDocuments` before processing.
                                                                 // If `onFilesSelect` replaces, then currentFileCount should be 0 for this check, or based on already *processed* files.
                                                                 // Assuming `onFilesSelect` effectively resets and these are the *new* batch.
        if (acceptedFiles.length > maxFiles) { // Check against acceptedFiles.length directly if it's a fresh selection batch
            setError(`Você pode selecionar no máximo ${maxFiles} arquivos de uma vez. Você tentou adicionar ${acceptedFiles.length}.`);
            return;
        }
        // If onFilesSelect *adds* to existing, then the logic should be:
        // if (currentFileCount + acceptedFiles.length > maxFiles) { ... }
        // For now, assuming onFilesSelect in App.tsx correctly sets `uploadedDocuments` which `currentFileCount` reflects.
        // The original logic might be best if `onFilesSelect` in parent `App.tsx` resets `uploadedDocuments` to only the newly selected files.

        setSelectedFiles(acceptedFiles); 
        onFilesSelect(acceptedFiles); 
    }
  }, [onFilesSelect, maxFiles, currentFileCount]); // currentFileCount dependency is important here

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      'application/pdf': ['.pdf'],
      'application/json': ['.json'],
      'text/plain': ['.txt'] 
    }, // Updated accept types
    maxFiles: maxFiles, // This maxFiles in useDropzone will enforce it per drop operation.
    multiple: true,
  });

  const handleRemoveFile = (fileName: string) => {
    const newFiles = selectedFiles.filter(file => file.name !== fileName);
    setSelectedFiles(newFiles);
    onFilesSelect(newFiles); 
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ease-in-out
                    ${isDragActive ? 'border-sky-500 bg-sky-900/30' : 'border-gray-600 hover:border-sky-400'}
                    ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} disabled={isProcessing} />
        <div className="flex flex-col items-center justify-center text-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400 mb-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          {isDragActive ? (
            <p className="text-sky-400">Solte os arquivos aqui...</p>
          ) : (
            <p className="text-gray-400">Arraste e solte até {maxFiles} arquivos (PDF, JSON, TXT) aqui, ou clique para selecionar.</p> // Updated text
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {selectedFiles.length > 0 && (
        <div className="mt-3">
          <h4 className="text-sm font-semibold text-gray-300 mb-1">Arquivos selecionados:</h4>
          <ul className="list-disc list-inside text-xs text-gray-400 space-y-1 max-h-32 overflow-y-auto">
            {selectedFiles.map(file => (
              <li key={file.name} className="flex justify-between items-center">
                <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                {!isProcessing && (
                  <button 
                    onClick={() => handleRemoveFile(file.name)}
                    className="text-red-400 hover:text-red-600 text-xs"
                    title="Remover arquivo"
                  >
                    &#x2715;
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
