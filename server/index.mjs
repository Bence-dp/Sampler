import { app } from "./src/app.mjs";
import { connectDB } from "./src/db.mjs";

const PORT = process.env.PORT || 3000;

await connectDB();

app.listen(PORT, () => console.log(` API Presets http://localhost:${PORT}`));