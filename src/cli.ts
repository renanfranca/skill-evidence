#!/usr/bin/env node
import { Command } from 'commander';
import { loadEvaluation } from './evaluation.js';
import { readJson } from './files.js';
import { archiveRun, reviewRun, writeReport } from './lifecycle.js';
import { createPlan } from './plan.js';
import { createPreflight } from './preflight.js';
import { renderEvidence } from './report.js';
import { executePlan } from './runner.js';
import type { Evidence } from './types.js';

const program = new Command().name('skill-evidence').description('Auditable evidence collection for Codex skills').showHelpAfterError();

interface PlanOptions {
  model: string;
  reasoningEffort: string;
  judgeModel: string;
  judgeReasoningEffort: string;
  out: string;
}
interface RunOptions {
  plan: string;
  preflight: string;
  approveSessions: number;
  maxCredits: number;
}
interface PreflightOptions {
  plan: string;
  out: string;
}
interface ReviewOptions {
  run: string;
  decision: string;
  rationaleFile: string;
}
interface ArchiveOptions {
  run: string;
}
interface RenderOptions {
  evidence: string;
}

program
  .command('check')
  .argument('<evaluation-dir>')
  .action(async (directory: string) => {
    const loaded = await loadEvaluation(directory);
    process.stdout.write(`OK ${loaded.evaluation.id} ${loaded.fingerprint}\n`);
  });

program
  .command('plan')
  .argument('<evaluation-dir>')
  .requiredOption('--model <model>')
  .requiredOption('--reasoning-effort <effort>')
  .requiredOption('--judge-model <model>')
  .requiredOption('--judge-reasoning-effort <effort>')
  .requiredOption('--out <file>')
  .action(async (directory: string, options: PlanOptions) => {
    const plan = await createPlan(directory, {
      model: options.model,
      reasoningEffort: options.reasoningEffort,
      judgeModel: options.judgeModel,
      judgeReasoningEffort: options.judgeReasoningEffort,
      out: options.out,
    });
    process.stdout.write(`Planned maximum ${plan.sessions.maximum} sessions\n`);
  });

program
  .command('preflight')
  .requiredOption('--plan <file>')
  .requiredOption('--out <file>')
  .action(async (options: PreflightOptions) => {
    const preflight = await createPreflight(options.plan, options.out);
    process.stdout.write(`${preflight.eligible ? 'ELIGIBLE' : 'INELIGIBLE'} ${options.out}\n`);
  });

program
  .command('run')
  .requiredOption('--plan <file>')
  .requiredOption('--preflight <file>')
  .requiredOption('--approve-sessions <count>', 'maximum model sessions explicitly approved', (value: string) => Number.parseInt(value, 10))
  .requiredOption('--max-credits <credits>', 'maximum credits explicitly approved', (value: string) => Number.parseFloat(value))
  .action(async (options: RunOptions) => {
    const result = await executePlan(options.plan, options.preflight, options.approveSessions, options.maxCredits);
    await writeReport(`${result.runDirectory}/evidence.json`);
    process.stdout.write(`${result.runDirectory}\n`);
    if (result.outcome === 'calibration-failed') process.exitCode = 1;
  });

program
  .command('review')
  .requiredOption('--run <directory>')
  .requiredOption('--decision <decision>')
  .requiredOption('--rationale-file <file>')
  .action(async (options: ReviewOptions) => {
    if (!['confirm', 'reject', 'inconclusive'].includes(options.decision)) throw new Error('Invalid review decision');
    await reviewRun(options.run, options.decision as 'confirm' | 'reject' | 'inconclusive', options.rationaleFile);
    process.stdout.write('Review recorded\n');
  });

program
  .command('archive')
  .requiredOption('--run <directory>')
  .action(async (options: ArchiveOptions) => {
    process.stdout.write(`${await archiveRun(options.run)}\n`);
  });
program
  .command('render')
  .requiredOption('--evidence <file>')
  .action(async (options: RenderOptions) => {
    process.stdout.write(renderEvidence(await readJson<Evidence>(options.evidence)));
  });

program.parseAsync().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
