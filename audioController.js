/**
 * Controls audio playback functionality
 * @class
 */
export class AudioController {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.audioElement = null;
    this.setupEventListeners();
    this.showAudioPlayer();
  }

  /**
   * Sets up all audio-related event listeners
   * @private
   */
  setupEventListeners() {
    const { playAudioBtn, pauseAudioBtn, restartAudioBtn } =
      this.uiManager.elements;

    // Button click handlers
    const handlers = {
      play: () => this.play(),
      pause: () => this.pause(),
      restart: () => this.restart(),
    };

    Object.entries(handlers).forEach(([action, handler]) => {
      this.uiManager.elements[`${action}AudioBtn`].addEventListener(
        "click",
        handler
      );
    });
  }

  /**
   * Sets up audio element event listeners
   * @private
   */
  setupAudioElementListeners() {
    if (!this.audioElement) return;

    const events = {
      play: () => this.updateButtonStates({ playing: true }),
      pause: () => this.updateButtonStates({ playing: false }),
      ended: () => this.updateButtonStates({ playing: false }),
    };

    Object.entries(events).forEach(([event, handler]) => {
      this.audioElement.addEventListener(event, handler);
    });
  }

  /**
   * Shows the audio player UI
   * @private
   */
  showAudioPlayer() {
    this.uiManager.showAudioPlayer();
    this.updateButtonStates({ playing: false });
  }

  /**
   * Updates button states based on audio player state
   * @param {Object} state - Current audio player state
   * @param {boolean} state.playing - Whether audio is playing
   * @private
   */
  updateButtonStates({ playing }) {
    const { playAudioBtn, pauseAudioBtn, restartAudioBtn } =
      this.uiManager.elements;

    playAudioBtn.disabled = playing || !this.audioElement;
    pauseAudioBtn.disabled = !playing;
    restartAudioBtn.disabled = !this.audioElement;
  }

  /**
   * Plays the audio
   */
  play() {
    if (this.audioElement) {
      this.audioElement.play();
    }
  }

  /**
   * Pauses the audio
   */
  pause() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  /**
   * Restarts the audio
   */
  restart() {
    if (this.audioElement) {
      this.audioElement.currentTime = 0;
      this.audioElement.play();
    }
  }

  /**
   * Sets up audio with the provided blob
   * @param {Blob} audioBlob - Audio data blob
   * @param {boolean} [autoPlay=false] - Whether to autoplay the audio
   */
  setupAudio(audioBlob, autoPlay = false) {
    if (this.audioElement) {
      this.cleanup();
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    this.audioElement = new Audio(audioUrl);
    this.setupAudioElementListeners();
    this.updateButtonStates({ playing: false });

    const articleTitle = this.uiManager.readArticleTitle();
    this.uiManager.setAudioTitle(articleTitle);

    if (autoPlay) {
      this.audioElement.play();
    }
  }

  /**
   * Cleans up audio resources
   */
  cleanup() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = "";
      this.audioElement = null;
      this.updateButtonStates({ playing: false });
    }
  }
}
