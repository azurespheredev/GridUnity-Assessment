import { ObjectType } from 'type-graphql';
import { Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import SnapshotEntity from './SnapshotEntity';
import FileContentEntity from './FileContentEntity';

@ObjectType()
@Entity()
export default class SnapshotFileEntity {
  @PrimaryColumn()
  snapshotId: number;

  @PrimaryColumn()
  path: string;

  @ManyToOne(() => SnapshotEntity, (s) => s.files, { primary: true, onDelete: 'CASCADE' })
  snapshot: SnapshotEntity;

  @ManyToOne(() => FileContentEntity, { eager: true })
  file: FileContentEntity;
}
