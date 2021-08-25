const admin = db.getSiblingDB("admin");
const nnn = db.getSiblingDB("nnn");

// Update this with the latest migration number.
const currentMigration = 0;

// Check to see if the migration collection exists yet.  If not, create it.
const found = nnn.getCollectionInfos({name: "migration"}).length;
if (found === 0) {
    nnn.createCollection("migration", {
        validator: {
            $jsonSchema: {
                bsonType: "object",
                required: ["_id", "current"],
                additionalProperties: false,
                properties: {
                    _id: {
                        bsonType: "objectId"
                    },
                    current: {
                        bsonType: "int"
                    }
                }
            }
        }
    });

    nnn.migration.insert([{current: NumberInt(0)}]);
}

// Get the migration in the database and determine if any need to be ran.
const migration = nnn.migration.findOne();
if (migration.current < currentMigration) {
    // Loop through the migrations that need to be run and run them.
    for (let i = migration.current + 1; i <= currentMigration; i++) {
        load(`/var/mongo/migrations/${i}.js`);
        nnn.migration.findOneAndUpdate({}, {$set: {current: NumberInt(i)}});
    }
}

admin.shutdownServer();
