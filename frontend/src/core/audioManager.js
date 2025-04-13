export function createAudioManager() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create analyzer with higher FFT size for better resolution
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024; // Larger FFT size for more detailed data
    analyser.smoothingTimeConstant = 0.8; // Smoother transitions
    
    // Create arrays for frequency and time domain data
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    const timeDomainData = new Uint8Array(analyser.frequencyBinCount);
    
    // Create gain node for volume control
    const gainNode = context.createGain();
    gainNode.gain.value = 0.5;
    
    // Create filters for different frequency ranges
    const lowpassFilter = context.createBiquadFilter();
    lowpassFilter.type = 'lowpass';
    lowpassFilter.frequency.value = 200;
    
    const bandpassFilter = context.createBiquadFilter();
    bandpassFilter.type = 'bandpass';
    bandpassFilter.frequency.value = 1000;
    bandpassFilter.Q.value = 1;
    
    const highpassFilter = context.createBiquadFilter();
    highpassFilter.type = 'highpass';
    highpassFilter.frequency.value = 3000;
    
    // Create analyzers for each frequency range
    const bassAnalyser = context.createAnalyser();
    bassAnalyser.fftSize = 256;
    const bassData = new Uint8Array(bassAnalyser.frequencyBinCount);
    
    const midAnalyser = context.createAnalyser();
    midAnalyser.fftSize = 256;
    const midData = new Uint8Array(midAnalyser.frequencyBinCount);
    
    const trebleAnalyser = context.createAnalyser();
    trebleAnalyser.fftSize = 256;
    const trebleData = new Uint8Array(trebleAnalyser.frequencyBinCount);
    
    let audioElement = null;
    let mediaSource = null;
    let spotifyPlayer = null;
    let isPlaying = false;
    
    // Connect to Spotify Web Playback SDK
    function connectToSpotifyPlayer(player) {
      spotifyPlayer = player;
      
      // Check if the browser supports AudioContext.createMediaElementSource for Spotify
      try {
        // If we have access to the Spotify audio element through the SDK
        if (player._eventListeners && player._eventListeners.player_state_changed) {
          // This is a workaround to tap into the Spotify audio stream
          player.addListener('player_state_changed', (state) => {
            if (state && state.paused === false && !isPlaying) {
              isPlaying = true;
              // Activate audio context if it's suspended (browser policy)
              if (context.state === 'suspended') {
                context.resume();
              }
            } else if (state && state.paused === true) {
              isPlaying = false;
            }
          });
        }
      } catch (error) {
        console.error("Couldn't connect to Spotify player audio:", error);
      }
    }
    
    // Function to load audio from an HTML audio element
    function loadAudio(element) {
      audioElement = element;
      
      // Disconnect previous source if it exists
      if (mediaSource) {
        mediaSource.disconnect();
      }
      
      // Create and connect new media source
      mediaSource = context.createMediaElementSource(element);
      
      // Connect main audio path
      mediaSource.connect(gainNode);
      gainNode.connect(analyser);
      analyser.connect(context.destination);
      
      // Connect frequency-specific analyzers
      mediaSource.connect(lowpassFilter);
      lowpassFilter.connect(bassAnalyser);
      
      mediaSource.connect(bandpassFilter);
      bandpassFilter.connect(midAnalyser);
      
      mediaSource.connect(highpassFilter);
      highpassFilter.connect(trebleAnalyser);
      
      // Start audio
      if (context.state === 'suspended') {
        context.resume();
      }
    }
    
    // Function to load audio from a URL
    async function loadAudioFromUrl(url) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.src = url;
      
      // Wait for audio to be loaded enough to play
      await new Promise((resolve) => {
        audio.addEventListener('canplay', resolve, { once: true });
        audio.load();
      });
      
      loadAudio(audio);
      return audio;
    }
    
    // Set volume level (0-1)
    function setVolume(level) {
      if (gainNode) {
        gainNode.gain.value = level;
      }
    }
    
    // Generate audio data for testing/fallback when no audio is playing
    function generateTestData() {
      const time = Date.now() / 1000;
      
      for (let i = 0; i < frequencyData.length; i++) {
        // Create some oscillating patterns
        const value = 
          128 + // base value
          30 * Math.sin(time * 2 + i * 0.05) + // slower oscillation
          20 * Math.sin(time * 5 + i * 0.1) + // faster oscillation
          10 * Math.sin(time * 13 + i * 0.2); // high-frequency detail
          
        // Scale down higher frequencies for more natural look
        const normalizedIndex = i / frequencyData.length;
        const scaleFactor = 1 - (normalizedIndex * 0.5);
        
        frequencyData[i] = Math.max(0, Math.min(255, value * scaleFactor));
      }
      
      // Also generate some bass/mid/treble test data
      const bassValue = 128 + 80 * Math.sin(time * 1.2);
      const midValue = 128 + 60 * Math.sin(time * 2.5);
      const trebleValue = 128 + 40 * Math.sin(time * 4);
      
      bassData.fill(bassValue);
      midData.fill(midValue);
      trebleData.fill(trebleValue);
    }
    
    return {
      context,
      gainNode,
      loadAudio,
      loadAudioFromUrl,
      setVolume,
      connectToSpotifyPlayer,
      
      // Get raw frequency data
      getFrequencyData: () => {
        if (!isPlaying && !audioElement) {
          generateTestData(); // Generate test data if nothing is playing
          return frequencyData;
        }
        
        analyser.getByteFrequencyData(frequencyData);
        return frequencyData;
      },
      
      // Get time domain data (waveform)
      getTimeDomainData: () => {
        analyser.getByteTimeDomainData(timeDomainData);
        return timeDomainData;
      },
      
      // Get frequency data for specific ranges
      getBassData: () => {
        bassAnalyser.getByteFrequencyData(bassData);
        return bassData;
      },
      
      getMidData: () => {
        midAnalyser.getByteFrequencyData(midData);
        return midData;
      },
      
      getTrebleData: () => {
        trebleAnalyser.getByteFrequencyData(trebleData);
        return trebleData;
      }
    };
  }