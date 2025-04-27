import fs from "fs";
import path from "path";

// Updated interface to match the actual file structure
interface PostcodeMapping {
	stateCode: string;
	state: string; // Full state name mapped from stateCode
	postcode: string;
	locality: string; // Changed from suburb
	divisionName: string; // Changed from divisionId, as the name is directly in the file
}

// Structure based on the AEC Divisions API JSON (still needed for electorate page)
interface DivisionDetail {
	DivisionId: number;
	Name: string;
	State: string;
	Abbreviation: string;
	LocationDescription: string;
	Area: string;
	NameDerivation: string;
}

// Updated result structure - we get the name directly now
export interface ElectorateResult {
	postcode: string;
	divisionName: string;
	state: string;
}

// Cache the parsed data in memory
let postcodeMappingsCache: PostcodeMapping[] | null = null;
let divisionDetailsCache: DivisionDetail[] | null = null;

// State code mapping
const stateCodeMap: { [key: string]: string } = {
	A: "ACT",
	D: "NT",
	N: "NSW",
	V: "VIC",
	S: "SA",
	W: "WA",
	Q: "QLD",
	T: "TAS",
};

// --- Updated parsing function ---
function parsePostcodeData(textData: string): PostcodeMapping[] {
	const lines = textData.trim().split("\n");
	// Check if the first line is the header and skip it
	const header = "state;postcode;locality;division";
	const dataLines = lines[0].toLowerCase() === header ? lines.slice(1) : lines;

	const mappings: PostcodeMapping[] = dataLines
		.map((line) => {
			// Split by semicolon
			const columns = line.split(";");
			if (columns.length < 4) {
				console.warn(`Skipping malformed postcode line: ${line}`);
				return null;
			}
			const stateCode = columns[0]?.trim() || " ";
			const stateFullName = stateCodeMap[stateCode] || "Unknown"; // Map state code

			return {
				stateCode: stateCode,
				state: stateFullName,
				postcode: columns[1]?.trim() || " ",
				locality: columns[2]?.trim() || " ",
				divisionName: columns[3]?.trim() || " ",
			};
		})
		.filter((mapping): mapping is PostcodeMapping => mapping !== null);

	console.log(`Loaded ${mappings.length} postcode mappings from local file.`);
	return mappings;
}

function loadPostcodeMappings(): PostcodeMapping[] {
	if (postcodeMappingsCache) {
		return postcodeMappingsCache;
	}

	try {
		const filePath = path.join(process.cwd(), "data", "aec_postcodes.txt");
		console.log(`Reading postcode data from: ${filePath}`);
		const textData = fs.readFileSync(filePath, "utf-8");
		postcodeMappingsCache = parsePostcodeData(textData);
		return postcodeMappingsCache;
	} catch (error) {
		console.error("Error reading or parsing local AEC postcode data:", error);
		return [];
	}
}

// --- loadDivisionDetails remains the same (needed for electorate page) ---
function loadDivisionDetails(): DivisionDetail[] {
	if (divisionDetailsCache) {
		return divisionDetailsCache;
	}
	try {
		const filePath = path.join(process.cwd(), "data", "aec_divisions.json");
		console.log(`Reading division details from: ${filePath}`);
		const jsonData = fs.readFileSync(filePath, "utf-8");
		divisionDetailsCache = JSON.parse(jsonData) as DivisionDetail[];
		console.log(
			`Loaded ${divisionDetailsCache.length} division details from local file.`
		);
		return divisionDetailsCache;
	} catch (error) {
		console.error("Error reading or parsing local AEC division data:", error);
		return [];
	}
}

// --- Modified function to find division by postcode ---
// Now directly returns info from the postcode file
export function findDivisionByPostcode(
	postcode: string
): ElectorateResult | null {
	const mappings = loadPostcodeMappings();
	const match = mappings.find((m) => m.postcode === postcode);

	// Note: A postcode can appear multiple times if it spans divisions (e.g., 2611 in your sample).
	// This simple find will return the *first* match.
	// A more robust solution might return all matches or require suburb input.
	// For now, returning the first match found.
	if (match) {
		console.log(
			`Found match for postcode ${postcode}: Division ${match.divisionName} in ${match.state}`
		);
		return {
			postcode: postcode,
			divisionName: match.divisionName,
			state: match.state,
		};
	} else {
		console.log(`No division found for postcode ${postcode}`);
		return null;
	}
}

// --- getDivisionDetailsByName remains the same (needed for electorate page) ---
export function getDivisionDetailsByName(name: string): DivisionDetail | null {
	const divisions = loadDivisionDetails();
	const normalizedName = name.trim().toLowerCase();
	const division = divisions.find(
		(d) => d.Name.trim().toLowerCase() === normalizedName
	);

	if (!division) {
		console.log(`Division with name "${name}" not found.`);
		return null;
	}
	return division;
}

// Optional: Preload data on module load
// loadPostcodeMappings();
// loadDivisionDetails();
