/**
 * src/services/stickers/providers/baseProvider.js
 * Abstract interface for sticker discovery providers.
 */

export class BaseStickerProvider {
  /**
   * @param {string} id - Unique identifier for provider
   * @param {string} name - Friendly name
   */
  constructor(id, name) {
    if (this.constructor === BaseStickerProvider) {
      throw new Error('BaseStickerProvider is an abstract class and cannot be instantiated directly.');
    }
    this.id = id;
    this.name = name;
  }

  /**
   * Discovers sticker candidates.
   * Must return an array of standardized candidate objects.
   *
   * @param {Object} [options={}]
   * @param {number} [options.limit=15]
   * @param {string} [options.category]
   * @returns {Promise<Array<StickerCandidate>>}
   */
  async discover(options = {}) {
    throw new Error('Method "discover()" must be implemented by subclass.');
  }
}

