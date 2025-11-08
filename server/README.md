# Example of a REST endpoints for handling CRUD for preset files for audio samplers

This example shows a typical nodeJS / Express endpoint. 
The syntax uses JavaScript modules (i.e with import/export keywords)
It shows how to define where static files are located (html, css, javascript, images, assets etc.)
It shows how to define GET/POST/PUT/PATCH/DELETE web services for performing CRUD operations
It shows how to use the path and filesystem modules for nodeJS
It shows how to upload files in multipart format using the multer module
It shows how to create unit tests

## Run

-  For installing necessary packages :
```bash
npm i
```
- Run the application, then test some routes i.e http://localhost:3000/api/presets :

```bash
npm run dev
```

- To run unit tests :
```bash
npm run tests
```

- For trying a simple html/javascript client : http://localhost:3000
-  The ci.yml file is a github action files example you could put at the root of your own nodejs/express project in .github/workflows, that will automatize unit test checks at each git push or PR (Pull Request). Maybe adapt the name of the node version you use to avoid warnings.
