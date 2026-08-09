'use strict';

const acceptedOutputs = new Set(['No refactor was justified.', 'The observed behavior did not warrant restructuring.']);

function promptText(prompt) {
  try {
    const messages = JSON.parse(prompt);
    if (Array.isArray(messages)) {
      const userMessage = messages.findLast((message) => message?.role === 'user' && typeof message.content === 'string');
      return userMessage?.content ?? prompt;
    }
  } catch {
    return prompt;
  }
  return prompt;
}

module.exports = class ArchaeologicalSemanticGrader {
  constructor(options = {}) {
    this.providerId = options.id ?? 'local:archaeological-semantic-grader';
  }

  id() {
    return this.providerId;
  }

  async callApi(prompt) {
    const output = /<Output>\s*([\s\S]*?)\s*<\/Output>/u.exec(promptText(prompt))?.[1]?.trim();
    const pass = acceptedOutputs.has(output ?? '');
    return {
      output: JSON.stringify({
        pass,
        reason: pass ? 'The conclusion belongs to the calibrated equivalent class.' : 'The conclusion contradicts the rubric.',
        score: pass ? 1 : 0,
      }),
    };
  }
};
