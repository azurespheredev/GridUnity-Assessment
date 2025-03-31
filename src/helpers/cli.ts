/* eslint-disable no-console */
import { Command } from 'commander';
import 'reflect-metadata';
import { createConnection, getRepository } from 'typeorm';
import * as crypto from 'crypto';
import config from '../config';
import SnapshotResolver from '../graphql/resolvers/SnapshotResolver';
import { logger } from '../utils/logger';
import FileChunkEntity from '../entities/FileChunkEntity';
import SnapshotEntity from '../entities/SnapshotEntity';

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
    const snapshots = await getRepository(SnapshotEntity).find({
      relations: ['files', 'files.chunks'],
      order: { id: 'ASC' },
    });

    const header = [
      'SNAPSHOT'.padEnd(10),
      'TIMESTAMP'.padEnd(25),
      'FILE'.padEnd(20),
      'SIZE'.padEnd(12),
      'DISTINCT_SIZE'.padEnd(15),
    ].join('');

    console.info(header);

    const globalChunkHashes = new Set<string>();
    let totalDistinctSize = 0;

    snapshots.forEach((snapshot) => {
      snapshot.files.forEach((file) => {
        const fileChunkHashes = new Set<string>();
        let fileSize = 0;
        let fileDistinctSize = 0;

        // Calculate file size and distinct size
        file.chunks.forEach((chunk) => {
          fileSize += chunk.chunk.length;

          if (!globalChunkHashes.has(chunk.hash)) {
            fileDistinctSize += chunk.chunk.length;
            globalChunkHashes.add(chunk.hash);
          }

          fileChunkHashes.add(chunk.hash);
        });

        totalDistinctSize += fileDistinctSize;

        const row = [
          `${snapshot.id}`.padEnd(10),
          `${snapshot.timestamp.toISOString().replace('T', ' ').replace('Z', '')}`.padEnd(25),
          `${file.path}`.padEnd(20),
          `${fileSize}`.padEnd(12),
          `${fileDistinctSize}`.padEnd(15),
        ].join('');

        console.info(row);
      });
    });

    const totalRow = ['total'.padEnd(55), `${totalDistinctSize}`.padEnd(15)].join('');
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
