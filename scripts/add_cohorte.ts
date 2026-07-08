import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";
import { usuarios } from "../src/lib/schema";

async function run() {
  console.log("Adding cohorte column to usuarios table...");
  try {
    await db.execute(sql`
      ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "cohorte" varchar(20);
    `);
    console.log("Column added successfully.");
  } catch (error) {
    console.log("Column might already exist or error:", error);
  }

  console.log("Assigning C12026 and C22026 to existing users...");
  const allUsers = await db.select({ id: usuarios.id }).from(usuarios);
  
  if (allUsers.length > 0) {
    const half = Math.floor(allUsers.length / 2);
    
    // Asignar C12026 a la primera mitad
    for (let i = 0; i < half; i++) {
      await db.execute(sql`UPDATE "usuarios" SET "cohorte" = 'C12026' WHERE "id" = ${allUsers[i].id}`);
    }
    
    // Asignar C22026 a la segunda mitad
    for (let i = half; i < allUsers.length; i++) {
      await db.execute(sql`UPDATE "usuarios" SET "cohorte" = 'C22026' WHERE "id" = ${allUsers[i].id}`);
    }
    
    console.log(`Updated ${allUsers.length} users successfully.`);
  } else {
    console.log("No users found.");
  }

  console.log("Done.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
