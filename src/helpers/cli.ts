/* eslint-disable no-console */
import { Command } from 'commander';
import 'reflect-metadata';
import { createConnection, getRepository } from 'typeorm';
import * as crypto from 'crypto';
import config from '../config';
import SnapshotResolver from '../graphql/resolvers/SnapshotResolver';
import { logger } from '../utils/logger';
import FileChunkEntity from '../entities/FileChunkEntity';

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

    const globalChunkHashes = new Set<string>();

    // Display the snapshots
    snapshots.forEach((snapshot) => {
      const snapshotChunkHashes = new Set<string>();

      // Calculate the size of snapshot based on chunks
      const { snapshotSize, distinctSize } = snapshot.files.reduce(
        (acc, file) => {
          file.chunks.forEach(chunk => {
            acc.snapshotSize += chunk.chunk.length;
            if (!snapshotChunkHashes.has(chunk.hash)) {
              snapshotChunkHashes.add(chunk.hash);
              if (!globalChunkHashes.has(chunk.hash)) {
                acc.distinctSize += chunk.chunk.length;
                globalChunkHashes.add(chunk.hash);
              }
            }
          });
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
    const chunkRepo = getRepository(FileChunkEntity);
    const allChunks = await chunkRepo.find();

    let corruptedCount = 0;

    // Verify chunk integrity (content hash matches the stored hash)
    allChunks.forEach((chunkEntity) => {
      const actualHash = crypto.createHash('sha256').update(chunkEntity.chunk).digest('hex');
      if (actualHash !== chunkEntity.hash) {
        logger.error(`Corrupted chunk detected: Expected hash ${chunkEntity.hash}, actual hash ${actualHash}`);
        corruptedCount += 1;
      }
    });

    if (corruptedCount === 0) {
      logger.info('No corrupted chunks found!');
    } else {
      logger.warn(`Found ${corruptedCount} corrupted chunks!`);
    }
  });

  program.parse(process.argv);
}

main().catch((error) => {
  logger.error('CLI Error:', error);
});
