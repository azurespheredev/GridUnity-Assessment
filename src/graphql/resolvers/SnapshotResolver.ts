import { Arg, Mutation, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { getRepository } from 'typeorm';
import type { PathLike } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import SnapshotEntity from '../../entities/SnapshotEntity';
import SnapshotFileEntity from '../../entities/SnapshotFileEntity';
import FileContentEntity from '../../entities/FileContentEntity';
import { hashFile } from '../../utils/hash';
import { walk } from '../../utils/fs';

@Resolver()
@Service()
export default class SnapshotResolver {
  @Query(() => [SnapshotEntity], { description: 'List all snapshots' })
  async listSnapshots(): Promise<SnapshotEntity[]> {
    const snapshotRepository = getRepository(SnapshotEntity);
    return snapshotRepository.find({ relations: ['files', 'files.file'] });
  }

  @Query(() => SnapshotEntity, { nullable: true, description: 'Get a snapshot by ID' })
  async getSnapshot(@Arg('id') id: number): Promise<SnapshotEntity | undefined> {
    const snapshotRepository = getRepository(SnapshotEntity);
    return snapshotRepository.findOne(id, { relations: ['files', 'files.file'] });
  }

  @Mutation(() => SnapshotEntity, { description: 'Create a new snapshot' })
  async createSnapshot(@Arg('targetDirectory') targetDirectory: string): Promise<SnapshotEntity> {
    const snapshotRepository = getRepository(SnapshotEntity);
    const fileContentRepository = getRepository(FileContentEntity);
    const snapshotFileRepository = getRepository(SnapshotFileEntity);

    const snapshot = snapshotRepository.create();
    await snapshotRepository.save(snapshot);

    const filePaths = await walk(targetDirectory);

    await Promise.all(
      filePaths.map(async (filePath: PathLike | fs.FileHandle) => {
        const content = await fs.readFile(filePath);
        const hash = await hashFile(filePath.toString());

        let fileContent = await fileContentRepository.findOne(hash);
        if (!fileContent) {
          fileContent = fileContentRepository.create({ hash, content });
          await fileContentRepository.save(fileContent);
        }

        const relativePath = path.relative(targetDirectory, filePath.toString());
        const snapshotFile = snapshotFileRepository.create({
          snapshot,
          path: relativePath,
          file: fileContent,
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
    const snapshot = await snapshotRepository.findOne(snapshotId, { relations: ['files', 'files.file'] });
    if (!snapshot) throw new Error('Snapshot not found');

    await Promise.all(
      snapshot.files.map(async (snapshotFile) => {
        const outputPath = path.join(outputDirectory, snapshotFile.path);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, snapshotFile.file.content);
      })
    );

    return true;
  }

  @Mutation(() => Boolean, { description: 'Prune (delete) a snapshot' })
  async pruneSnapshot(@Arg('snapshotId') snapshotId: number): Promise<boolean> {
    const snapshotRepository = getRepository(SnapshotEntity);
    const snapshotFileRepository = getRepository(SnapshotFileEntity);
    const fileContentRepository = getRepository(FileContentEntity);

    const snapshot = await snapshotRepository.findOne(snapshotId);
    if (!snapshot) throw new Error('Snapshot not found');

    await snapshotFileRepository.delete({ snapshot: { id: snapshotId } });
    await snapshotRepository.delete(snapshotId);

    // Remove unreferenced file contents
    const usedHashes = (await snapshotFileRepository.find({ relations: ['file'] })).map((sf) => sf.file.hash);

    const allFileContents = await fileContentRepository.find();
    await Promise.all(
      allFileContents
        .filter((fileContent) => !usedHashes.includes(fileContent.hash))
        .map((fileContent) => fileContentRepository.delete(fileContent.hash))
    );

    return true;
  }
}
