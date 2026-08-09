import { runArchaeologicalConformance } from './archaeological.js';

const evidence = await runArchaeologicalConformance();
if (process.send !== undefined) {
  process.send(evidence);
}
