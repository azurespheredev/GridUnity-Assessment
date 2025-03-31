/* eslint-disable no-console */
import { Command } from 'commander';
import 'reflect-metadata';
import { createConnection, getRepository } from 'typeorm';
import * as crypto from 'crypto';
import config from '../config';
import SnapshotResolver from '../graphql/resolvers/SnapshotResolver';
import { logger } from '../utils/logger';
import FileContentEntity from '../entities/FileContentEntity';

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

    let totalDistinctSize = 0;

    // Header of the table output
    const header = ['SNAPSHOT'.padEnd(10), 'TIMESTAMP'.padEnd(25), 'SIZE'.padEnd(12), 'DISTINCT_SIZE'.padEnd(15)].join(
      ''
    );

    console.info(header);

    // Display the snapshots
    snapshots.forEach((snapshot) => {
      const fileHashesInSnapshot = new Set<string>();

      // Calculate the size of the snapshot and distinct files
      const { snapshotSize, distinctSize } = snapshot.files.reduce(
        (acc, file) => {
          acc.snapshotSize += file.file.content.length;

          if (!fileHashesInSnapshot.has(file.file.hash)) {
            acc.distinctSize += file.file.content.length;
            fileHashesInSnapshot.add(file.file.hash);
          }

          return acc;
        },
        { snapshotSize: 0, distinctSize: 0 }
      );

      totalDistinctSize += distinctSize;

      const row = [
        `${snapshot.id}`.padEnd(10),
        `${snapshot.timestamp.toISOString()}`.padEnd(25),
        `${snapshotSize}`.padEnd(12),
        `${distinctSize}`.padEnd(15),
      ].join('');

      console.info(row);
    });

    // Display the total size of all snapshots
    const totalRow = ['total'.padEnd(35), `${totalDistinctSize}`.padEnd(15)].join('');

    console.info(totalRow);
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

  program.command('check').action(async () => {
    const fileRepo = getRepository(FileContentEntity);
    const allFiles = await fileRepo.find();

    let corruptedCount = 0;

    // Check if the file content matches the hash
    allFiles.forEach((file) => {
      const actualHash = crypto.createHash('sha256').update(file.content).digest('hex');
      if (actualHash !== file.hash) {
        logger.error(`Corrupted file detected: Expected hash ${file.hash}, actual hash ${actualHash}`);
        corruptedCount += 1;
      }
    });

    if (corruptedCount === 0) {
      logger.info('No corrupted files found!');
    } else {
      logger.warn(`Found ${corruptedCount} corrupted files!`);
    }
  });

  program.parse(process.argv);
}

main().catch((error) => {
  logger.error('CLI Error:', error);
});
