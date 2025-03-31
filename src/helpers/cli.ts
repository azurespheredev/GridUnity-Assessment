import { Command } from 'commander';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import config from '../config';
import SnapshotResolver from '../graphql/resolvers/SnapshotResolver';
import { logger } from '../utils/logger';

const program = new Command();

async function main() {
  await createConnection(config.database);
  const resolver = new SnapshotResolver();

  program
    .command('snapshot')
    .requiredOption('-t, --target-directory <dir>', 'Target directory for snapshot')
    .action(async (opts) => {
      await resolver.createSnapshot(opts.targetDirectory);
      logger.info('Snapshot created successfully');
    });

  program.command('list').action(async () => {
    const snapshots = await resolver.listSnapshots();
    snapshots.forEach((snapshot) => {
      logger.info(`Snapshot ID: ${snapshot.id}, Timestamp: ${snapshot.timestamp}`);
    });
  });

  program
    .command('restore')
    .requiredOption('-s, --snapshot-id <id>', 'Snapshot ID to restore', parseInt)
    .requiredOption('-o, --output-directory <dir>', 'Output directory for restore')
    .action(async (opts) => {
      await resolver.restoreSnapshot(opts.snapshotId, opts.outputDirectory);
      logger.info('Snapshot restored successfully');
    });

  program
    .command('prune')
    .requiredOption('-s, --snapshot-id <id>', 'Snapshot ID to prune', parseInt)
    .action(async (opts) => {
      await resolver.pruneSnapshot(opts.snapshotId);
      logger.info('Snapshot pruned successfully');
    });

  program.parse(process.argv);
}

main().catch((error) => {
  logger.error('CLI Error:', error);
});
