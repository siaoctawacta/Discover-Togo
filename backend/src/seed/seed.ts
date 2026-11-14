/**
 * Seeds MongoDB with the sample Togo dataset (idempotent: upserts by slug).
 *   MONGODB_URI=mongodb://localhost:27017/discover_togo npm run seed
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { fold } from '../lib/util.js';
import { ListingModel } from '../repo/mongo/models.js';
import { buildSeedListings } from './data.js';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await mongoose.connect(uri);
  await ListingModel.syncIndexes();
  let n = 0;
  for (const l of buildSeedListings()) {
    const { id, location, ...rest } = l;
    await ListingModel.updateOne(
      { slug: l.slug },
      {
        $set: {
          ...rest,
          geo: { type: 'Point', coordinates: [location.lng, location.lat] },
          cityFolded: fold(l.city),
          searchText: fold([l.name.en, l.name.fr, l.city, ...l.tags].join(' ')),
        },
        $setOnInsert: { _id: new mongoose.Types.ObjectId(id) },
      },
      { upsert: true },
    );
    n++;
  }
  console.log(`Seeded ${n} listings`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
