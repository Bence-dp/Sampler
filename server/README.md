# REST API for Audio Sampler Presets with MongoDB

This example shows a typical nodeJS / Express REST API with MongoDB integration.
The syntax uses JavaScript modules (i.e with import/export keywords).
It shows how to define where static files are located (html, css, javascript, images, assets etc.).
It shows how to define GET/POST/PUT/PATCH/DELETE web services for performing CRUD operations with MongoDB.
It shows how to use Mongoose for MongoDB schema and queries.
It shows how to upload files in multipart format using the multer module.
It shows how to create unit tests.

## Database

Presets metadata is stored in MongoDB Atlas (collection: `presets`, database: `samplerDB`).
Audio files (.wav, .mp3) remain on the server filesystem in `public/presets/`.

## Configuration

Create a `.env` file or set the `MONGODB_URI` environment variable:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/samplerDB
```

Default connection (if no env var): `mongodb+srv://bence:bence@clusterweb.pqmykue.mongodb.net/samplerDB?appName=ClusterWEB`

## Run

Install necessary packages:
```bash
npm i
```

Import existing presets from JSON files to MongoDB:
```bash
npm run import
```

Run the application in development mode:
```bash
npm run dev
```

Test routes: http://localhost:3000/api/presets

Run unit tests:
```bash
npm test
```

Try the simple html/javascript client: http://localhost:3000

## API Endpoints

- `GET /api/presets` - List all presets (supports filters: ?q=search&type=Drumkit&factory=true)
- `GET /api/presets/:name` - Get one preset by name or slug
- `POST /api/presets` - Create a new preset
- `PUT /api/presets/:name` - Replace a preset completely
- `PATCH /api/presets/:name` - Update a preset partially
- `DELETE /api/presets/:name` - Delete a preset
- `POST /api/upload/:folder` - Upload audio files and optionally create/update preset
- `POST /api/presets:seed` - Bulk import presets

## CI/CD

The ci.yml file is a github action example you could put at the root of your nodejs/express project in .github/workflows, that will automatize unit test checks at each git push or PR.
