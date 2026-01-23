import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../../database';
import { users, User, NewUser } from '../../database/schema';

@Injectable()
export class UsersRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async findById(id: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user ?? null;
  }

  async create(data: NewUser): Promise<User> {
    const [user] = await this.db.insert(users).values(data).returning();
    return user;
  }

  async upsert(data: NewUser): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values(data)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: data.email,
          firstName: data.firstName,
          middleName: data.middleName,
          lastName: data.lastName,
          emailConfirmed: data.emailConfirmed,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async update(id: string, data: Partial<NewUser>): Promise<User | null> {
    const [user] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user ?? null;
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async findAll(): Promise<User[]> {
    return this.db.select().from(users);
  }
}
