import { Entity, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { ObjectType, Field } from 'type-graphql';
import SnapshotFileEntity from './SnapshotFileEntity';

@ObjectType()
@Entity()
export default class SnapshotEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @CreateDateColumn()
  timestamp: Date;

  @Field(() => [SnapshotFileEntity])
  @OneToMany(() => SnapshotFileEntity, (file) => file.snapshot, { cascade: true })
  files: SnapshotFileEntity[];
}
