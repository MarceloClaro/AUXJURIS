
// Fix: Import useEffect from React
import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadAreaProps {
  onFilesSelect: (files: File[]) => void;
  onProcessFiles: () => void; 
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
                setError("Tipo de arquivo inválido. Apenas PDF, JSON ou TXT são permitidos.");
            } else if (firstError.code === 'too-many-files') {
                 setError(`Muitos arquivos. Máximo de ${maxFiles} permitido.`);
            } else {
                setError(firstError.message || "Erro ao selecionar arquivo.");
            }
        } else {
            setError("Erro ao validar arquivos.");
        }
        setSelectedFiles([]); // Clear selection on rejection
        onFilesSelect([]); // Notify parent of cleared selection
        return;
    }

    if (acceptedFiles.length > 0) {
        // This check is primarily handled by useDropzone's maxFiles, 
        // but good for an additional layer or different logic if needed.
        // For now, useDropzone's `maxFiles` handles the per-drop limit.
        // The `currentFileCount` would be for total accumulated files if selection was additive.
        // Since onFilesSelect typically replaces the current selection list in App.tsx,
        // we mostly care about the `acceptedFiles.length` for the current drop.
        if (acceptedFiles.length > maxFiles) { 
            setError(`Você pode selecionar no máximo ${maxFiles} arquivos de uma vez. Você tentou adicionar ${acceptedFiles.length}.`);
            setSelectedFiles([]);
            onFilesSelect([]);
            return;
        }
        setSelectedFiles(acceptedFiles); 
        onFilesSelect(acceptedFiles); 
    }
  }, [onFilesSelect, maxFiles]); // currentFileCount removed as onFilesSelect replaces files

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      'application/pdf': ['.pdf'],
      'application/json': ['.json'],
      'text/plain': ['.txt'] 
    },
    maxFiles: maxFiles, 
    multiple: true,
  });

  const handleRemoveFile = (fileName: string) => {
    const newFiles = selectedFiles.filter(file => file.name !== fileName);
    setSelectedFiles(newFiles);
    onFilesSelect(newFiles); 
  };

  // This effect ensures that if the parent component clears `uploadedDocuments` (and thus `currentFileCount` becomes 0),
  // the local `selectedFiles` state here is also cleared.
  useEffect(() => {
    if (currentFileCount === 0 && selectedFiles.length > 0) {
        setSelectedFiles([]);
    }
  }, [currentFileCount, selectedFiles.length]);

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ease-in-out
                    ${isDragActive ? 'border-sky-500 bg-sky-900/30' : 'border-gray-600 hover:border-sky-400'}
                    ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        role="button"
        aria-label="Área para soltar arquivos. Arraste e solte ou clique para selecionar arquivos."
        tabIndex={isProcessing ? -1 : 0}
      >
        <input {...getInputProps()} disabled={isProcessing} />
        <div className="flex flex-col items-center justify-center text-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400 mb-3" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          {isDragActive ? (
            <p className="text-sky-400">Solte os arquivos aqui...</p>
          ) : (
            <p className="text-gray-400">Arraste e solte até {maxFiles} arquivos (PDF, JSON, TXT) aqui, ou clique para selecionar.</p>
          )}
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {selectedFiles.length > 0 && !isProcessing && ( // Hide selected files list if processing starts
        <div className="mt-3">
          <h4 className="text-sm font-semibold text-gray-300 mb-1">Arquivos selecionados ({selectedFiles.length}):</h4>
          <ul className="list-none p-0 m-0 text-xs text-gray-400 space-y-1 max-h-32 overflow-y-auto">
            {selectedFiles.map(file => (
              <li key={file.name} className="flex justify-between items-center p-1 bg-gray-700 rounded">
                <span className="truncate pr-2" title={file.name}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                {!isProcessing && (
                  <button 
                    onClick={() => handleRemoveFile(file.name)}
                    className="text-red-400 hover:text-red-600 text-xs font-bold p-1"
                    title={`Remover arquivo ${file.name}`}
                    aria-label={`Remover arquivo ${file.name}`}
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