import { Arg, Mutation, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { getRepository } from 'typeorm';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import SnapshotEntity from '../../entities/SnapshotEntity';
import SnapshotFileEntity from '../../entities/SnapshotFileEntity';
import { walk } from '../../utils/fs';
import FileChunkEntity from '../../entities/FileChunkEntity';
import { chunkBuffer } from '../../utils/chunk';

@Resolver()
@Service()
export default class SnapshotResolver {
  @Query(() => [SnapshotEntity], { description: 'List all snapshots' })
  async listSnapshots(): Promise<SnapshotEntity[]> {
    const snapshotRepository = getRepository(SnapshotEntity);
    return snapshotRepository.find({
      relations: ['files', 'files.chunks'],
      order: { id: 'ASC' },
    });
  }

  @Query(() => SnapshotEntity, { nullable: true, description: 'Get a snapshot by ID' })
  async getSnapshot(@Arg('id') id: number): Promise<SnapshotEntity | undefined> {
    const snapshotRepository = getRepository(SnapshotEntity);
    return snapshotRepository.findOne(id, { relations: ['files', 'files.chunks'] });
  }

  @Mutation(() => SnapshotEntity, { description: 'Create a new snapshot' })
  async createSnapshot(@Arg('targetDirectory') targetDirectory: string): Promise<SnapshotEntity> {
    const snapshotRepository = getRepository(SnapshotEntity);
    const fileChunkRepository = getRepository(FileChunkEntity);
    const snapshotFileRepository = getRepository(SnapshotFileEntity);

    const snapshot = snapshotRepository.create();
    await snapshotRepository.save(snapshot);

    const filePaths = await walk(targetDirectory);

    await Promise.all(
      filePaths.map(async (filePath) => {
        const content = await fs.readFile(filePath);

        // Split file content into chunks
        const chunks = chunkBuffer(content, 4096); // 4KB chunks
        const chunkEntities: FileChunkEntity[] = await Promise.all(
          chunks.map(async (chunk) => {
            const hash = createHash('sha256').update(chunk).digest('hex');

            let chunkEntity = await fileChunkRepository.findOne(hash);
            if (!chunkEntity) {
              chunkEntity = fileChunkRepository.create({ hash, chunk });
              await fileChunkRepository.save(chunkEntity);
            }

            return chunkEntity;
          })
        );

        const relativePath = path.relative(targetDirectory, filePath);
        const snapshotFile = snapshotFileRepository.create({
          snapshotId: snapshot.id,
          path: relativePath,
          snapshot,
          chunks: chunkEntities,
        });

        await snapshotFileRepository.save(snapshotFile);
      })
    );

    return snapshot;
  }

  @Mutation(() => Boolean, { description: 'Restore a snapshot to a directory' })
  async restoreSnapshot(
    @Arg('snapshotId') snapshotId: number,
    @Arg('outputDirectory') outputDirectory: string
  ): Promise<boolean> {
    const snapshotRepository = getRepository(SnapshotEntity);
    const snapshot = await snapshotRepository.findOne(snapshotId, { relations: ['files', 'files.chunks'] });
    if (!snapshot) throw new Error('Snapshot not found');

    await Promise.all(
      snapshot.files.map(async (snapshotFile) => {
        const outputPath = path.join(outputDirectory, snapshotFile.path);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        // Reassemble file from chunks
        const fileContent = Buffer.concat(snapshotFile.chunks.map((chunk) => chunk.chunk));
        await fs.writeFile(outputPath, fileContent);
      })
    );

    return true;
  }

  @Mutation(() => Boolean, { description: 'Prune (delete) a snapshot' })
  async pruneSnapshot(@Arg('snapshotId') snapshotId: number): Promise<boolean> {
    const snapshotRepository = getRepository(SnapshotEntity);
    const snapshotFileRepository = getRepository(SnapshotFileEntity);
    const fileChunkRepository = getRepository(FileChunkEntity);

    const snapshot = await snapshotRepository.findOne(snapshotId);
    if (!snapshot) throw new Error('Snapshot not found');

    await snapshotFileRepository.delete({ snapshot: { id: snapshotId } });
    await snapshotRepository.delete(snapshotId);

    // Remove unreferenced chunks
    const usedChunkHashes = new Set<string>(
      (await snapshotFileRepository.find({ relations: ['chunks'] })).flatMap((sf) =>
        sf.chunks.map((chunk) => chunk.hash)
      )
    );

    const allChunks = await fileChunkRepository.find();
    await Promise.all(
      allChunks
        .filter((chunk) => !usedChunkHashes.has(chunk.hash))
        .map((chunk) => fileChunkRepository.delete(chunk.hash))
    );

    return true;
  }
}
