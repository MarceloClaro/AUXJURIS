
import { useState, useCallback, useEffect } from 'react';

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSynthesis, setSpeechSynthesis] = useState<SpeechSynthesis | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSynthesis(window.speechSynthesis);
    } else {
      const noSupportMessage = "Text-to-speech não é suportado neste navegador.";
      console.warn(noSupportMessage);
      setTtsError(noSupportMessage);
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!speechSynthesis || !text) {
      if (!speechSynthesis) setTtsError("API de Síntese de Fala não disponível.");
      return;
    }
    setTtsError(null); // Clear previous errors

    // Cancel any ongoing speech before starting a new one
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = speechSynthesis.getVoices();
    const ptBrVoice = voices.find(voice => voice.lang === 'pt-BR');
    if (ptBrVoice) {
      utterance.voice = ptBrVoice;
    } else {
        console.warn("Nenhuma voz em pt-BR encontrada, usando a voz padrão.");
    }
    
    utterance.lang = 'pt-BR';
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      // Log more detailed error information
      let errorMessage = "Erro na síntese de fala";
      if (event.error) {
        switch (event.error) {
          case 'not-allowed':
            errorMessage = "Síntese de fala não permitida. Verifique as permissões do navegador.";
            break;
          case 'language-unavailable':
            errorMessage = "Idioma para síntese de fala (pt-BR) não disponível.";
            break;
          case 'voice-unavailable':
            errorMessage = "Voz para síntese de fala (pt-BR) não disponível.";
            break;
          case 'synthesis-failed':
            errorMessage = "Falha na síntese de fala. Tente novamente.";
            break;
          case 'audio-busy':
            errorMessage = "Dispositivo de áudio ocupado.";
            break;
          case 'audio-hardware':
            errorMessage = "Erro de hardware de áudio.";
            break;
          default:
            errorMessage = `Erro na síntese de fala: ${event.error}`;
        }
      } else {
        errorMessage = `Erro na síntese de fala: evento de erro desconhecido.`;
      }
      console.error("SpeechSynthesisErrorEvent:", event, "Specific error:", event.error);
      setTtsError(errorMessage);
      setIsSpeaking(false);
    };
    
    speechSynthesis.speak(utterance);
  }, [speechSynthesis]);

  const cancelSpeech = useCallback(() => {
    if (speechSynthesis && speechSynthesis.speaking) {
      speechSynthesis.cancel(); // This will trigger the 'onend' event
    }
    // Explicitly set isSpeaking to false in case onend is not triggered reliably
    setIsSpeaking(false); 
  }, [speechSynthesis]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (speechSynthesis && speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
    };
  }, [speechSynthesis]);

  return { speak, cancelSpeech, isSpeaking, ttsError, supported: !!speechSynthesis };
};
