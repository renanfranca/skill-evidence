'use strict';

module.exports = class ArchaeologicalExecutionProvider {
  constructor(options = {}) {
    this.providerId = options.id ?? 'local:archaeological-execution';
    this.output = options.config?.output;
    this.serialization = options.config?.serialization;
  }

  id() {
    return this.providerId;
  }

  async callApi(_prompt, context = {}) {
    const value = this.output === 'vars' ? context.vars : context.vars?.[this.output];
    return {
      output: this.serialization === 'plain' && typeof value === 'string' ? value : JSON.stringify(value ?? null),
    };
  }
};
