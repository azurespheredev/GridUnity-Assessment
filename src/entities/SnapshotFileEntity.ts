import { Field, ObjectType } from 'type-graphql';
import { Entity, ManyToOne, PrimaryColumn, JoinColumn } from 'typeorm';
import SnapshotEntity from './SnapshotEntity';
import FileContentEntity from './FileContentEntity';

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
  @ManyToOne(() => SnapshotEntity, snapshot => snapshot.files, {
    primary: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'snapshotId' })
  snapshot: SnapshotEntity;

  @Field(() => FileContentEntity)
  @ManyToOne(() => FileContentEntity, { eager: true })
  @JoinColumn({ name: 'fileHash' })
  file: FileContentEntity;
}
