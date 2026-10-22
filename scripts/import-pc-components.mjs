
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

// Load credentials from the project root's .env file.
config({ path: ".env", override: true });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

// Update this only if your dataset is stored elsewhere.
const DATA_DIR = String.raw`C:\Users\AILAB_15\Downloads\pc-part-dataset-main\pc-part-dataset-main\data\json`;

const SOURCE_NAME = "pc-part-dataset";
const SOURCE_URL = "https://github.com/docyx/pc-part-dataset";
const BATCH_SIZE = 500;

const FILES = [
  ["cpu.json", "cpu"],
  ["video-card.json", "gpu"],
  ["motherboard.json", "motherboard"],
  ["memory.json", "ram"],
  ["internal-hard-drive.json", "storage"],
  ["power-supply.json", "psu"],
  ["case.json", "case"],
  ["cpu-cooler.json", "cooler"],
];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env"
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getRamCapacity(row) {
  // Example: modules [2, 16] means 2 x 16 GB = 32 GB.
  if (Array.isArray(row.modules) && row.modules.length >= 2) {
    const moduleCount = numberOrNull(row.modules[0]);
    const moduleSize = numberOrNull(row.modules[1]);

    if (
      moduleCount !== null &&
      moduleSize !== null &&
      moduleCount > 0 &&
      moduleSize > 0
    ) {
      return moduleCount * moduleSize;
    }
  }

  return null;
}

function getRamType(row, category) {
  if (category === "ram") {
    // Dataset examples: speed [4, 3200] = DDR4,
    // speed [5, 6000] = DDR5.
    const generation = numberOrNull(row.speed?.[0]);

    if (generation === 4) return "DDR4";
    if (generation === 5) return "DDR5";

    return null;
  }

  if (category === "motherboard") {
    // Only classify when the source explicitly identifies the type.
    const sourceText = JSON.stringify(row).toUpperCase();

    if (sourceText.includes("DDR5")) return "DDR5";
    if (sourceText.includes("DDR4")) return "DDR4";

    return null;
  }

  return null;
}

function getBrand(name) {
  if (!name || typeof name !== "string") return null;

  // Known multi-word brands in this dataset.
  const multiWordBrands = [
    "ASRock",
    "Fractal Design",
    "be quiet!",
    "NZXT",
    "Lian Li",
    "Cooler Master",
    "Western Digital",
    "Team Group",
    "EVGA",
    "XFX",
    "PowerColor",
    "Sapphire",
    "Thermaltake",
    "SilverStone",
    "Super Flower",
    "Noctua",
    "G.Skill",
    "MSI",
    "Gigabyte",
    "Corsair",
    "Kingston",
    "Samsung",
    "Intel",
    "AMD",
    "Asus",
    "PNY",
    "Zotac",
    "Palit",
    "Gainward",
    "Montech",
    "Deepcool",
    "ADATA",
    "Crucial",
    "Lexar",
    "Patriot",
    "Transcend",
    "Inland",
    "SK Hynix",
  ];

  const lowerName = name.toLowerCase();

  const match = multiWordBrands
    .filter((brand) => lowerName.startsWith(brand.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0];

  return match ?? name.split(/\s+/)[0];
}

function makeRecord(row, category, filename) {
  if (!row || typeof row !== "object" || !row.name) {
    return null;
  }

  // Stable ID based on the category and original source record.
  const sourceId = createHash("sha256")
    .update(`${category}:${JSON.stringify(row)}`)
    .digest("hex");

  const ramCapacity =
    category === "ram" ? getRamCapacity(row) : null;

  return {
    source_id: sourceId,
    source_name: SOURCE_NAME,
    source_url: SOURCE_URL,
    category,

    brand: getBrand(row.name),
    model: row.name,

    // Do not infer a CPU socket when the source omits it.
    socket:
      typeof row.socket === "string" && row.socket.trim()
        ? row.socket.trim()
        : null,

    ram_type: getRamType(row, category),

    form_factor:
      typeof row.form_factor === "string"
        ? row.form_factor
        : null,

    tdp_w: numberOrNull(row.tdp ?? row.tdp_w),

    vram_gb:
      category === "gpu"
        ? numberOrNull(row.memory)
        : null,

    ram_capacity_gb: ramCapacity,

    storage_capacity_gb:
      category === "storage"
        ? numberOrNull(row.capacity)
        : null,

    specs: {
      ...row,
      dataset_file: filename,
      source_price_currency: "USD",
    },
  };
}

async function readDataset(filename) {
  const fullPath = path.join(DATA_DIR, filename);
  const contents = await readFile(fullPath, "utf8");
  const rows = JSON.parse(contents);

  if (!Array.isArray(rows)) {
    throw new Error(`${filename} must contain a JSON array.`);
  }

  return rows;
}

async function importCategory(filename, category) {
  console.log(`\nReading ${filename}...`);

  const rows = await readDataset(filename);

  // Remove duplicate source IDs within the same file before upserting.
  const uniqueRecords = [
    ...new Map(
      rows
        .map((row) => makeRecord(row, category, filename))
        .filter(Boolean)
        .map((record) => [
          `${record.source_name}:${record.source_id}`,
          record,
        ])
    ).values(),
  ];

  console.log(
    `${filename}: ${rows.length} source rows; ` +
      `${uniqueRecords.length} unique records`
  );

  for (
    let start = 0;
    start < uniqueRecords.length;
    start += BATCH_SIZE
  ) {
    const batch = uniqueRecords.slice(start, start + BATCH_SIZE);

    const { error } = await supabase
      .from("components")
      .upsert(batch, {
        onConflict: "source_name,source_id",
      });

    if (error) {
      throw new Error(
        `Failed importing ${filename}, batch starting at row ` +
          `${start + 1}: ${error.message}`
      );
    }

    console.log(
      `  Uploaded ${Math.min(start + batch.length, uniqueRecords.length)}` +
        ` / ${uniqueRecords.length}`
    );
  }

  return uniqueRecords.length;
}

async function main() {
  let totalProcessed = 0;

  for (const [filename, category] of FILES) {
    totalProcessed += await importCategory(filename, category);
  }

  console.log("\nImport completed.");
  console.log(`Unique records processed: ${totalProcessed}`);
}

main().catch((error) => {
  console.error("\nImport failed:");
  console.error(error.message);
  process.exitCode = 1;
});
