/**
 * tts.js — 基于 Web Speech API 的发音模块
 *
 * 职责：
 *  - speakWord(word)       — 朗读单词
 *  - speakSentence(text)   — 朗读句子/例句
 *  - 自动选择英文语音，零依赖，离线可用
 */

const TTS = {
  /**
   * 获取可用的英文语音
   * @returns {SpeechSynthesisVoice|null}
   */
  _getEnglishVoice() {
    const voices = window.speechSynthesis.getVoices();
    // 优先选美式英语
    let voice = voices.find(v => v.lang.startsWith('en-US'));
    if (!voice) voice = voices.find(v => v.lang.startsWith('en'));
    return voice || null;
  },

  /**
   * 朗读文本
   * @param {string} text - 要朗读的文本
   * @param {object} options
   * @param {number} options.rate - 语速 (0.1~10, 默认 0.9)
   * @param {number} options.pitch - 音调 (0~2, 默认 1)
   */
  _speak(text, options = {}) {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis not supported in this browser.');
      return;
    }

    // 取消正在进行的朗读
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang  = 'en-US';
    utterance.rate  = options.rate ?? 0.9;
    utterance.pitch = options.pitch ?? 1.0;

    const voice = this._getEnglishVoice();
    if (voice) utterance.voice = voice;

    window.speechSynthesis.speak(utterance);
  },

  /**
   * 朗读单词（较慢语速，清晰发音）
   * @param {string} word
   */
  speakWord(word) {
    if (!word || !word.trim()) return;
    this._speak(word.trim(), { rate: 0.8 });
  },

  /**
   * 朗读句子（正常语速）
   * @param {string} sentence
   */
  speakSentence(sentence) {
    if (!sentence || !sentence.trim()) return;
    this._speak(sentence.trim(), { rate: 0.9 });
  },
};
