import { Entity, Column, PrimaryColumn } from 'typeorm';
import { ObjectType, Field } from 'type-graphql';

@ObjectType()
@Entity()
export default class FileContentEntity {
  @Field()
  @PrimaryColumn('varchar')
  hash: string;

  @Column('blob')
  content: Buffer;
}
