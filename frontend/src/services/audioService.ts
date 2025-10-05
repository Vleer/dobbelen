class AudioService {
  private sounds: { [key: string]: HTMLAudioElement } = {};
  private isMuted: boolean = false;
  private initialized: boolean = false;

  private initializeSounds() {
    if (this.initialized) return;
    
    console.log('Initializing audio service...');
    
    // Import audio files from src/resources using require or import
    // Note: Using direct imports for webpack to bundle them properly
    try {
      this.sounds = {
        gameStart: new Audio(require('../resources/game_start.wav')),
        newRound: new Audio(require('../resources/new_round.wav')),
        doubt: new Audio(require('../resources/doubt.wav')),
        spotOn: new Audio(require('../resources/spot_on.wav')),
        raise: new Audio(require('../resources/raise.wav')),
        win: new Audio(require('../resources/win.wav')),
      };

      // Set volume for all sounds (adjust as needed)
      Object.values(this.sounds).forEach(sound => {
        sound.volume = 0.7;
        sound.load(); // Explicitly load the audio
      });

      // Lower volume for new round and win sounds
      if (this.sounds.newRound) {
        this.sounds.newRound.volume = 0.3;
      }
      if (this.sounds.win) {
        this.sounds.win.volume = 0.3;
      }

      this.initialized = true;
      console.log('Audio service initialized with sounds:', Object.keys(this.sounds));
    } catch (error) {
      console.error('Failed to initialize audio service:', error);
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    console.log('Audio muted:', muted);
  }

  private play(soundKey: string) {
    // Initialize sounds on first play (after user interaction)
    if (!this.initialized) {
      this.initializeSounds();
    }

    if (this.isMuted) {
      console.log(`Sound ${soundKey} not played - muted`);
      return;
    }
    
    const sound = this.sounds[soundKey];
    if (sound) {
      console.log(`Playing sound: ${soundKey}`);
      // Reset the sound to the beginning in case it's already playing
      sound.currentTime = 0;
      sound.play().catch(err => {
        console.error(`Failed to play sound ${soundKey}:`, err);
      });
    } else {
      console.error(`Sound ${soundKey} not found in audio service`);
    }
  }

  playGameStart() {
    this.play('gameStart');
  }

  playNewRound() {
    this.play('newRound');
  }

  playDoubt() {
    this.play('doubt');
  }

  playSpotOn() {
    this.play('spotOn');
  }

  playRaise() {
    this.play('raise');
  }

  playWin() {
    this.play('win');
  }
}

export const audioService = new AudioService();
