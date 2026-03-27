import gameStartUrl from '../resources/game_start.wav';
import newRoundUrl from '../resources/new_round.wav';
import doubtUrl from '../resources/doubt.wav';
import spotOnUrl from '../resources/spot_on.wav';
import raiseUrl from '../resources/raise.wav';
import winUrl from '../resources/win.wav';

class AudioService {
  private sounds: { [key: string]: HTMLAudioElement } = {};
  private isMuted: boolean = false;
  private initialized: boolean = false;

  private initializeSounds() {
    if (this.initialized) return;
    
    console.log('Initializing audio service...');
    
    try {
      this.sounds = {
        gameStart: new Audio(gameStartUrl),
        newRound: new Audio(newRoundUrl),
        doubt: new Audio(doubtUrl),
        spotOn: new Audio(spotOnUrl),
        raise: new Audio(raiseUrl),
        win: new Audio(winUrl),
      };

      Object.values(this.sounds).forEach(sound => {
        sound.volume = 0.7;
        sound.load();
      });

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
