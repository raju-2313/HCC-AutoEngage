/**
 * src/services/emojis/providers/baseEmojiProvider.js
 * Abstract interface for emoji discovery providers.
 */

export class BaseEmojiProvider {
  /**
   * @param {string} id - Unique identifier for provider
   * @param {string} name - Friendly name
   */
  constructor(id, name) {
    if (this.constructor === BaseEmojiProvider) {
      throw new Error('BaseEmojiProvider is an abstract class and cannot be instantiated directly.');
    }
    this.id = id;
    this.name = name;
  }

  /**
   * Discovers emoji candidates.
   *
   * @param {Object} [options={}]
   * @param {number} [options.limit=50]
   * @param {string} [options.category]
   * @returns {Promise<Array<Object>>}
   */
  async discover(options = {}) {
    throw new Error('Method "discover()" must be implemented by subclass.');
  }
}

