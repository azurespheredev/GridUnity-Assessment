import { Entity, Column, PrimaryColumn } from 'typeorm';
import { ObjectType, Field } from 'type-graphql';

@ObjectType()
@Entity()
export default class FileChunkEntity {
  @Field()
  @PrimaryColumn('varchar')
  hash: string;

  @Column('blob')
  chunk: Buffer;
}
