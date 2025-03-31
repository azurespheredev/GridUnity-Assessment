import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { getRepository } from 'typeorm';

import createApolloServer from '../test_helpers/createApolloServer';
import SnapshotEntity from '../../src/entities/SnapshotEntity';
import FileChunkEntity from '../../src/entities/FileChunkEntity';

// GraphQL mutations for testing

const CREATE_SNAPSHOT_MUTATION = `
  mutation CreateSnapshot($targetDirectory: String!) {
    createSnapshot(targetDirectory: $targetDirectory) {
      id
      timestamp
    }
  }
`;

const RESTORE_SNAPSHOT_MUTATION = `
  mutation RestoreSnapshot($snapshotId: Float!, $outputDirectory: String!) {
    restoreSnapshot(snapshotId: $snapshotId, outputDirectory: $outputDirectory)
  }
`;

const PRUNE_SNAPSHOT_MUTATION = `
  mutation PruneSnapshot($snapshotId: Float!) {
    pruneSnapshot(snapshotId: $snapshotId)
  }
`;

describe('🧪 GraphQL Resolver Tests:', () => {
  let testDir: string;
  let restoreDir: string;
  let snapshotId: number;

  beforeAll(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'backup-test-'));
    restoreDir = await fs.mkdtemp(path.join(os.tmpdir(), 'restore-test-'));

    // create sample files
    await fs.writeFile(path.join(testDir, 'test1.txt'), 'Hello World');
    await fs.writeFile(path.join(testDir, 'test2.bin'), crypto.randomBytes(128));
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(restoreDir, { recursive: true, force: true });
  });

  test('Create snapshot from the specific directory', async () => {
    const server = createApolloServer();

    const response = await server.executeOperation({
      query: CREATE_SNAPSHOT_MUTATION,
      variables: { targetDirectory: testDir },
    });

    expect(response.data?.createSnapshot).toHaveProperty('id');
    snapshotId = response.data?.createSnapshot.id;
    expect(typeof snapshotId).toBe('number');
  });

  test('Restore snapshot to new directory', async () => {
    const server = createApolloServer();

    const response = await server.executeOperation({
      query: RESTORE_SNAPSHOT_MUTATION,
      variables: { snapshotId, outputDirectory: restoreDir },
    });

    expect(response.data?.restoreSnapshot).toBe(true);

    // Verify restored files are bit-for-bit identical
    const originalContent = await fs.readFile(path.join(testDir, 'test1.txt'));
    const restoredContent = await fs.readFile(path.join(restoreDir, 'test1.txt'));

    expect(originalContent).toEqual(restoredContent);

    const originalBin = await fs.readFile(path.join(testDir, 'test2.bin'));
    const restoredBin = await fs.readFile(path.join(restoreDir, 'test2.bin'));

    expect(originalBin).toEqual(restoredBin);
  });

  test('Snapshotting twice without changes should not duplicate chunk content', async () => {
    const server = createApolloServer();

    const snapshotRepository = getRepository(SnapshotEntity);
    const chunkRepository = getRepository(FileChunkEntity);

    // Count snapshots and chunks before creating a new snapshot
    const initialSnapshotCount = await snapshotRepository.count();
    const initialChunkCount = await chunkRepository.count();

    await server.executeOperation({
      query: CREATE_SNAPSHOT_MUTATION,
      variables: { targetDirectory: testDir },
    });

    // Verify exactly one new snapshot was created
    const finalSnapshotCount = await snapshotRepository.count();
    expect(finalSnapshotCount).toBe(initialSnapshotCount + 1);

    // Verify that no new chunks were duplicated
    const finalChunkCount = await chunkRepository.count();
    expect(finalChunkCount).toBe(initialChunkCount);
  });

  test('Pruning snapshot does not affect others', async () => {
    const server = createApolloServer();

    const snapshotResult = await server.executeOperation({
      query: CREATE_SNAPSHOT_MUTATION,
      variables: { targetDirectory: testDir },
    });

    expect(snapshotResult.data?.createSnapshot).toBeDefined();
    const secondSnapshotId = snapshotResult.data?.createSnapshot.id;

    // Prune first snapshot
    const pruneResponse = await server.executeOperation({
      query: PRUNE_SNAPSHOT_MUTATION,
      variables: { snapshotId },
    });

    expect(pruneResponse.data?.pruneSnapshot).toBe(true);

    // Attempt to restore second snapshot after pruning first
    const secondRestoreDir = await fs.mkdtemp(path.join(os.tmpdir(), 'restore2-test-'));

    const restoreResponse = await server.executeOperation({
      query: RESTORE_SNAPSHOT_MUTATION,
      variables: { snapshotId: secondSnapshotId, outputDirectory: secondRestoreDir },
    });

    expect(restoreResponse.data?.restoreSnapshot).toBe(true);

    // Check the second snapshot still restores correctly
    const restoredContent = await fs.readFile(path.join(secondRestoreDir, 'test1.txt'));
    expect(restoredContent.toString()).toBe('Hello World');

    await fs.rm(secondRestoreDir, { recursive: true, force: true });
  });
});
