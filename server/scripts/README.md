# Candidate Content Generation Scripts

This directory contains scripts for generating various types of content for political candidates in the database:

- **Commentaries/Roasts**: Humorous commentaries about candidates
- **Portraits/Caricatures**: AI-generated caricature images of candidates
- **Policies**: Policy statements and positions for candidates

## Requirements

To run these scripts, you need:

- Node.js (16+)
- TypeScript
- TSX (for running TypeScript files directly)
- Environment variables set up (specifically `XAI_API_KEY` for image generation)

## Available Scripts

### 1. Comprehensive Content Generator

The `generateCandidateContent.ts` script is a comprehensive tool that generates all types of content (commentaries, portraits, and policies) for all candidates in the database.

```bash
tsx server/scripts/generateCandidateContent.ts
```

### 2. Selective Content Generator

The `runGenerateCandidateContent.ts` script provides more control over what content to generate, with options to select specific content types and limit the number of candidates processed.

```bash
tsx server/scripts/runGenerateCandidateContent.ts [options]
```

#### Options:

- `--all`: Generate all content types (default if no specific type is selected)
- `--roasts`: Generate only commentaries/roasts
- `--portraits`: Generate only portraits/caricatures
- `--policies`: Generate only policy statements
- `--limit=N`: Process only N candidates (for testing)
- `--help`: Show the help message

#### Examples:

Generate all content types for all candidates:
```bash
tsx server/scripts/runGenerateCandidateContent.ts --all
```

Generate only roasts and portraits:
```bash
tsx server/scripts/runGenerateCandidateContent.ts --roasts --portraits
```

Generate policies for only 5 candidates (for testing):
```bash
tsx server/scripts/runGenerateCandidateContent.ts --limit=5 --policies
```

### 3. Individual Content Type Generators

You can also use the individual scripts for generating specific types of content:

- `generateCandidateCaricatures.ts`: Generates portrait caricatures
- `generateCandidatePolicies.ts`: Generates policy statements

## How It Works

These scripts use AI services to generate content:

1. **Perplexity API**: Used for gathering raw data about candidates
2. **xAI Service**: Used for generating creative content (images and text)

The scripts include rate limiting to avoid overwhelming the external APIs and error handling to ensure robust operation.

Content that is successfully generated is stored in the database and associated with the respective candidates.

## Best Practices

- For initial population, use the comprehensive generator
- For updating or refreshing specific content, use the selective generator
- When testing changes, use the `--limit` option to process fewer candidates
- Check the logs for any errors or issues during generation

## Troubleshooting

If you encounter issues:

1. Ensure all environment variables are set correctly
2. Check API rate limits for the services being used
3. Look for error messages in the console output
4. Try running with a small `--limit` value to isolate problems

## Development

When modifying these scripts, consider:

- Maintaining backward compatibility with the database schema
- Handling rate limits and API failures gracefully
- Adding appropriate logging for debugging
- Testing changes with a small subset of candidates before running on the full database 