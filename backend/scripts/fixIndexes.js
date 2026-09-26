import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function fixIndexes() {
  console.log("🔍 Checking and dropping legacy indexes from MongoDB...");

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const db = mongoose.connection.db;

    // 1. Inspect & fix users collection
    const userIndexes = await db.collection("users").indexes();
    console.log("\nCurrent indexes on 'users':", userIndexes.map(i => i.name));

    for (const index of userIndexes) {
      if (index.name.includes("walletAddress") || index.key?.walletAddress !== undefined) {
        console.log(`Dropping legacy index '${index.name}' from 'users'...`);
        await db.collection("users").dropIndex(index.name);
        console.log(`✅ Dropped '${index.name}' from 'users'`);
      }
    }

    // 2. Inspect & fix organisationapplications collection
    const orgIndexes = await db.collection("organisationapplications").indexes();
    console.log("\nCurrent indexes on 'organisationapplications':", orgIndexes.map(i => i.name));

    for (const index of orgIndexes) {
      if (index.name.includes("walletAddress") || index.key?.walletAddress !== undefined) {
        console.log(`Dropping legacy index '${index.name}' from 'organisationapplications'...`);
        await db.collection("organisationapplications").dropIndex(index.name);
        console.log(`✅ Dropped '${index.name}' from 'organisationapplications'`);
      }
    }

    // 3. Drop and recreate organisationId_1 with sparse: true
    try {
      await db.collection("organisationapplications").dropIndex("organisationId_1");
      console.log("Dropped old organisationId_1 index.");
    } catch (e) {
      console.log("No organisationId_1 index to drop.");
    }

    // Unset organisationId field completely for documents where organisationId is empty or null or not approved
    const unsetRes = await db.collection("organisationapplications").updateMany(
      { $or: [{ organisationId: "" }, { organisationId: null }] },
      { $unset: { organisationId: "" } }
    );
    console.log(`Unset organisationId from ${unsetRes.modifiedCount} pending documents.`);

    // Recreate sparse unique index on organisationId
    await db.collection("organisationapplications").createIndex(
      { organisationId: 1 },
      { unique: true, sparse: true }
    );
    console.log("✅ Recreated organisationId_1 index with { unique: true, sparse: true }");

    console.log("\n🎉 All legacy walletAddress indexes dropped successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Error fixing indexes:", err);
    process.exit(1);
  }
}

fixIndexes();
