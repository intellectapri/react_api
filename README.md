## Bonzabiketours server-side application with REST API

### Documentation

REST API documentation is available at https://bonzabiketours-api.herokuapp.com/api-docs/

### Testing and deployment

Application is deployed using Heroku.

Email testing is implemented using live SMTP (1gb.ru) and IMAP (Google Mail for business, G Suite) services, credentials can be found in `.env.heroku` configuration file.

Pipeline is available at https://dashboard.heroku.com/pipelines/dbe825e1-1b7e-4fab-9715-f91c8c1c7aeb.

### Conventions

#### Error reporting 

Whenever error needs to be returned, the response has to have following structure to ensure uniform error-handling across the stack:

```javascript
{
  status: 'failure',
  errorType?: 'SOME_ERROR_TYPE' // Should be later used for localization purposes
  errorMessage?: 'Some error message' // Human-readable message in English for developers
}
```
