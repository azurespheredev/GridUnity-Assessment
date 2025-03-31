import { Field, ObjectType } from 'type-graphql';
import { CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
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

  @OneToMany(() => SnapshotFileEntity, (sf) => sf.snapshot)
  files: SnapshotFileEntity[];
}
