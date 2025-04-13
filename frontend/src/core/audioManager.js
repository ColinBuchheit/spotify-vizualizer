export function createAudioManager() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
  
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const gainNode = context.createGain();
    gainNode.gain.value = 0.5;
  
    let source;
  
    function loadAudio(audioEl) {
      source = context.createMediaElementSource(audioEl);
      source.connect(gainNode);
      gainNode.connect(analyser);
      analyser.connect(context.destination);
    }
  
    return {
      loadAudio,
      context,
      gainNode,
      getFrequencyData: () => {
        analyser.getByteFrequencyData(dataArray);
        return dataArray;
      }
    };
  }
  