import { Field, ObjectType } from 'type-graphql';
import { Entity, PrimaryColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import SnapshotEntity from './SnapshotEntity';
import FileChunkEntity from './FileChunkEntity';

@ObjectType()
@Entity()
export default class SnapshotFileEntity {
  @Field()
  @PrimaryColumn()
  snapshotId: number;

  @Field()
  @PrimaryColumn()
  path: string;

  @Field(() => SnapshotEntity)
  @ManyToOne(() => SnapshotEntity, (snapshot) => snapshot.files, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'snapshotId' })
  snapshot: SnapshotEntity;

  @Field(() => [FileChunkEntity])
  @ManyToMany(() => FileChunkEntity, { eager: true })
  @JoinTable({
    name: 'snapshot_file_chunks',
    joinColumns: [
      { name: 'snapshotId', referencedColumnName: 'snapshotId' },
      { name: 'path', referencedColumnName: 'path' },
    ],
    inverseJoinColumns: [{ name: 'chunkHash', referencedColumnName: 'hash' }],
  })
  chunks: FileChunkEntity[];
}
