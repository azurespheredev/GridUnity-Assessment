/* eslint-disable no-console */
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
    .requiredOption('--target-directory <dir>', 'Directory to snapshot')
    .action(async ({ targetDirectory }) => {
      await resolver.createSnapshot(targetDirectory);
      logger.info('Snapshot created successfully!');
    });

  program.command('list').action(async () => {
    const snapshots = await resolver.listSnapshots();
    console.log('SNAPSHOT\tTIMESTAMP');
    snapshots.forEach((snapshot) => {
      console.log(`${snapshot.id}\t${snapshot.timestamp}`);
    });
  });

  program
    .command('restore')
    .requiredOption('--snapshot-number <id>', 'Snapshot ID to restore', parseInt)
    .requiredOption('--output-directory <dir>', 'Restore directory')
    .action(async ({ snapshotNumber, outputDirectory }) => {
      await resolver.restoreSnapshot(snapshotNumber, outputDirectory);
      logger.info('Snapshot restored successfully!');
    });

  program
    .command('prune')
    .requiredOption('--snapshot <id>', 'Snapshot ID to prune', parseInt)
    .action(async ({ snapshot }) => {
      await resolver.pruneSnapshot(snapshot);
      logger.info('Snapshot pruned successfully!');
    });

  program.parse(process.argv);
}

main().catch((error) => {
  logger.error('CLI Error:', error);
});
