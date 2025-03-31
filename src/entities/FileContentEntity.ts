import { Field, ObjectType } from 'type-graphql';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@ObjectType()
@Entity()
export default class FileContentEntity {
  @Field()
  @PrimaryColumn('varchar')
  hash: string;

  @Column('blob')
  content: Buffer;
}
