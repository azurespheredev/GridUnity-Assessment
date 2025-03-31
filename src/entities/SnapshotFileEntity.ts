import { Field, ObjectType } from 'type-graphql';
import { Entity, ManyToOne, PrimaryColumn, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
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
    primary: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'snapshotId' })
  snapshot: SnapshotEntity;

  @Field(() => [FileChunkEntity])
  @ManyToMany(() => FileChunkEntity, { eager: true })
  @JoinTable()
  chunks: FileChunkEntity[];
}
